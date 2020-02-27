

import { Service } from 'typedi';
import { UseCase } from '../UseCase';
import { ClientError } from '../../errors/ClientError';

@Service()
export class CreateBoostWorkOrder implements UseCase {

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
    public async run(workOrderType: any ): Promise<any> {

        if (
            this.isEmpty(workOrderType.contentHash) ||
            this.isEmpty(workOrderType.target)
        ) {
            throw new ClientError(422, 'required fields: contentHash, target');
        }

        return {
            success: true,
            result: true
        }
    }
}
