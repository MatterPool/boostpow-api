import { UseCaseOutcome } from './UseCaseOutcome';

export abstract class UseCase {
   public abstract async run(params: any): Promise<UseCaseOutcome>;
}
