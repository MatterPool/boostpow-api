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

describe('UpdatePayoutAddress', () => {

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
        test('should update payout address', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);

            const email = 'a@b.com' + Math.random();
            const outcome: UseCaseOutcome = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(outcome.success).toEqual(true);

            const update = new UpdatePayoutAddress(accountService);
            const updateOutcome = await update.run({newPayoutAddress: '1LZ9dr6xQw7fxTHH2EaqjRRHaFk6XmwrHU', accountId: outcome.result.accountId});

            expect(updateOutcome.result).toBeDefined();
            expect(updateOutcome.result.payoutAddress).toEqual('1LZ9dr6xQw7fxTHH2EaqjRRHaFk6XmwrHU');

            done();
        });
    });

    describe('failure', () => {
        test('should not update invalid payout address', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);

            const email = 'a@b.com' + Math.random();
            const outcome: UseCaseOutcome = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(outcome.success).toEqual(true);

            const update = new UpdatePayoutAddress(accountService);

            let error;
            try {
                await update.run({newPayoutAddress: 'badaddress', accountId: outcome.result.accountId});
            } catch (err) {
                error = err;
            }
            expect(error).toEqual(new Error('INVALID_PAYOUT_ADDRESS'));

            done();
        });
    });

});
