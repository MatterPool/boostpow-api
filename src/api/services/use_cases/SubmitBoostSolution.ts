

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { GetBoostJob } from './GetBoostJob';
import * as boost from '@matterpool/boostpow-js';
import * as bsv from 'bsv';
import { GetUnredeemedBoostJobUtxos } from './GetUnredeemedBoostJobUtxos';
import { BoostBlockchainMonitor } from '../../../api/models/boost-blockchain-monitor';
import { BoostJob } from '../../../api/models/BoostJob';
import * as Minercraft from 'minercraft';


@Service()
export class SubmitBoostSolution implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository,
        @Service() private getBoostJob: GetBoostJob,
        @Service() private getUnredeemedBoostJobUtxos: GetUnredeemedBoostJobUtxos,
    ) {
    }

    public isEmpty(v: any): boolean {
        if (v === undefined || v === null || v === '' || v === 0) {
            return true;
        }
        return false;
    }

    public async saveSpentInfo(
        boostJobEntity: any,
        boostJobProof: any,
        time: number,
        boostJobTxId: bsv.Transaction,
        spentTx: bsv.Transaction) {
        const boostJob = boost.BoostPowJob.fromRawTransaction(boostJobEntity.rawtx);
        const powValidation = boost.BoostPowJob.tryValidateJobProof(boostJob, boostJobProof);
        // Now make sure it is saved to the db
        if (!boostJobEntity.spentrawtx) {
            boostJobEntity.spentrawtx = spentTx.toString();
            boostJobEntity.spenttxid = spentTx.hash;
            boostJobEntity.spentvout = 0;
            boostJobEntity.boosthash = powValidation.boostPowString.hash();
            boostJobEntity.powstring = powValidation.boostPowString.toString();
            boostJobEntity.powmetadata = powValidation.boostPowMetadata.getCoinbaseString(),
            boostJobEntity.time = time;
            await this.boostJobRepo.save(boostJobEntity);
        }
        return await this.getBoostJob.run({txid: boostJobTxId});
    }

    public async markJobAsSpentBefore(boostJobEntity: BoostJob) {
        boostJobEntity.job_was_spent_before_error = 1;
        console.log('markJobAsSpentBefore', boostJobEntity.txid, boostJobEntity.vout);
        await this.boostJobRepo.save(boostJobEntity);
    }

    public async runWithRawTx(params: { rawtx: string }) {
        const boostJobProof = boost.BoostPowJob.fromRawTransaction(params.rawtx);
        console.log('boostJobProof', boostJobProof);
        return true;
    }

    private static getKeyPairWithIndex(index?: number): { pubKey: any, privKey: any} {
        if (index === undefined || index === null)  {
            const privKey = bsv.PrivateKey(process.env.MINER_PRIV_KEY);
            const pubKey = privKey.toPublicKey();
            return {
                privKey: privKey,
                pubKey: pubKey,
            }
        }
        const hdPrivateKey = new bsv.HDPrivateKey(process.env.MINER_XPRV_KEY);
        const derivePath = `m/44'/0'/0'/0/${index}`;  // non-hardened
        const childPrivateKey = hdPrivateKey.deriveChild(derivePath);
        return {
            privKey: childPrivateKey.privateKey,
            pubKey: childPrivateKey.publicKey,
        }
    }
    private async ensureTransactionBroadcasted(rawtx: string) {
        for (let i = 0; i < 3; i++) {
            try {
                const miner = new Minercraft.default({
                url: 'https://public.txq-app.com',
                headers: {
                    'content-type': 'application/json',
                    'checkStatus': true, // Set check status to force checking tx instead of blindly broadcasting if it's not needed
                },
                });
                const response = await miner.tx.push(rawtx, {
                verbose: true,
                maxContentLength: 52428890,
                maxBodyLength: 52428890
                });

                if (response && response.payload && response.payload.returnResult === 'success') {
                    return true;
                } else if (response && response.payload) {
                    return true;
                } else {
                    return false;
                }
            } catch (err) {
                console.log('ensureTransactionBroadcasted Solution', err);
                throw err;
            }
        }
        return false;
    }

    public async run(params: {
        txid: string,
        vout: number,
        nonce: number,
        extraNonce1: number,
        extraNonce2: string,
        time: number,
        index?: number}): Promise<any> {
        console.log('SubmitBoostSolutionUpdated', params);
        if (
            !params.txid ||
            !params.extraNonce2
        ) {
            throw new ClientError(422, 'required fields: txid, vout, nonce, extraNonce1, extraNonce2, time');
        }
        console.log('this.getBoostJob.run({txid: params.txid});', params.txid, params.vout);
        const jobStatus = await this.getBoostJob.run({txid: params.txid, vout: params.vout});
        console.log('this.getBoostJob.run({txid: params.txid}); returns', jobStatus);
        if (!jobStatus) {
            throw new ClientError(404, 'not found fix this');
        }
        console.log('boostJobEntity finding...');
        const boostJobEntity = await this.boostJobRepo.findOne({
            txid: params.txid,
            vout: params.vout,
        });
        // Get the boost job

        const boostJob = boost.BoostPowJob.fromRawTransaction(boostJobEntity.rawtx, params.vout);

        const keyPair = SubmitBoostSolution.getKeyPairWithIndex(params.index || undefined);
        const privKey = keyPair.privKey;
        const pubKey = keyPair.pubKey;
        console.log('boostJobEntity got key....');
        // Mess with the endianness to get it right.
        const time = Buffer.allocUnsafe(4);
        time.writeUInt32BE(params.time, 0);
        const nonce = Buffer.allocUnsafe(4);
        nonce.writeUInt32BE(params.nonce, 0);
        const extraNonce1 = Buffer.allocUnsafe(4);
        extraNonce1.writeUInt32LE(params.extraNonce1, 0);
        const boostJobProof = boost.BoostPowJobProof.fromObject({
            signature: '00', // gets replaced below after
            minerPubKey: pubKey.toString(),
            extraNonce1: extraNonce1.toString('hex'),
            extraNonce2: params.extraNonce2,
            time: time.toString('hex'),
            nonce: nonce.toString('hex'),
            minerPubKeyHash: pubKey._getID().toString('hex'),
        });
        console.log('About to validate...', boostJob, boostJobProof);
        const validation = boost.BoostPowJob.tryValidateJobProof(boostJob, boostJobProof);

        if (!validation || !validation.boostPowString || !validation.boostPowMetadata) {
            throw new ClientError(422, 'invalid boost solution');
        }
        console.log('About to create redeem...', validation);
        const tx = boost.BoostPowJob.createRedeemTransaction(boostJob, boostJobProof, privKey.toString(), process.env.MINER_RECEIVE_ADDRESS);
        console.log('Redeem tx created', tx.hash, tx.toString());

        try {
            const sentStatus = await this.ensureTransactionBroadcasted(tx.toString());
            console.log('Sent status', tx.hash, sentStatus);
            if (!sentStatus) {
                await this.markJobAsSpentBefore(boostJobEntity);
                return;
            }
        } catch (e) {
            await this.markJobAsSpentBefore(boostJobEntity);
            throw e;
        }

        const savedResult = await this.saveSpentInfo(boostJobEntity, boostJobProof, params.time, params.txid, tx);

        this.getUnredeemedBoostJobUtxos.run().then(async (txoOutputs) => {
            const monitor = await BoostBlockchainMonitor.instance();
            monitor.updateFilters(txoOutputs);
        }).catch((err) => {
            console.log(err);
        });
        return savedResult;
    }
}
