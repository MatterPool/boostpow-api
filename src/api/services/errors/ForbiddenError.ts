import { ClientError } from './ClientError';

export class ForbiddenError extends ClientError{
    constructor(code: number = 403, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'FORBIDDEN');
        }
    }
}
