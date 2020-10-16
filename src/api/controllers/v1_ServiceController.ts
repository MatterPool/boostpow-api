import {
    JsonController, Post, BodyParam, Get, Param
} from 'routing-controllers';

import { GetRandomBoostFeeQuote } from '../services/use_cases/GetRandomBoostFeeQuote';
import { GetRandomBoostJobStatus } from '../services/use_cases/GetRandomBoostJobStatus';
import { SubmitRandomBoostJob } from '../services/use_cases/SubmitRandomBoostJob';
import { SubmitRandomBoostJobPayment } from '../services/use_cases/SubmitRandomBoostJobPayment';

@JsonController()
export class RandomController {
    constructor(
        private submitRandomBoostJob: SubmitRandomBoostJob,
        private submitRandomBoostJobPayment: SubmitRandomBoostJobPayment,
        private getRandomBoostJobStatus: GetRandomBoostJobStatus,
        private getRandomBoostJobFeeQuote: GetRandomBoostFeeQuote,
    ) {
        //
    }
    /**
     * Submit a payment transaction to generate the Boost Job
     * @param rawtx Raw transaction that pays p2pkh, which in-turn use to generate Boost Jobs
     */
    @Post('/v1/main/service/pay')
    public async submitRandomBoostJobPaymentPost(
        @BodyParam('rawtx') rawtx: string,
        @BodyParam('content') content: string,
        @BodyParam('category') category: string,
        @BodyParam('tag') tag: string,
        @BodyParam('diff') diff: number,
        @BodyParam('numOutputs') numOutputs: number,
    ) {
        return this.submitRandomBoostJobPayment.run({
            content,
            category,
            tag,
            rawtx,
            diff,
            numOutputs
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }

    /**
     * Save a valid paid for boost job transaction
     * @param rawtx Raw transaction that is paying for a Boost Job
     */
    @Post('/v1/main/service/jobs')
    public async submitRandomBoostJobPost(
        @BodyParam('rawtx') rawtx: string,
    ) {
        return this.submitRandomBoostJob.run({
            rawtx
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
    /**
     * Get random job status
     *
     * @param txid Transaction id of the random boost job
     */
    @Get('/v1/main/service/jobs/:txid')
    public async getRandomJobStatus(
        @Param('txid') txid: string
    ) {
        return this.getRandomBoostJobStatus.run({
            txid: txid
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }

    /**
     * Get boost job status
     *
     * @param txid Transaction id of the boost job
     */
    @Get('/v1/main/service/feeQuote')
    public async getRandomJobFeeQuote() {
        return this.getRandomBoostJobFeeQuote.run().then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
}
