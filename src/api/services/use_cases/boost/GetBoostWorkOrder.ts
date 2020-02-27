import { Service } from 'typedi';
import { UseCase } from '../UseCase';

@Service()
export class GetBoostWorkOrder implements UseCase {

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
    public async run(params: { uid: string } ): Promise<any> {

        return {
            success: true,
            result:  true
        };
    }
}
