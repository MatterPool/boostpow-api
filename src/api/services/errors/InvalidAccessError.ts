import { ClientError } from './ClientError';

export class InvalidAccessError extends ClientError{
    constructor(code: number = 403, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'ACCESS_FORBIDDEN');
        }
    }
}
