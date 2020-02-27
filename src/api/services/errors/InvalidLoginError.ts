import { ClientError } from './ClientError';

export class InvalidLoginError extends ClientError{
    constructor(code: number = 422, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'INVALID_LOGIN');
        }
    }
}
