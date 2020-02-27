import { Action } from 'routing-controllers';
import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { UserAccountMappingService } from '../api/services/UserAccountMappingService';

export function authorizationChecker(connection: Connection): (action: Action, roles: any[]) => Promise<boolean> | boolean {
    const userAccountMappingService = Container.get<UserAccountMappingService>(UserAccountMappingService);

    return async function innerAuthorizationChecker(action: Action, roles: string[]): Promise<boolean> {
        console.log('AUTHORIZATION_CHECKER', action.request.user);
        if (action.request.user && action.request.user !== '' && action.request.user !== {}) {
            action.request.account = await userAccountMappingService.findDefaultByUserId(action.request.user.id);
            console.log('AUTHORIZATION_CHECKER account', action.request.account);
            return true;
        }
        return false;
    };
}
