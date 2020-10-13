

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { ClientError } from '../errors/ClientError';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';

@Service()
export class GetBoostJob implements UseCase {

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
    public async run(params: {txid: string, vout?: number}): Promise<any> {
        if (
            this.isEmpty(params.txid)
        ) {
            throw new ClientError(422, 'required fields: txid');
        }
        console.log('getBoostJob run', params);
        const boostJobEntity = await this.boostJobRepo.findOne({
            txid: params.txid,
            vout: params.vout ? params.vout : 0,
        });
       // let rawtx;
       // console.log('getBoostJob run entity', boostJobEntity);
       /* if (!boostJobEntity) {
            // Then try to look it up on the blockchain
            try {
                const r = await matter.instance().getTxRaw(params.txid);
                console.log('Fetched rawtx r', r);
                rawtx = r.raw;
            } catch (err) {
                console.log('getBoostJob error', err);
                throw err;
            }
        } else {
            rawtx = boostJobEntity.rawtx;
        }*/
        // console.log('About to submitBoostJob', rawtx);
        return boostJobEntity; // this.submitBoostJob.run({rawtx: rawtx});
    }
}
