import { HttpError } from 'routing-controllers';

export class ServiceError extends HttpError {
    constructor(code: number = 500, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'Service error');
        }
    }
}
