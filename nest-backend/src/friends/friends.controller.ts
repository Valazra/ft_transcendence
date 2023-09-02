import { Body, Controller, Get, HttpStatus, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';


@Controller('friends')
export class FriendsController {
    constructor(private friendsService: FriendsService,
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('sendFriendRequest')
    async sendFriendRequest(@Body('receiverId') receiverId: number, @Req() req, @Res() res) {
        const user=req.user;
        const receiver = await this.usersRepository.findOne({where: {id: receiverId}});
        const response = await this.friendsService.sendFriendRequest(user, receiver);
        return res.status(HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getMyRequestsSent')
    async getMyRequestsSent(@Req() req, @Res() res) {
        const user = req.user;
        const response = await this.friendsService.getMyRequestsSent(user);
        return res.status(HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getMyRequestsReceived')
    async getMyRequestsReceived(@Req() req) {
        const user = req.user;
        const response = await this.friendsService.getMyRequestsReceived(user);
        return response;
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('myFriends')
    async getMyFriends(@Req() req, @Res() res) {
        const user=req.user;
        const response = await this.friendsService.getMyFriends(user);
        return res.status(HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('isMyFriend')
    async isMyFriend(@Query('receiverId') receiverId: number, @Req() req, @Res() res) {
      const user = req.user;
      const response = await this.friendsService.isMyFriend(user, receiverId);
      return res.status(response.success ? HttpStatus.OK : HttpStatus.NOT_FOUND).json(response);
    }
}
