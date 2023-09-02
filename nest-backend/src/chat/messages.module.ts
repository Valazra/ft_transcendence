import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Channel } from 'src/users/entities/channel.entity';
import { ChanUser } from 'src/users/entities/chan-user.entity';
import { FriendsModule } from '../friends/friends.module';
import { GameModule } from '../game/game.module';
import { ChanMp } from 'src/users/entities/chan-mp.entity';
import { UserBlock } from 'src/users/entities/user-block.entity';
import { GameRequest } from 'src/users/entities/game-request.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Channel]),
    TypeOrmModule.forFeature([ChanUser]),
    TypeOrmModule.forFeature([ChanMp]),
    TypeOrmModule.forFeature([GameRequest]),
    FriendsModule,
    TypeOrmModule.forFeature([UserBlock]),
    GameModule,

  ],
  providers: [MessagesGateway, MessagesService]
})
export class MessagesModule {}
