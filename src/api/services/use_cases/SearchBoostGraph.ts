

import { Service } from 'typedi';
import { UseCase } from './UseCase';
import { BoostJobRepository } from '../../repositories/BoostJobRepository';
import { OrmRepository } from 'typeorm-typedi-extensions';
import { GraphSearchQuery } from '../../models/graph-search-query';
import { BoostJobStatus } from '../../models/boost-job-status';

@Service()
export class SearchBoostGraph implements UseCase {

    constructor(
        @OrmRepository() private boostJobRepo: BoostJobRepository
    ) {
    }
    public reverseEnd(hex): any {
        return Buffer.from(hex, 'hex').reverse().toString('hex');
    }
    public isEmpty(v: any): boolean {
        if (v === undefined || v === null || v === '' || v === 0) {
            return true;
        }
        return false;
    }

    public async run(params: GraphSearchQuery): Promise<any> {
        const limit = params.limit ? params.limit : 10000;
        // const isBigEndian = params.be; todo fix this
        if (params.unmined && params.unmined === 'true') {
            params.unmined = true;
        }
        let query = this.boostJobRepo.createQueryBuilder("boost_job"); // first argument is an alias. Alias is what you are selecting - photos. You must specify it.
        let unminedQuery =  this.boostJobRepo.createQueryBuilder("boost_job");
        const sqlParams = {};
        let fieldsSpecified = 0;
        // Started mined boost
        query = query.where("boost_job.time is not null");
        const searchFieldsMap = [
            [ 'contenthex', 'content'],
            [ 'contentutf8', 'contentutf8'],
            [ 'categoryhex', 'category'],
            [ 'categoryutf8', 'categoryutf8'],
            [ 'taghex', 'tag'],
            [ 'tagutf8', 'tagutf8'],
            [ 'additionaldatahex', 'additionaldata'],
            [ 'additionaldatautf8', 'additionaldatautf8'],
            [ 'usernoncehex', 'usernonce'],
        ];
        function isArrayStr(s) {
            if (/\[.+\]$/.test(s)) {
                return true;
            }
            if (/\[,+\,.+\]$/.test(s)) {
                return true;
            }

            return false;
        }

        function parseArrayStr(s: string) {
            try {
                const parsed = JSON.parse(s);
                return parsed; // hopefuly itt an array
            } catch (ex) {
                return s.split(',');
            }
        }

        for (const field of searchFieldsMap) {
            if (!params[field[0]]) {
                continue;
            }
            if (isArrayStr(params[field[0]])) {
                const fieldArr = parseArrayStr(params[field[0]]);
                const subParms = {
                };
                subParms[`${field[1]}`] = fieldArr;
                const sqlStr = `boost_job.${field[1]} IN (:...${field[1]})`;
                query = query.andWhere(sqlStr, subParms);
                unminedQuery = unminedQuery.andWhere(sqlStr, subParms);
                sqlParams[field[1]] = fieldArr;
            } else {
                const sqlStr = `boost_job.${field[1]} = :${field[1]}`;
                const subParms = {
                };
                subParms[`${field[1]}`] = params[field[0]]
                query = query.andWhere(sqlStr, subParms);
                unminedQuery = unminedQuery.andWhere(sqlStr, subParms);
                sqlParams[field[1]] = params[field[0]]
            }
            fieldsSpecified++;
        }

        if (params.txid) {
            query = query.andWhere("boost_job.txid = :txid", { txid: params.txid });
            unminedQuery = unminedQuery.andWhere("boost_job.txid = :txid", { txid: params.txid });
            fieldsSpecified++;
        }
        if (params.spentTxid) {
            query = query.andWhere("boost_job.spenttxid = :spenttxid", { spenttxid: params.spentTxid });
            unminedQuery = unminedQuery.andWhere("boost_job.spenttxid = :spenttxid", { spenttxid: params.spentTxid });
            fieldsSpecified++;
        }
        if (params.boostHash) {
            query = query.andWhere("boost_job.boosthash = :boosthash", { boosthash: params.boostHash });
            unminedQuery = unminedQuery.andWhere("boost_job.boosthash = :boosthash", { boosthash: params.boostHash });
            fieldsSpecified++;
        }

        if (params.boostPowString) {
            query = query.andWhere("boost_job.powstring = :powstring", { powstring: params.boostPowString});
            unminedQuery = unminedQuery.andWhere("boost_job.powstring = :powstring", { powstring: params.boostPowString});
            fieldsSpecified++;
        }

        if (params.boostJobId) {
            query = query.andWhere("boost_job.txid = :txid", { txid: params.boostJobId.split('.')[0] });
            query = query.andWhere("boost_job.vout = :vout", { vout: params.boostJobId.split('.')[1] });

            unminedQuery = unminedQuery.andWhere("boost_job.txid = :txid", { txid: params.boostJobId.split('.')[0] });
            unminedQuery = unminedQuery.andWhere("boost_job.vout = :vout", { vout: params.boostJobId.split('.')[1] });
            fieldsSpecified++;
        }

        if (params.boostJobProofId) {
            query = query.andWhere("boost_job.spenttxid = :spenttxid", { spenttxid: params.boostJobProofId.split('.')[0] });
            query = query.andWhere("boost_job.spentvout = :spentvout", { spentvout: params.boostJobProofId.split('.')[1] });

            unminedQuery = unminedQuery.andWhere("boost_job.txid = :txid", { txid: params.boostJobProofId.split('.')[0] });
            unminedQuery = unminedQuery.andWhere("boost_job.vout = :vout", { vout: params.boostJobProofId.split('.')[1] });
            fieldsSpecified++;
        }

        if (params.createdTimeFrom) {
            query = query.andWhere("boost_job.inserted_at >= :createdTimeFrom", { createdTimeFrom: params.createdTimeFrom});
            unminedQuery = unminedQuery.andWhere("boost_job.inserted_at >= :createdTimeFrom", { createdTimeFrom: params.createdTimeFrom});
            fieldsSpecified++;
        }

        if (params.createdTimeEnd) {
            query = query.andWhere("boost_job.inserted_at <= :createdTimeEnd", { createdTimeEnd: params.createdTimeEnd});
            unminedQuery = unminedQuery.andWhere("boost_job.inserted_at <= :createdTimeEnd", { createdTimeEnd: params.createdTimeEnd});
            fieldsSpecified++;
        }

        // Queries for mined boost only
        if (params.minedTimeFrom) {
            query = query.andWhere("boost_job.time >= :minedTimeFrom", { minedTimeFrom: params.minedTimeFrom});
            unminedQuery = unminedQuery.andWhere("boost_job.time >= :minedTimeFrom", { minedTimeFrom: params.minedTimeFrom});
            sqlParams['minedTimeFrom'] = params.minedTimeFrom;
            fieldsSpecified++;
        }

        if (params.minedTimeEnd) {
            query = query.andWhere("boost_job.time <= :minedTimeEnd", { minedTimeEnd: params.minedTimeEnd});
            unminedQuery = unminedQuery.andWhere("boost_job.time <= :minedTimeEnd", { minedTimeEnd: params.minedTimeEnd});
            sqlParams['minedTimeEnd'] = params.minedTimeEnd;
            fieldsSpecified++;
        }

        if (!fieldsSpecified) {
            // Default and limit data
            const maxAllowedTime = (Math.round((new Date()).getTime() / 1000)) - (60 * 60 * 24 * 30);
            query = query.andWhere("boost_job.time >= :oldestAllowed", { oldestAllowed: maxAllowedTime});
            params.minedTimeFrom = maxAllowedTime;
        }

        let boostJobsMined = undefined;
        if (params.unmined !== 'only') {
            boostJobsMined = [];
            const records = await query.orderBy("boost_job.time", "DESC")
                .setParameters(sqlParams)
                .take(limit) // do smart grouping in future and time series queries efficently
                .getMany();
            for (const item of records) {
                if (!item.powstring || !item.powmetadata) {
                    continue;
                }
                boostJobsMined.push(BoostJobStatus.validateAndSerialize(item, params.expanded, params.debug));
            }
        }
        unminedQuery = unminedQuery.andWhere("boost_job.time is null");
        let unminedJobs = undefined;
        if ((params.unmined === 'true' || params.unmined === 1 || params.unmined === '1' || params.unmined === true) || params.unmined === 'only') {
            unminedJobs = [];
            const recordsUnmined = await unminedQuery.orderBy("boost_job.inserted_at", "DESC")
                .take(limit)
                .setParameters(sqlParams)
                .getMany();
            for (const item of recordsUnmined) {
                unminedJobs.push(BoostJobStatus.validateAndSerializeUnmined(item, item.vout));
            }
        }
        return {
            q: Object.assign({}, params, { limit: limit, unmined: params.unmined}),
            nextPaginationToken: null,
            unmined: unminedJobs,
            mined: boostJobsMined,
        };
    }
}
