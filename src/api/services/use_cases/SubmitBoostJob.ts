

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import * as boost from 'boostpow-js';
import * as matter from 'mattercloudjs';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJob } from '../../models/BoostJob';
import * as bsv from 'bsv';
import { BoostJobStatus } from '../../models/boost-job-status';
import { BoostBlockchainMonitor } from '../../models/boost-blockchain-monitor';
import { GetUnredeemedBoostJobUtxos } from './GetUnredeemedBoostJobUtxos';

const matterInstance = matter.instance({
    api_key:  process.env.MATTERCLOUD_API_KEY
});

@Service()
export class SubmitBoostJob implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository,
        @Service() private getUnredeemedBoostJobUtxos: GetUnredeemedBoostJobUtxos,
    ) {
    }

    public isEmpty(v: any): boolean {
        if (v === undefined || v === null || v === '' || v === 0) {
            return true;
        }
        return false;
    }
    public async saveSpentInfo(boostJobEntity: any, boostJobProof: any, time: number, spentTx: bsv.Transaction) {
        const boostJob = boost.BoostPowJob.fromRawTransaction(boostJobEntity.rawtx);
        const powValidation = boost.BoostPowJob.tryValidateJobProof(boostJob, boostJobProof);
        // Now make sure it is saved to the db
        if (!boostJobEntity.spentrawtx || !boostJobEntity.boosthash || !boostJobEntity.powstring || !boostJobEntity.powmetadata) {
            boostJobEntity.spentrawtx = spentTx.toString();
            boostJobEntity.spenttxid = spentTx.hash;
            boostJobEntity.spentvout = 0;
            boostJobEntity.boosthash = powValidation.boostPowString.hash();
            boostJobEntity.powstring = powValidation.boostPowString.toString();
            boostJobEntity.powmetadata = powValidation.boostPowMetadata.getCoinbaseString(),
            boostJobEntity.time = time;
            await this.boostJobRepo.save(boostJobEntity);
        }
    }
    public async run(params: {rawtx: string}): Promise<any> {
        console.log('SubmitBoostJobRun', params);
        if (
            this.isEmpty(params.rawtx)
        ) {
            throw new ClientError(422, 'required fields: rawtx');
        }
        const boostJob = boost.BoostPowJob.fromRawTransaction(params.rawtx);
        console.log('SubmitBoostJobRun', boostJob);
        let boostJobEntity = await this.boostJobRepo.findOne({
            txid: boostJob.getTxid(),
            vout: boostJob.getVout(),
        });
        if (!boostJobEntity) {

            const newBoostJob = new BoostJob();
            newBoostJob.inserted_at = Math.round((new Date().getTime()) / 1000);
            newBoostJob.txid = boostJob.getTxid();
            newBoostJob.vout = boostJob.getVout();
            newBoostJob.scripthash = boostJob.getScriptHash();
            newBoostJob.rawtx = params.rawtx;
            newBoostJob.value = boostJob.getValue();
            newBoostJob.diff = boostJob.getDiff();
            newBoostJob.content = boostJob.getContentHex();
            newBoostJob.contentutf8 = boostJob.getContentString();
            newBoostJob.category = boostJob.getCategoryHex();
            newBoostJob.categoryutf8 = boostJob.getCategoryString();
            newBoostJob.tag = boostJob.getTagHex();
            newBoostJob.tagutf8 = boostJob.getTagString();
            newBoostJob.additionaldata = boostJob.getAdditionalDataHex();
            newBoostJob.additionaldatautf8 = boostJob.getAdditionalDataString();
            newBoostJob.usernonce = boostJob.getUserNonceHex();
            try {
                console.log('Saving...', newBoostJob);
                boostJobEntity = await this.boostJobRepo.save(newBoostJob);
                console.log('Saved.', newBoostJob);
            } catch (ex) {
                boostJobEntity = await this.boostJobRepo.findOne({
                    txid: boostJob.getTxid(),
                    vout: boostJob.getVout(),
                });
                // If it still does not exist, then throw
                if (!boostJobEntity) {
                    throw new Error(ex);
                }
            }
        }
        if (!boostJobEntity.powstring || !boostJobEntity.powmetadata || !boostJobEntity.boosthash) {
            console.log('Checking pow...', boostJobEntity);
            // Check to see if the script hash is spent
            const history = await matterInstance.getScriptHashHistory(boostJobEntity.scripthash, {});
            for (const item of history.results) {
                console.log('Checking item...', item);
                const txraw = await matterInstance.getTxRaw(item.txid);
                let boostProof;
                try {
                    boostProof = boost.BoostPowJobProof.fromRawTransaction(txraw);
                } catch (ex) {
                    // Not a valid output
                    console.log('Error loading from transaction', ex, txraw);
                    continue;
                }
                if (boostProof && boostProof.getSpentTxid() === boostJobEntity.txid && boostProof.getSpentVout() === boostJobEntity.vout) {
                    const validation = boost.BoostPowJob.tryValidateJobProof(boostJob, boostProof);
                    if (!validation || !validation.boostPowString) {
                        console.log('Unable to validate...', validation);
                        continue;
                    }
                    console.log('Saving spent info', boostJobEntity, boostProof);
                    await this.saveSpentInfo(boostJobEntity, boostProof, validation.boostPowString.time(), txraw);
                    break;
                }
            }
        }
        console.log('Updating filter');
        // New entity saved, update the filter for the blockchain scanner
        this.getUnredeemedBoostJobUtxos.run().then(async (txoOutputs) => {
            const monitor = await BoostBlockchainMonitor.instance();
            monitor.updateFilters(txoOutputs);
        }).catch((err) => {
            console.log(err);
        });
        return {
            success: true,
            result: BoostJobStatus.validateAndSerialize(boostJobEntity, true)
        };
    }
}
