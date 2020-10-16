import {
    JsonController, Post, BodyParam, Get, Param, QueryParam
} from 'routing-controllers';

import { SubmitBoostJob } from '../services/use_cases/SubmitBoostJob';
import { GetBoostJob } from '../services/use_cases/GetBoostJob';
import { SubmitBoostSolution } from '../services/use_cases/SubmitBoostSolution';
import { FindBoostResource } from '../services/use_cases/FindBoostResource';
import { SearchBoostGraph } from '../services/use_cases/SearchBoostGraph';
import { GetUnredeemedBoostJobList } from '../services/use_cases/GetUnredeemedBoostJobList';

@JsonController()
export class BoostController {
    constructor(
        private submitBoostJob: SubmitBoostJob,
        private submitBoostSolution: SubmitBoostSolution,
        private getBoostJobStatus: GetBoostJob,
        private getBoostJobUnredeemedList: GetUnredeemedBoostJobList,
        private findBoostResource: FindBoostResource,
        private searchBoost: SearchBoostGraph
    ) {
        //
    }
    /**
     * Save a valid paid for boost job transaction
     * @param rawtx Raw transaction that is paying for a Boost Job
     */
    @Post('/v1/main/boost/jobs')
    public async submitBoostJobPost(
        @BodyParam('rawtx') rawtx: string,
    ) {
        return this.submitBoostJob.run({
            rawtx
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
    /**
     * Submit a solution.
     *
     * If you are a block producer, mining pool, or hasher, then this method is for you.
     *
     * Once your hashing system found a successful Boost, it can call back here to submit the solution to the blockchain
     *
     * How awesome is that?
     *
     * Complete with us.
     *
     * @param nonce Miner nonce found
     * @param extraNonce1 extraNonce1 stratum nonce found
     * @param extraNonce2 extraNonce2 stratum nonce found
     * @param txid Transaction id of the unspent boost output that the solution is for
     * @param vout Transaction output vout of the unspent boost output that the solution is for
     * @param time Timestamp used for the solution.
     */
    @Post('/v1/main/boost/submitsolution')
    public async submitSolutionPost(
        @BodyParam('nonce') nonce: number,
        @BodyParam('extraNonce1') extraNonce1: number,
        @BodyParam('extraNonce2') extraNonce2: string,
        @BodyParam('txid') txid: string,
        @BodyParam('vout') vout: number,
        @BodyParam('time') time: number,
        @QueryParam('index') index?: number,
    ) {
        return this.submitBoostSolution.run({
            nonce,
            extraNonce1,
            extraNonce2,
            txid,
            vout,
            time,
            index
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }

    /**
     * You might have constructed a transaction that forms the completed solution.
     *
     * If so, then you can submit the proof
     * @param rawtx
     */
    @Post('/v1/main/boost/jobs/:txid/proof')
    public async submitJobProofPost(
        @BodyParam('rawtx') rawtx: string,
    ) {
        return this.submitBoostJob.run({
            rawtx
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
    /**
     * Get unredeemed Boost Jobs
     *
     */
    @Get('/v1/main/boost/jobs')
    public async getUnredeemedJobs(
        @QueryParam('limit') limit = 2000
    ) {
        return this.getBoostJobUnredeemedList.run({
            limit: limit
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
     * @param vout Transaction vout of the boost job
     */
    @Get('/v1/main/boost/jobs/:txid')
    public async getJobStatus(
        @Param('txid') txid: string,
        @QueryParam('vout') vout: number
    ) {
        return this.getBoostJobStatus.run({
            txid: txid,
            vout: vout
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
    /**
     * Search by many fields
     */
    @Get('/v1/main/boost/search')
    public async getRequestSearch(
        @QueryParam('contentutf8') contentutf8?: string,
        @QueryParam('content') content?: string,
        @QueryParam('contenthex') contenthex?: string,
        @QueryParam('taghex') taghex?: string,
        @QueryParam('tagutf8') tagutf8?: string,
        @QueryParam('tag') tag?: string,
        @QueryParam('categoryutf8') categoryutf8?: string,
        @QueryParam('category') category?: string,
        @QueryParam('categoryhex') categoryhex?: string,
        @QueryParam('usernoncehex') usernoncehex?: string,
        @QueryParam('additionaldata') additionaldata?: string,
        @QueryParam('additionaldatautf8') additionaldatautf8?: string,
        @QueryParam('additionaldatahex') additionaldatahex?: string,
        @QueryParam('createdTimeFrom') createdTimeFrom?: number,
        @QueryParam('createdTimeEnd') createdTimeEnd?: number,
        @QueryParam('minedTimeFrom') minedTimeFrom?: number,
        @QueryParam('minedTimeEnd') minedTimeEnd?: number,
        @QueryParam('unmined') unmined?: string,
        @QueryParam('txid') txid?: string,
        @QueryParam('spentTxid') spentTxid?: string,
        @QueryParam('boostPowString') boostPowString?: string,
        @QueryParam('boostHash') boostHash?: string,
        @QueryParam('boostJobId') boostJobId?: string,
        @QueryParam('boostJobProofId') boostJobProofId?: string,
        @QueryParam('limit') limit: number = 10000,
        @QueryParam('be') bigEndian: boolean = true,
        @QueryParam('debug') debug: boolean = true,
        @QueryParam('expanded') expanded: boolean = true,
    ) {
        return this.searchBoost.run({
            contentutf8: contentutf8 || content,
            contenthex: contenthex,
            taghex: taghex,
            tagutf8: tagutf8 || tag,
            categoryutf8: categoryutf8 || category,
            categoryhex: categoryhex,
            usernoncehex: usernoncehex,
            additionaldatautf8: additionaldatautf8 || additionaldata,
            additionaldatahex: additionaldatahex,
            createdTimeFrom: createdTimeFrom,
            createdTimeEnd: createdTimeEnd,
            minedTimeFrom: minedTimeFrom,
            minedTimeEnd: minedTimeEnd,
            txid: txid,
            spentTxid: spentTxid,
            boostHash: boostHash,
            boostPowString: boostPowString,
            boostJobId: boostJobId,
            boostJobProofId: boostJobProofId,
            be: !!bigEndian,
            limit: limit,
            unmined: unmined,
            debug: debug,
            expanded: expanded
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
    /**
     * Any candidate identifier for the boost
     *
     * @param id boosthash, txid, powstring, etc
     */
    @Get('/v1/main/boost/id/:id')
    public async getJobStatusHash(
        @Param('id') id: string,

    ) {
        return this.findBoostResource.run({
            id: id,
        }).then((outcome) => {
            return outcome;
        }).catch((e) => {
            throw e;
        });
    }
}
