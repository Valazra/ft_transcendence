import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Channel } from "./channel.entity";

@Entity()
export class ChanUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    chanId: number;

    @Column({default: true})
    isInChan: boolean;

    @Column({default: false})
    isAdmin: boolean;

    @Column({default: false})
    isMuted: boolean;

    @Column({nullable: true})
    muteTime: Date;

    @Column({default: false})
    isBanned: boolean;

    @Column({nullable: true})
    banTime: Date;

    @ManyToOne(() => User, (user) => user.Channels)
    user: User;

    @ManyToOne(() => Channel, (channel) => channel.chan_user)
    chan: Channel;
}