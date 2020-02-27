import { ClientError } from './ClientError';

export class InvalidPayoutAddress extends ClientError{
    constructor(code: number = 422, msg?: string) {
        if (msg) {
            super(code, msg);
        } else {
            super(code, 'INVALID_PAYOUT_ADDRESS');
        }
    }
}
