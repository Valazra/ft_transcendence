import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ChanMp {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true})
    name: string;

    @Column()
    userId: number;

    @Column()
    userTargetId: number;

    @Column({default: true})
    userIsInChan: boolean;

    @Column({default: false})
    userTargetIsInChan: boolean;

    @Column("simple-array", {default: ""})
    messages: string[];
}