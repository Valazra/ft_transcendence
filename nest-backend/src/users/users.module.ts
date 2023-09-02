import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtStrategy } from './../auth/jwt.strategy';
import { FriendRequest } from './entities/friend-request.entity';
import { Channel } from './entities/channel.entity';
import { ChanUser } from './entities/chan-user.entity';
import { UserBlock } from './entities/user-block.entity';
import { JwtOneStrategy } from 'src/auth/jwtOne.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    TypeOrmModule.forFeature([Channel]), 
    TypeOrmModule.forFeature([ChanUser]),
    TypeOrmModule.forFeature([FriendRequest]),
    TypeOrmModule.forFeature([UserBlock]), 
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, JwtOneStrategy],
  exports: [UsersService]
})
export class UsersModule {}