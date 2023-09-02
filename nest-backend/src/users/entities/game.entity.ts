import { AfterLoad, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Game {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstPlayerId: number;

    @Column()
    secondPlayerId: number;

    @ManyToOne(() => User)
    firstPlayer: User;

    @ManyToOne(() => User)
    secondPlayer: User;

    @Column({ default: 0 })
    firstPlayerScore: number;

    @Column({ default: 0 })
    secondPlayerScore: number;

    @Column({ nullable: true })
    winner: number;
    

}