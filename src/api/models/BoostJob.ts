import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class BoostJob {

    @PrimaryColumn('varchar')
    public txid: string;

    @Column({ name: 'vout' })
    public vout: number;

    @Column({ name: 'scripthash' })
    public scripthash: string;

    @Column({ name: 'boosthash' })
    public boosthash: string;

    @Column({ name: 'rawtx' })
    public rawtx: string;

    @Column({ name: 'diff' })
    public diff: number;

    @Column({ name: 'value' })
    public value: number;

    @Column({ name: 'spenttxid' })
    public spenttxid: string;

    @Column({ name: 'spentvout' })
    public spentvout: number;

    @Column({ name: 'spentscripthash' })
    public spentscripthash: string;

    @Column({ name: 'spentrawtx' })
    public spentrawtx: string;

    @Column({ name: 'powstring' })
    public powstring: string;

    @Column({ name: 'powmetadata' })
    public powmetadata: string;

    @Column({ name: 'content' })
    public content: string;

    @Column({ name: 'contentutf8' })
    public contentutf8: string;

    @Column({ name: 'category' })
    public category: string;

    @Column({ name: 'categoryutf8' })
    public categoryutf8: string;

    @Column({ name: 'tag' })
    public tag: string;

    @Column({ name: 'tagutf8' })
    public tagutf8: string;

    @Column({ name: 'additionaldata' })
    public additionaldata: string;

    @Column({ name: 'additionaldatautf8' })
    public additionaldatautf8: string;

    @Column({ name: 'usernonce' })
    public usernonce: string;

    @Column({ name: 'time' })
    public time: number;

    @Column({ name: 'inserted_at' })
    public inserted_at: number;

}
