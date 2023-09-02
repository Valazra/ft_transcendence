import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ChanUser } from "./chan-user.entity";

@Entity()
export class Channel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    ownerId: number;

    @Column({default: false})
    isPrivate: boolean;

    @Column({default: false})
    isPassword: boolean;

    @Column({nullable: true})
    password: string;

    @Column("simple-array", {default: ""})
    messages: string[];

    @OneToMany(() => ChanUser, (chanUser) => chanUser.user)
    chan_user: ChanUser[];
}