import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { Game } from 'src/users/entities/game.entity';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService,
    private readonly usersService: UsersService,
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Get('getMyRequestsSent')
  async getMyRequestsSent(@Req() req) {
    const user = req.user;
    const response = await this.gameService.getMyRequestsSent(user);
    return response;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('getMyRequestsReceived')
  async getMyRequestsReceived(@Req() req) {
    const user = req.user;
    const response = await this.gameService.getMyRequestsReceived(user);
    return response;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':userId/stats')
  async getUserGameStats(@Param('userId') userId: number): Promise<any> {
    const user = await this.usersService.getUser(userId);
    await this.gameService.updateWinLossCounters(user.user);
    return ({ winCount: user.user.winCount, lossCount: user.user.lossCount });
  }
  @UseGuards(AuthGuard('jwt'))
  @Get(':userId/game-history')
  async getUserGameHistory(@Param('userId') userId: number): Promise<Game[]> {
    return this.gameService.getUserGameHistory(userId);
  }
}
