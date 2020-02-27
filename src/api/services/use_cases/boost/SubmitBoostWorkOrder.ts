

import { Service } from 'typedi';
import { UseCase } from '../UseCase';
import { ClientError } from '../../errors/ClientError';

@Service()
export class SubmitBoostWorkOrder implements UseCase {

    constructor(
    ) {
        //
    }

    public isEmpty(v: any): boolean {
        if (v === undefined || v === null || v === '' || v === 0) {
            return true;
        }
        return false;
    }
    public async run(params: {boostId: string, rawtx: string}): Promise<any> {

        if (
            this.isEmpty(params.boostId) ||
            this.isEmpty(params.rawtx)
        ) {
            throw new ClientError(422, 'required fields: boostId, rawtx');
        }

        return {
            success: true,
            result: {
                uid: params.boostId,
                txid: 'd077f17da69a69e8f7d5a087e4be557c18bcde9fa094b5b38bf805deddaeb9c6'
            }
        };
    }
}
