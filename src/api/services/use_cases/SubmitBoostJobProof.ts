

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { GetUnredeemedBoostJobUtxos } from './GetUnredeemedBoostJobUtxos';
import { BoostBlockchainMonitor } from '../../../api/models/boost-blockchain-monitor';
import * as boost from 'boostpow-js';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJobRepository } from '../../../api/repositories/BoostJobRepository';
import * as bsv from 'bsv';

/**
 * Service differs from SubmitBoostSolution in that this is used when you found the tx on the blockchain (ie: didnt mine it ourselves)
 */
@Service()
export class SubmitBoostJobProof implements UseCase {
    constructor(
        @Service() private getUnredeemedBoostJobUtxos: GetUnredeemedBoostJobUtxos,
        @OrmRepository() private boostJobRepo: BoostJobRepository,
    ) {
    }

    public async saveSpentInfo(boostJobEntity: any, boostJobProof: any, spentTx: bsv.Transaction) {
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
            boostJobEntity.time = boostJobProof.getTime();
            await this.boostJobRepo.save(boostJobEntity);
        }
    }

    public async run(params: {rawtx: string}): Promise<any> {
        console.log('SubmitBoostJobProof', params);
        const boostJobProof = boost.BoostPowJobProof.fromRawTransaction(params.rawtx);

        if (!boostJobProof) {
            console.log('BoostJobProof could not be created', params.rawtx);
            return;
        }
        console.log('SubmitBoostJob', boostJobProof);

        const tx = new bsv.Transaction(params.rawtx);

        let matchingJob = null;
        for (const input of tx.inputs){
            matchingJob = await this.boostJobRepo.findOne({
                txid: input.prevTxId.toString('hex'),
                vout: input.outputIndex,
            });
        }

        if (!matchingJob) {
            console.log('Not found matching job', params.rawtx);
            return;
        }
        console.log('Saving BoostJobProof', matchingJob, boostJobProof);
        await this.saveSpentInfo(matchingJob, boostJobProof, params.rawtx);
        console.log('Saved BoostJobProof', matchingJob, boostJobProof);
        this.getUnredeemedBoostJobUtxos.run().then(async (txoOutputs) => {
            const monitor = await BoostBlockchainMonitor.instance();
            monitor.updateFilters(txoOutputs);
        }).catch((err) => {
            console.log(err);
        });
    }
}
