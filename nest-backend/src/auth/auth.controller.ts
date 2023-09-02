import { Controller, Get, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  @Get('42')
  @UseGuards(AuthGuard('42'))
  async auth42() {
  }

  @Get('42/callback')
  @UseGuards(AuthGuard('42'))
  async auth42Callback(@Req() req, @Res() res) {
    const user = req.user;
    const userAndToken = await this.authService.createAuthUser(user);
    const cookieOptions = {
      httpOnly: true, 
      maxAge: this.configService.get<number>('JWT_EXPIRESIN') * 1000,
    };
    res.cookie('jwt', userAndToken.token, cookieOptions);
    const userInDb = await this.usersRepository.findOne({where: {email: user.email}})
    if (userInDb.doubleAuth === true) {
      res.redirect(302, 'http://localhost/twofa')
    }
    else {
      res.redirect(302, 'http://localhost/');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Req() req, @Res() res) {
    const user = req.user;
    const response = await this.authService.logOut(user.id);
    return res.status(response.success && HttpStatus.OK).json(response);
  }
}
