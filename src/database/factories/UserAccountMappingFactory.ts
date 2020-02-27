import * as Faker from 'faker';
import { define } from 'typeorm-seeding';
import * as uuid from 'uuid';
import { Account } from '../../api/models/Account';

define(Account, (faker: typeof Faker) => {
    const account = new Account();
    account.id = uuid.v1();
    account.projectId = uuid.v1();
    account.apiKey = uuid.v1();
    return account;
});
