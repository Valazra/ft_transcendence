import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

export type GameRequestStatus = 'pending' | 'accepted' | 'denied' | 'finish';

@Entity()
export class GameRequest {
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
    status: GameRequestStatus;
}

