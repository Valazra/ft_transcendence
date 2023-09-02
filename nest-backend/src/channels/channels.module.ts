import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { Channel } from 'src/users/entities/channel.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { ChanUser } from 'src/users/entities/chan-user.entity';
import { ChanMp } from 'src/users/entities/chan-mp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    TypeOrmModule.forFeature([Channel]), 
    TypeOrmModule.forFeature([ChanUser]), 
    TypeOrmModule.forFeature([ChanMp]),
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, JwtStrategy]
})
export class ChannelsModule {}
