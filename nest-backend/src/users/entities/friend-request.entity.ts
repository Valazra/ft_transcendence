import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export type FriendRequestStatus = 'pending' | 'accepted' | 'denied';

@Entity()
export class FriendRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    creatorId: number;

    @Column()
    receiverId: number;

    @ManyToOne(() => User, (user) => user.RequestCreated)
    creator: User;

    @ManyToOne(() => User, (user) => user.RequestReceived)
    receiver: User;

    @Column()
    status: FriendRequestStatus;
}