import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { closeDatabase, createDatabaseConnection, migrateDatabase } from '../../../utils/database';
import { configureLogger } from '../../../utils/logger';
import { UserService } from '../../../../src/api/services/UserService';
import { AccountService } from '../../../../src/api/services/AccountService';
import { UserAccountMappingService } from '../../../../src/api/services/UserAccountMappingService';
import { CreateUser } from '../../../../src/api/services/use_cases/auth/CreateUser';

describe('CreateUser', () => {

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
        test('should register new user account', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);
            const email = 'a@b.com' + Math.random();
            const outcome: any = await createUser.run({ email: email, password: 'password', generateTestId: true} );
            expect(outcome.result).toBeDefined();
            expect(outcome.result.accountId).toBeDefined();
            expect(outcome.result.userId).toBeDefined();
            expect(outcome.result.email).toBeDefined();
            expect(outcome.result.apiKey).toBeDefined();
            done();
        });
    });

});
