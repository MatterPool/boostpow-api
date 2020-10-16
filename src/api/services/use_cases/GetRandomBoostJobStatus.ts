

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import * as bsv from 'bsv';

@Service()
export class GetRandomBoostJobStatus implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository
    ) {
    }

    public isEmpty(v: any): boolean {
        if (v === undefined || v === null || v === '' || v === 0) {
            return true;
        }
        return false;
    }

    public async run(params: {txid: string }): Promise<any> {
        if (
            this.isEmpty(params.txid)
        ) {
            throw new ClientError(422, 'required fields: txid');
        }
        const boostJobs = await this.boostJobRepo.find({
            txid: params.txid
        });

        if (!boostJobs.length) {
            throw new ClientError(404, 'job not found');
        }

        const getHash = function(h: string) {
            const buffer = Buffer.from(h, 'hex');
            return bsv.crypto.Hash.sha256(buffer).reverse().toString('hex');
        }
        const getDHash = function(h: string) {
            const buffer = Buffer.from(h, 'hex');
            return bsv.crypto.Hash.sha256(bsv.crypto.Hash.sha256(buffer)).reverse().toString('hex');
        }

        let status = 'COMPLETE';
        let totalBoostPowStrings = '';
        for (const job of boostJobs) {
            if (!job.spenttxid) {
                status = 'PENDING';
            }
            if (job.powstring) {
                totalBoostPowStrings += job.spenttxid;
                totalBoostPowStrings += job.powstring;
            }
            delete job.rawtx;
        }
        let hash = null;
        let dhash = null;
        if (boostJobs.length && status === 'COMPLETE') {
            hash = getHash(totalBoostPowStrings);
            dhash = getDHash(totalBoostPowStrings);
        }

        return {
            jobId: boostJobs[0].txid,
            status: status,
            // tslint:disable-next-line: max-line-length
            instructions: 'Concatenate all spenttxid and powstrings in the order sha256(spenttxid1 + powstring1 + spenttxid2 + powstring2 + ...) in sequence and perform sha256 to obtain ~ 256 bits of entropy. Do not trust the \'sha256\' field. It is there for debugging purposes only.',
            sha256: hash,
            hash256: dhash,
            boostJobs: boostJobs
        }
    }
}
