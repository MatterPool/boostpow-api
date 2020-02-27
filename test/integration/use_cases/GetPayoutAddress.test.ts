import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { closeDatabase, createDatabaseConnection, migrateDatabase } from '../../utils/database';
import { configureLogger } from '../../utils/logger';
import { UserService } from '../../../src/api/services/UserService';
import { AccountService } from '../../../src/api/services/AccountService';
import { UserAccountMappingService } from '../../../src/api/services/UserAccountMappingService';
import { CreateUser } from '../../../src/api/services/use_cases/auth/CreateUser';
import { UpdatePayoutAddress } from '../../../src/api/services/use_cases/UpdatePayoutAddress';
import { UseCaseOutcome } from '../../../src/api/services/use_cases/UseCaseOutcome';
import { GetPayoutAddress } from '../../../src/api/services/use_cases/GetPayoutAddress';

describe('GetPayoutAddress', () => {

    // -------------------------------------------------------------------------
    // Setup up
    // -------------------------------------------------------------------------
    let connection: Connection;
    let userService = undefined;
    let accountService = undefined;
    let userAccountMappingService = undefined;
    beforeAll(async () => {
        configureLogger();
        connection = await createDatabaseConnection();
    });
    beforeEach(() => {
        userService = Container.get<UserService>(UserService);
        accountService = Container.get<AccountService>(AccountService);
        userAccountMappingService = Container.get<UserAccountMappingService>(UserAccountMappingService);
        migrateDatabase(connection);
    });

    // -------------------------------------------------------------------------
    // Tear down
    // -------------------------------------------------------------------------

    afterAll(() => closeDatabase(connection));

    describe('success', () => {
        test('should update and get payout address twice', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);

            const email = 'a@b.com' + Math.random();
            const outcome: UseCaseOutcome = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(outcome.success).toEqual(true);

            // Get empty payout address
            const getPayoutAddress = new GetPayoutAddress(accountService);
            const getPayoutAddressOutcome = await getPayoutAddress.run({accountId: outcome.result.accountId});
            expect(getPayoutAddressOutcome.result.payoutAddress).toEqual(null);

            // Update address
            const update = new UpdatePayoutAddress(accountService);
            const updateOutcome = await update.run({newPayoutAddress: '1LZ9dr6xQw7fxTHH2EaqjRRHaFk6XmwrHU', accountId: outcome.result.accountId});
            expect(updateOutcome.result.payoutAddress).toEqual('1LZ9dr6xQw7fxTHH2EaqjRRHaFk6XmwrHU');

            // Get Payout
            const getPayoutAddress2 = new GetPayoutAddress(accountService);
            const getPayoutAddressOutcome2 = await getPayoutAddress2.run({accountId: outcome.result.accountId});
            expect(getPayoutAddressOutcome2.result.payoutAddress).toEqual('1LZ9dr6xQw7fxTHH2EaqjRRHaFk6XmwrHU');

            // Update address
            const update2 = new UpdatePayoutAddress(accountService);
            const updateOutcome2 = await update2.run({newPayoutAddress: '1EZyzCN3J23B7dkxWEAbysJEZLnhLAjUY7', accountId: outcome.result.accountId});
            expect(updateOutcome2.result.payoutAddress).toEqual('1EZyzCN3J23B7dkxWEAbysJEZLnhLAjUY7');

            // Get Payout
            const getPayoutAddress3 = new GetPayoutAddress(accountService);
            const getPayoutAddressOutcome3 = await getPayoutAddress3.run({accountId: outcome.result.accountId});
            expect(getPayoutAddressOutcome3.result.payoutAddress).toEqual('1EZyzCN3J23B7dkxWEAbysJEZLnhLAjUY7');

            done();
        });
    });

});
