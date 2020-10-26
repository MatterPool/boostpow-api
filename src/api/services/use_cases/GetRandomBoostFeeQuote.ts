

import { Service } from 'typedi';
import { UseCase } from './UseCase';

import * as bsv from 'bsv';
import { BitcoinUtils } from '../../../helpers/bitcoin-utils';

@Service()
export class GetRandomBoostFeeQuote implements UseCase {

    constructor(
    ) {
        //
    }
    public getServiceAddress(): bsv.Address {
        return BitcoinUtils.getPaymentAddress(0, process.env.RANDOM_NUMBER_SERVICE_XPRV_KEY);
    }
    public async run(): Promise<any> {
        return {
            website: 'https://boostpow.com',
            legalDisclaimer: 'Use at own risk. Funds will be locked permanently into a Bitcoin Boost POW smart contract. MatterPool Inc. makes no warranty or guarantee of fitness for any use. Experimental alpha software. No change is returned that is sent to this smart contract, it is irreversbly locked up in a POW puzzle.',

            baseFeePerOutput: 700,
            feePerDifficultyPerOutput: 100,

            serviceAddress: this.getServiceAddress().toString(),
            serviceDescription: 'Entropy as a service. Client can request level of entropy comparable to bitcoin economy (difficulty target). Client can get provably unknown random numbers (~ 256 bits) by specifying a distribution of numOutputs > 1.',
            // tslint:disable-next-line: max-line-length
            instructions: 'Create a p2pkh payment transaction to the serviceAddress for the desired level of security in outputs and difficulty. Send the transaction payment to /api/v1/main/service/pay',
            exampleRequestBody: {
                content: 'alice329422',
                diff: 1,
                numOutputs: 1,
                rawtx: '010000000107f3664fd5da563fd5716fe641bc6924c171c3558b35151aaf45156054c43c27010000006a473044022070d8b9e47eb49e513d762bc5e48469d71057fa9e22fa431f0e82811a3ed217ee02206264415c18f6d8cd36fd4d6e8068b1c3c93a2ed29e178d4581e470dad6092bd44121020d96910c0255fb8582d56ed9bb850f5a02a6739ee7f926dbacb39199a584777cffffffff0258120000000000001976a914b8d93f001b2fb35c1acd7cd6ac5b68acbc97a2ee88acc0580100000000001976a914756c43dfed84251e1186e38d65584a091dbd53e488ac00000000'
            }
        };
    }
}
