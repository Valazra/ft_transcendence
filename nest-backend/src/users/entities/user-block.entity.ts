import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UserBlock {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    userBlockedId: number;

    @Column()
    isBlocked: boolean;
}