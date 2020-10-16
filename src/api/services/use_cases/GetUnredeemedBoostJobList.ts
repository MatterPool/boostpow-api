import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { IsNull } from 'typeorm';
import * as boost from '@matterpool/boostpow-js';
import * as bsv from 'bsv';
import { BoostJob } from '../../../api/models/BoostJob';

@Service()
export class GetUnredeemedBoostJobList implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository,
    ) {
    }

    /**
     * Format the Boost Job into a form easily processed by a stratum mining pool.
     *
     * prevHash name is kept to preserve the significant of the field. It is the contenthash in boost
     * coinbaseValue is the value of the Boost Job Output.
     * nBits is encoded in the same form as bitcoind from getminingcandidate
     *
     * The additional fields are provided in hex and big endian (be) versions for visibility.
     *
     * @param job Boost Job to serialize into a form that a stratum mining pool can use
     */
    public static serializeBoostJob(job: BoostJob): any {
        const privKey = bsv.PrivateKey.fromWIF(process.env.MINER_PRIV_KEY);
        try {
            const boostJobObj = boost.BoostPowJob.fromRawTransaction(job.rawtx);
            return  {
                id: job.txid + '-' + job.vout,
                prevhash: boostJobObj.getContentHex(),
                coinbaseValue: boostJobObj.getValue(),
                version: boostJobObj.getCategoryNumber(),
                nBits: boostJobObj.bits().toString(16),
                time: Math.round((new Date()).getTime() / 1000),
                tag: boostJobObj.getTagBuffer().toString('hex'),
                tagBeStr: boostJobObj.getTagHex(),
                additionalData: boostJobObj.getAdditionalDataBuffer().toString('hex'),
                additionalDataBeStr: boostJobObj.getAdditionalDataHex(),
                userNonce: boostJobObj.getUserNonceBuffer().toString('hex'),
                userNonceBeStr: boostJobObj.getUserNonceHex(),
                minerPubKeyHash: privKey.toPublicKey()._getID().toString('hex'),
                minerPubKeyHashBeStr: privKey.toPublicKey()._getID().toString('hex'),
                boostJobTxid: boostJobObj.getTxid(),
                boostJobVout: boostJobObj.getVout(),
            };
        } catch (ex) {
            console.log('ex', ex);
        }
        return null;
    }
    public async run(params: { limit: number }): Promise<any> {
        // Get 2000 jobs max at a time
        let maxLimited = params.limit ? params.limit : 2000;
        if (maxLimited > 2000) {
            maxLimited = 2000;
        }
        const unredeemedJobs = await this.boostJobRepo.find({
            where: {
                spenttxid: IsNull(),
                spentvout: IsNull()
            },
            take: maxLimited,
            order: {
                diff: 'ASC',
            }
        });

        const resultList = [];
        for (const job of unredeemedJobs) {
            const formattedBoostJob = GetUnredeemedBoostJobList.serializeBoostJob(job);
            if (!formattedBoostJob) {
                continue;
            }
            resultList.push(formattedBoostJob);
        }
        return {
            success: true,
            result: resultList
        };
    }
}

