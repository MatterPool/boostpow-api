import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { closeDatabase, createDatabaseConnection, migrateDatabase } from '../../../utils/database';
import { configureLogger } from '../../../utils/logger';
import { UserService } from '../../../../src/api/services/UserService';
import { LoginUser } from '../../../../src/api/services/use_cases/auth/LoginUser';
import { UserAccountMappingService } from '../../../../src/api/services/UserAccountMappingService';
import { AccountService } from '../../../../src/api/services/AccountService';
import { CreateUser } from '../../../../src/api/services/use_cases/auth/CreateUser';

describe('LoginUser', () => {

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
        test('should login user account', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);
            const email = 'a@b.com' + Math.random();
            const record = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(record).toBeDefined();
            const loginUser = new LoginUser(userService, userAccountMappingService);
            const outcome = await loginUser.run({email, password: 'password'} );
            expect(outcome.result).toBeDefined();
            expect(outcome.result.accountId).toBeDefined();
            expect(outcome.result.userId).toBeDefined();
            expect(outcome.result.email).toBeDefined();
            done();
        });
    });

    describe('failure', () => {
        test('should not login user account with bad email', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);
            const email = 'a@b.com' + Math.random();
            const record: any = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(record).toBeDefined();
            const loginUser = new LoginUser(userService, userAccountMappingService);
            let error;
            try {
                await loginUser.run({email: 'bad@email.com', password: 'password'} );
            } catch (err) {
                error = err;
            }
            expect(error).toEqual(new Error('INVALID_LOGIN'));
            done();
        });

        test('should not login user account with bad password', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);
            const email = 'a@b.com' + Math.random();
            const record: any = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(record).toBeDefined();
            const loginUser = new LoginUser(userService, userAccountMappingService);
            let error;
            try {
                await loginUser.run({email, password: 'bad_password'} );
            } catch (err) {
                error = err;
            }
            expect(error).toEqual(new Error('INVALID_LOGIN'));
            done();
        });
    });

});
