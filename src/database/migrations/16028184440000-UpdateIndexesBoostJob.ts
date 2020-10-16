import { MigrationInterface, QueryRunner} from 'typeorm';

export class CreateBoostJobTable16028184440000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.dropPrimaryKey('boost_job');
        await queryRunner.createPrimaryKey("boost_job", ["txid", "vout"]);
        await queryRunner.query(`ALTER TABLE "boost_job" ADD COLUMN "spends_parenttxid" varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE "boost_job" ADD COLUMN "spends_parentvout" integer NULL`);
        await queryRunner.query(`ALTER TABLE "boost_job" ADD COLUMN "job_was_spent_before_error" integer NULL`);
    }
    public async down(queryRunner: QueryRunner): Promise<any> {
    }
}
