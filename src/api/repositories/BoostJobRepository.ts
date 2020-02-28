import { EntityRepository, Repository } from 'typeorm';
import { BoostJob } from '../models/BoostJob';

@EntityRepository(BoostJob)
export class BoostJobRepository extends Repository<BoostJob>  {
}
