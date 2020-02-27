import { ClientError } from './ClientError';

export class EmailExistsError extends ClientError{
    constructor(code: number = 422, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'EMAIL_EXISTS');
        }
    }
}
