import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { closeDatabase, createDatabaseConnection, migrateDatabase } from '../../utils/database';
import { configureLogger } from '../../utils/logger';
import { UserService } from '../../../src/api/services/UserService';
import { AccountService } from '../../../src/api/services/AccountService';
import { UserAccountMappingService } from '../../../src/api/services/UserAccountMappingService';
import { CreateUser } from '../../../src/api/services/use_cases/auth/CreateUser';
import { CreateWorkergroup } from '../../../src/api/services/use_cases/CreateWorkergroup';
import { WorkergroupService } from '../../../src/api/services/WorkergroupService';
import { UseCaseOutcome } from '../../../src/api/services/use_cases/UseCaseOutcome';

describe('CreateWorkergroup', () => {

    // -------------------------------------------------------------------------
    // Setup up
    // -------------------------------------------------------------------------
    let connection: Connection;
    let userService = undefined;
    let accountService = undefined;
    let userAccountMappingService = undefined;
    let workerGroupService = undefined;
    beforeAll(async () => {
        configureLogger();
        connection = await createDatabaseConnection();
    });
    beforeEach(() => {
        userService = Container.get<UserService>(UserService);
        accountService = Container.get<AccountService>(AccountService);
        userAccountMappingService = Container.get<UserAccountMappingService>(UserAccountMappingService);
        workerGroupService = Container.get<WorkergroupService>(WorkergroupService);
        migrateDatabase(connection);
    });

    // -------------------------------------------------------------------------
    // Tear down
    // -------------------------------------------------------------------------

    afterAll(() => closeDatabase(connection));

    describe('success', () => {
        test('should create new workergroup', async (done) => {
            const createUser = new CreateUser(userService, accountService, userAccountMappingService);

            const email = 'a@b.com' + Math.random();
            const outcome: UseCaseOutcome = await createUser.run({email, password: 'password', generateTestId: true} );
            expect(outcome.success).toEqual(true);

            const createWorkergroup = new CreateWorkergroup(workerGroupService);
            const createOutcome = await createWorkergroup.run({workerGroupName: 'workerGroupName1', accountId: outcome.result.accountId});

            expect(createOutcome.result).toBeDefined();
            expect(createOutcome.result.name).toEqual('workerGroupName1');
            done();
        });
    });

});
