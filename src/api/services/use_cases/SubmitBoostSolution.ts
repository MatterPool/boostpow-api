

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { GetBoostJob } from './GetBoostJob';
import * as boost from '@matterpool/boostpow-js';
import * as bsv from 'bsv';
import * as matter from 'mattercloudjs';
import { ServiceError } from '../errors/ServiceError';
import { GetUnredeemedBoostJobUtxos } from './GetUnredeemedBoostJobUtxos';
import { BoostBlockchainMonitor } from '../../../api/models/boost-blockchain-monitor';
import { BoostJob } from '../../../api/models/BoostJob';

const matterInstance = matter.instance({
    api_key:  process.env.MATTERCLOUD_API_KEY
});
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
        console.log('markJobAsSpentBefore', boostJobEntity);
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

    public async run(params: {
        txid: string,
        vout: number,
        nonce: number,
        extraNonce1: number,
        extraNonce2: string,
        time: number,
        index?: number}): Promise<any> {
        console.log('SubmitBoostSolutionUpdated', params);
        console.log('SubmitBoostSolutionUpdated2', params);
        if (
            !params.txid ||
            !params.extraNonce2
        ) {
            throw new ClientError(422, 'required fields: txid, vout, nonce, extraNonce1, extraNonce2, time');
        }
        console.log('this.getBoostJob.run({txid: params.txid});', params.txid);
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
        console.log('boostJobEntity', boostJobEntity);
        const boostJob = boost.BoostPowJob.fromRawTransaction(boostJobEntity.rawtx);

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
        console.log('About to validate...');
        const validation = boost.BoostPowJob.tryValidateJobProof(boostJob, boostJobProof);

        if (!validation || !validation.boostPowString || !validation.boostPowMetadata) {
            throw new ClientError(422, 'invalid boost solution');
        }
        console.log('About to create redeem...');
        const tx = boost.BoostPowJob.createRedeemTransaction(boostJob, boostJobProof, privKey.toString(), process.env.MINER_RECEIVE_ADDRESS);

        try {
            const savedResult = await this.saveSpentInfo(boostJobEntity, boostJobProof, params.time, params.txid, tx);
            const sentStatus = await matterInstance.sendRawTx(tx.toString());
            console.log('Sent status', sentStatus);
            if (!sentStatus.txid) {
                throw new ServiceError(500, 'unable to publish' + sentStatus);
            }
            this.getUnredeemedBoostJobUtxos.run().then(async (txoOutputs) => {
                const monitor = await BoostBlockchainMonitor.instance();
                monitor.updateFilters(txoOutputs);
            }).catch((err) => {
                console.log(err);
            });
            return savedResult;
        } catch (ex) {
            console.log('ex', ex, ex.stack);
            if (ex && ex.message && ex.message.message && (/txn\-already\-known/.test(ex.message.message)) || /Transaction already in the mempool/.test(ex.message.message) ) {
                return await this.saveSpentInfo(boostJobEntity, boostJobProof, params.time, params.txid, tx);
            }

            if (ex && ex.message && ex.message.message && (/txn\-mempool\-conflict/.test(ex.message.message)) || /txn\-mempool\-conflict/.test(ex.message.message) ) {
                console.log('Job has mempool spent conflict: ', params.txid);
                return await this.markJobAsSpentBefore(boostJobEntity);
            }

            if (ex && ex.message && ex.message.message && (/Missing inputs/.test(ex.message.message)) || /Missing inputs/.test(ex.message.message) ) {
                console.log('Job was already spent: ', params.txid);
                return await this.markJobAsSpentBefore(boostJobEntity);
            }
            throw ex;
        }
    }
}
