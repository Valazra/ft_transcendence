import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { FriendRequest } from './friend-request.entity';
import { GameRequest } from './game-request.entity';
import { Channel } from './channel.entity';
import { ChanUser } from './chan-user.entity';
import { Game } from './game.entity';


@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  idJwt: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  pseudo: string;

  @Column()
  isConnected: boolean;

  @Column({ nullable: true })
  socketId: string;

  @Column({ nullable: true })
  actualChan: string;

  @Column({ default: false })
  isInGame: boolean;

  @Column({ default: false })
  doubleAuth: boolean;

  @Column({ nullable: true })
  twoFactorAuthSecret: string;

  @Column({ nullable: true })
  twoFactorValidate: boolean;

  @Column({ nullable: true, default: 'src/users/avatars/default.jpg' })
  avatar: string;

  @OneToMany(() => FriendRequest, (friendRequest) => friendRequest.creator)
  RequestCreated: FriendRequest[];

  @OneToMany(() => FriendRequest, (friendRequest) => friendRequest.receiver)
  RequestReceived: FriendRequest[];

  @OneToMany(() => GameRequest, (gameRequest) => gameRequest.creator)
  GRequestCreated: GameRequest[];

  @OneToMany(() => GameRequest, (gameRequest) => gameRequest.receiver)
  GRequestReceived: GameRequest[];

  @Column({ default: 0 })
  winCount: number;
  
  @Column({ default: 0 })
  lossCount: number;

  @OneToMany(() => Game, (game) => game.firstPlayer)
  gamesAsFirstPlayer: Game[];

  @OneToMany(() => Game, (game) => game.secondPlayer)
  gamesAsSecondPlayer: Game[];

  @OneToMany(() => ChanUser, (chanUser) => chanUser.user)
  Channels: Channel[];
}