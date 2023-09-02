import { Module } from '@nestjs/common';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FriendRequest } from 'src/users/entities/friend-request.entity';
import { JwtStrategy } from 'src/auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    TypeOrmModule.forFeature([FriendRequest])
  ],
  controllers: [FriendsController],
  providers: [FriendsService, JwtStrategy],
  exports: [FriendsService]
})
export class FriendsModule {}
