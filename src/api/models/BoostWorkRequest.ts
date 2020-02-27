
import { Exclude } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { Column, Entity, PrimaryColumn, Generated } from 'typeorm';

@Entity()
export class BoostWorkOrder {

    @PrimaryColumn('uuid')
    public id: string;

    @IsNotEmpty()
    @Column()
    public email: string;

    @IsNotEmpty()
    @Column()
    @Exclude()
    public password: string;

    @IsNotEmpty()
    @Column({
        name: 'user_id',
        nullable: false,
    })
    @Exclude()
    @Generated()
    public userId: number;


    public toString(): string {
        return `${this.id} (${this.email})`;
    }


}
