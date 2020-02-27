import * as Faker from 'faker';
import { define } from 'typeorm-seeding';
import * as uuid from 'uuid';

import { User } from '../../api/models/User';

define(User, (faker: typeof Faker, settings: { role: string }) => {

    const email = faker.internet.email();
    const num = faker.random.number(100);

    const user = new User();
    user.id = uuid.v1();
    user.email = email;
    user.userId = num;
    user.password = '1234';
    return user;
});
