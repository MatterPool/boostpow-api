import { HttpError } from 'routing-controllers';

export class ClientError extends HttpError {
    constructor(code: number = 400, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'Client error');
        }
    }
}
