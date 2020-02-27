import { ClientError } from './ClientError';

export class WorkergroupNameExists extends ClientError{
    constructor(code: number = 422, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'WORKERGROUP_NAME_EXISTS');
        }
    }
}
