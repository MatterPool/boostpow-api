import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBoostJobTable1583012952090 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const table = new Table({
            name: 'boost_job',
            columns: [
                {
                    name: 'txid',
                    type: 'varchar',
                    length: '255',
                    isPrimary: true,
                    isNullable: false,
                },
                {
                    name: 'vout',
                    type: 'integer',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: false,
                },
                {
                    name: 'diff',
                    type: 'double',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: false,
                },
                {
                    name: 'value',
                    type: 'decimal',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: false,
                },
                {
                    name: 'boosthash',
                    type: 'varchar',
                    length: '160',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'scripthash',
                    type: 'varchar',
                    length: '255',
                    isPrimary: false,
                    isNullable: false,
                },
                {
                    name: 'rawtx',
                    type: 'varchar',
                    length: '60000',
                    isPrimary: false,
                    isNullable: false,
                    isUnique: false,
                },
                {
                    name: 'spenttxid',
                    type: 'varchar',
                    length: '100',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: true,
                },
                {
                    name: 'spentvout',
                    type: 'integer',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: true,
                },
                {
                    name: 'spentscripthash',
                    type: 'varchar',
                    length: '1000',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: true,
                },
                {
                    name: 'spentrawtx',
                    type: 'varchar',
                    length: '6000',
                    isPrimary: false,
                    isUnique: false,
                    isNullable: true,
                },
                {
                    name: 'powstring',
                    type: 'varchar',
                    length: '160',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'powmetadata',
                    type: 'varchar',
                    length: '1000',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'category',
                    type: 'varchar',
                    length: '8',
                    isPrimary: false,
                    isNullable: false,
                    isUnique: false,
                },
                {
                    name: 'categoryutf8',
                    type: 'varchar',
                    length: '8',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'tag',
                    type: 'varchar',
                    length: '40',
                    isPrimary: false,
                    isNullable: false,
                    isUnique: false,
                },
                {
                    name: 'tagutf8',
                    type: 'varchar',
                    length: '40',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'additionaldata',
                    type: 'varchar',
                    length: '500',
                    isPrimary: false,
                    isNullable: false,
                    isUnique: false,
                },
                {
                    name: 'additionaldatautf8',
                    type: 'varchar',
                    length: '500',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'usernonce',
                    type: 'varchar',
                    length: '500',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'content',
                    type: 'varchar',
                    length: '64',
                    isPrimary: false,
                    isNullable: false,
                    isUnique: false,
                },
                {
                    name: 'contentutf8',
                    type: 'varchar',
                    length: '64',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'time',
                    type: 'integer',
                    isPrimary: false,
                    isNullable: true,
                    isUnique: false,
                },
                {
                    name: 'inserted_at',
                    type: 'integer',
                    isPrimary: false,
                    isNullable: false,
                    isUnique: false,
                },
            ],
        });
        await queryRunner.createTable(table);

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_scripthash",
            columnNames: ["scripthash"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_value",
            columnNames: ["value"],
            isUnique: false
        }));
        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_diff",
            columnNames: ["diff"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_powstring",
            columnNames: ["powstring"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_spenttxid",
            columnNames: ["spenttxid"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_spentscripthash",
            columnNames: ["spentscripthash"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_content",
            columnNames: ["content"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_contentutf8",
            columnNames: ["contentutf8"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_category",
            columnNames: ["category"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_categoryutf8",
            columnNames: ["categoryutf8"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_tag",
            columnNames: ["tag"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_tagutf8",
            columnNames: ["tagutf8"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_time",
            columnNames: ["time"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_inserted_at",
            columnNames: ["inserted_at"],
            isUnique: false
        }));

        await queryRunner.createIndex(table, new TableIndex({
            name: "idx_boost_job_boosthash",
            columnNames: ["boosthash"],
            isUnique: false
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.dropTable('boost_job');
    }
}
