

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { BoostJobStatus } from '../../models/boost-job-status';

@Service()
export class FindBoostResource implements UseCase {

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
    public async tryBoostHash(id: string) {
        return await this.boostJobRepo.findOne({
            boosthash: id
        });
    }
    public async tryTxid(id: string) {
        const split = id.split('.');
        return await this.boostJobRepo.findOne({
            txid: split[0]
        });
    }
    public async trySpentTxid(id: string) {
        const split = id.split('.');
        return await this.boostJobRepo.findOne({
            spenttxid: split[0]
        });
    }
    public async tryBoostPowStringOrLonger(id: string) {

        return await this.boostJobRepo.findOne({
            powstring: id.slice(0, 160)
        });
    }

    public async run(params: {id: string}): Promise<any> {
        if (
            this.isEmpty(params.id)
        ) {
            throw new ClientError(422, 'required fields: identifier boosthash, txid, or boost signal strings');
        }

        let boostJobEntity = await this.tryBoostHash(params.id);

        if (!boostJobEntity) {
            boostJobEntity =  await this.tryTxid(params.id);
        }

        if (!boostJobEntity) {
            boostJobEntity =  await this.trySpentTxid(params.id);
        }

        if (!boostJobEntity) {
            boostJobEntity =  await this.tryBoostPowStringOrLonger(params.id);
        }

        if (!boostJobEntity) {
            throw new ClientError(404, 'NOT_FOUND');
        }
        return BoostJobStatus.validateAndSerialize(boostJobEntity, true)
    }
}
