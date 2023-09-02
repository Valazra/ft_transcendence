import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { GameRequest } from 'src/users/entities/game-request.entity';
import { Game } from 'src/users/entities/game.entity';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { UsersService } from 'src/users/users.service';
import { UserBlock } from 'src/users/entities/user-block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    TypeOrmModule.forFeature([Game]),
    TypeOrmModule.forFeature([GameRequest]),
    TypeOrmModule.forFeature([UserBlock])
  ],
  controllers: [GameController],
  providers: [GameService, JwtStrategy, UsersService],
  exports: [GameService]
})
export class GameModule {}
