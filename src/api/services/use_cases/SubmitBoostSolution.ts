

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { GetBoostJob } from './GetBoostJob';
import * as boost from 'boostpow-js';
import * as bsv from 'bsv';
import * as matter from 'mattercloudjs';
import { ServiceError } from '../errors/ServiceError';
import { GetUnredeemedBoostJobUtxos } from './GetUnredeemedBoostJobUtxos';
import { BoostBlockchainMonitor } from '../../../api/models/boost-blockchain-monitor';

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

    public async saveSpentInfo(boostJobEntity: any, boostJobProof: any, time: number, boostJobTxId: bsv.Transaction, spentTx: bsv.Transaction) {
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

    public async runWithRawTx(params: { rawtx: string }) {
        const boostJobProof = boost.BoostPowJob.fromRawTransaction(params.rawtx);
        console.log('boostJobProof', boostJobProof);
        return true;
    }

    public async run(params: {txid: string, vout: number, nonce: number, extraNonce1: number, extraNonce2: string, time: number}): Promise<any> {
        if (
            !params.txid ||
            !params.extraNonce2
        ) {
            throw new ClientError(422, 'required fields: txid, vout, nonce, extraNonce1, extraNonce2, time');
        }
        const jobStatus = await this.getBoostJob.run({txid: params.txid});
        if (!jobStatus) {
            throw new ClientError(404, 'not found fix this');
        }
        const boostJobEntity = await this.boostJobRepo.findOne({
            txid: params.txid,
            vout: params.vout,
        });
        // Get the boost job
        const boostJob = boost.BoostPowJob.fromRawTransaction(boostJobEntity.rawtx);
        const privKey = bsv.PrivateKey(process.env.MINER_PRIV_KEY);
        const pubKey = privKey.toPublicKey();
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
        const validation = boost.BoostPowJob.tryValidateJobProof(boostJob, boostJobProof);

        if (!validation || !validation.boostPowString || !validation.boostPowMetadata) {
            throw new ClientError(422, 'invalid boost solution');
        }
        const tx = boost.BoostPowJob.createRedeemTransaction(boostJob, boostJobProof, privKey.toString(), process.env.MINER_RECEIVE_ADDRESS);

        try {
            const savedResult = await this.saveSpentInfo(boostJobEntity, boostJobProof, params.time, params.txid, tx);
            const sentStatus = await matter.instance().sendRawTx(tx.toString());
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
            if (ex && ex.message && ex.message.message && (/txn\-already\-known/.test(ex.message.message)) || /Transaction already in the mempool/.test(ex.message.message) ) {
                return await this.saveSpentInfo(boostJobEntity, boostJobProof, params.time, params.txid, tx);
            }

            if (ex && ex.message && ex.message.message && (/Missing inputs/.test(ex.message.message)) || /Missing inputs/.test(ex.message.message) ) {
                return await this.saveSpentInfo(boostJobEntity, boostJobProof, params.time, params.txid, tx);
            }
            throw ex;
        }
    }
}
