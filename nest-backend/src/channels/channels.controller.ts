import { Body, Controller, Get, HttpStatus, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { AuthGuard } from '@nestjs/passport';
import { Channel } from 'src/users/entities/channel.entity';
import { ChanUser } from 'src/users/entities/chan-user.entity';
import * as bcrypt from 'bcrypt';
import { ChanMp } from 'src/users/entities/chan-mp.entity';


@Controller('channels')
export class ChannelsController {
    constructor(private channelsService: ChannelsService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post('createChan')
    async createChan(@Body('chanName') chanName: string, @Body('isPrivate') isPrivate: boolean, @Body('isPassword') isPassword: boolean,@Body('password') password: string, @Req() req, @Res() res) {
        const user = req.user;
        if (password !== "") {
            const hashPassword = await bcrypt.hash(password, 10);
            const response = await this.channelsService.createChan(user, chanName, isPrivate, isPassword, hashPassword);
            return res.status(response.success && HttpStatus.CREATED).json(response);
        }
        else {
            const response = await this.channelsService.createChan(user, chanName, isPrivate, isPassword, "");
            return res.status(response.success && HttpStatus.CREATED).json(response);
        }
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('createMpChan')
    async createMpChan(@Body('chanName') chanName: string, @Body('userTargetId') userTargetId: number, @Req() req, @Res() res) {
        const user = req.user;
        const response = await this.channelsService.createMpChan(user, userTargetId, chanName);
        return res.status(response.success && response.alreadyCreated ? HttpStatus.OK : HttpStatus.CREATED).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('addInChan')
    async addInChan(@Body('channel') chanName: string, @Req() req, @Res() res) {
        const user = req.user;
        const response = await this.channelsService.addInChan(user, chanName);
        return res.status(response.success && response.created ? HttpStatus.CREATED : HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('chanlist')
    async findAllChans(): Promise<Channel[]> {
        return this.channelsService.findAllChan();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('chanMplist')
    async findAllMpChans(): Promise<ChanMp[]> {
        return this.channelsService.findAllMpChan();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('chanuserlist')
    async findAllChansUser(): Promise<ChanUser[]> {
        return this.channelsService.findAllChanUser();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('publicChanlist')
    async findAllPublicChans(): Promise<Channel[]> {
        return this.channelsService.findAllPublicChan();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('privateChanlist')
    async findMyPrivateChans(@Req() req): Promise<Channel[]> {
        const user = req.user;
        return this.channelsService.findMyPrivateChans(user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('checkPassword')
    async checkPassword(@Query('chanName') chanName: string, @Query('password') password: string, @Res() res) {
        const response = await this.channelsService.checkPassword(chanName, password);
        return res.status(response.success && HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getOneChan')
    async getOneChan(@Query('chanName') chanName: string): Promise<Channel> {
        return this.channelsService.findOneChan(chanName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getOneChanUser')
    async getOneChanUser(@Query('chanId') chanId: number, @Query('userId') userId: number): Promise<ChanUser> {
        return this.channelsService.findOneChanUser(chanId, userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getActualChanUser')
    async getActualChanUser(@Query('userId') userId: number, @Res() res) {
        const response = await this.channelsService.findActualChanUser(userId);
        return res.status(response.success && HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getOneChanMp')
    async getOneChanMp(@Query('chanName') chanName: string, @Res() res) {
        const response = await this.channelsService.findOneChanMp(chanName);
        return res.status(response.success && HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('getActualChanMp')
    async getActualChanMp(@Query('userId') userId: number, @Res() res) {
        const response = await this.channelsService.findActualChanMp(userId);
        return res.status(response.success && HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('usersInChanMp')
    async usersInChanMp(@Query('actualChan') actualChan: string, @Res() res) {
        const response = await this.channelsService.usersInChanMp(actualChan);
        return res.status(response.success && HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('usersInChan')
    async usersInChan(@Query('actualChan') actualChan: string, @Res() res) {
        const response = await this.channelsService.usersInChan(actualChan);
        return res.status(response.success && HttpStatus.OK).json(response);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('changeIsInChan')
    async changeIsInChan(@Body('chaaan') chanName: string, @Req() req, @Res() res) {
        const user = req.user;
        const response = await this.channelsService.changeIsInChan(user, chanName);
        return res.status(response.success && HttpStatus.OK).json(response);
    }
}
