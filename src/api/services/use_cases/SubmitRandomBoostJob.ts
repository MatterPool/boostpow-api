

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import * as boost from '@matterpool/boostpow-js';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJob } from '../../models/BoostJob';
import { BoostJobStatus } from '../../models/boost-job-status';
import { BoostBlockchainMonitor } from '../../models/boost-blockchain-monitor';
import { GetUnredeemedBoostJobUtxos } from './GetUnredeemedBoostJobUtxos';
import * as bsv from 'bsv';
import { ServiceError } from '../errors/ServiceError';
import * as axios from 'axios';

@Service()
export class SubmitRandomBoostJob implements UseCase {

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
    private async ensureTransactionBroadcasted(rawtx: string) {
        try {
            const response = await axios.default.post(`${process.env.MAPI_ENDPOINT}/mapi/tx`, { rawtx }, { headers: {
                'content-type': 'application/json',
                'checkstatus': true, // Set check status to force checking tx instead of blindly broadcasting if it's not needed
            }});
            if (response && response.data && response.data.payload && response.data.payload.returnResult === 'success') {
                return true;
            } else if (response && response.data.payload) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.log('ensureTransactionBroadcasted', rawtx, err);
            throw err;
        }
    }
    public async run(params: {rawtx: string}): Promise<any> {
        console.log('SubmitRandomBoostJob', params);
        if (
            this.isEmpty(params.rawtx)
        ) {
            throw new ClientError(422, 'required fields: rawtx');
        }
        const boostJobs = boost.BoostPowJob.fromTransactionGetAllOutputs(new bsv.Transaction(params.rawtx));
        console.log('SubmitRandomBoostJobEntities', boostJobs);

        if (!boostJobs.length) {
            throw new ClientError(422, 'required at least one Boost POW output');
        }

        if (!await this.ensureTransactionBroadcasted(params.rawtx)) {
            throw new ServiceError(500, 'Failure broadcasting');
        }

        const boostJobEntities: BoostJob[] = [];
        for (const boostJob of boostJobs) {

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
            boostJobEntities.push(boostJobEntity);
        }
        // New entity saved, update the filter for the blockchain scanner
        this.getUnredeemedBoostJobUtxos.run().then(async (txoOutputs) => {
            const monitor = await BoostBlockchainMonitor.instance();
            monitor.updateFilters(txoOutputs);
        }).catch((err) => {
            console.log(err);
        });
        return {
            success: true,
            result: boostJobEntities.map((e) => { return BoostJobStatus.validateAndSerialize(e, true) })
        };
    }
}
