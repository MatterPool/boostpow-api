import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { IsNull } from 'typeorm';

@Service()
export class GetUnredeemedBoostJobUtxos implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository,
    ) {
    }

    public async run(): Promise<any> {
        const unredeemedJobs = await this.boostJobRepo.find({
            where: {
                spenttxid: IsNull(),
                spentvout: IsNull()
            }
        });
        const txoutpoints = [];
        for (const job of unredeemedJobs) {
            txoutpoints.push(`${job.txid}-${job.vout}`)
        }
        return txoutpoints;
    }
}
