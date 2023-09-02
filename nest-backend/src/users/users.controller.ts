import { Body, Controller, Get, Param, Patch, Res, Req, UseGuards, HttpStatus, Post, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { of } from 'rxjs';
import { User } from './entities/user.entity';
import { UserBlock } from './entities/user-block.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

var sizeOf = require('image-size');

const MIN_IMAGE_SIZE = 200; 
const MAX_IMAGE_SIZE = 300; 

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
   ) { }

  @UseGuards(AuthGuard('jwt'))
  @Patch('addPseudo')
  async addPseudo(@Body('inputPseudo') pseudo: string, @Res() res, @Req() req) {
    const user = req.user;
    const response = await this.usersService.addPseudo(user.id, pseudo);
    return res.status(response.success && HttpStatus.OK).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user')
  async getUser(@Req() req, @Res() res) {
    const user = req.user;
    const response = await this.usersService.getUser(user.id);
    return res.status(response.success && HttpStatus.OK).json(response);
  }

  @UseGuards(AuthGuard('jwtOne'))
  @Get('2faAuthorized')
  async isAuthorized() {
    return ;
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Patch('changePseudo')
  async changePseudo(@Req() req, @Res() res, @Body('newPseudo') newPseudo: string) {
    const user = req.user;
    const response = await this.usersService.changePseudo(user.id, newPseudo);
    return res.status(response.success && HttpStatus.OK).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('addAvatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './src/users/avatars',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${uniqueSuffix}.${file.mimetype.split('/')[1]}`);
      },
    }),
  }))
  async addAvatar(@UploadedFile() file, @Req() req, @Res() res) {
    if (!file) {
      return res.status(400).json({ error: 'Veuillez télécharger une image.' });
    }
    try {
      const dimensions = sizeOf(file.path);
      const { width, height } = dimensions;
      if (width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE) {
        return res
          .status(400)
          .json({ error: `L'image est trop petite. Veuillez choisir une image d'au moins ${MIN_IMAGE_SIZE}x${MIN_IMAGE_SIZE} pixels.` });
      }
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        return res
          .status(400)
          .json({ error: `L'image est trop grande. Veuillez choisir une image d'au plus ${MAX_IMAGE_SIZE}x${MAX_IMAGE_SIZE} pixels.` });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Une erreur s\'est produite lors de la vérification de l\'image.' });
    }
    const user = req.user;
    const response = await this.usersService.addAvatar(user.id, file.filename);
    return res.status(response.success && HttpStatus.CREATED).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('avatar')
  async getAvatar(@Req() req, @Res() res){
    const user = req.user;
    const path = await this.usersService.getAvatar(user.id);
    return of(res.sendFile(join(process.cwd(), path)));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('avatar/:id')
  async getAvatarId(@Param('id') id: number, @Req() req, @Res() res){
    const path = await this.usersService.getAvatar(id);
    return of(res.sendFile(join(process.cwd(), path)));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('userlist')
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('getOneUserById/:id')
  async getOneUserParamId(@Param('id') userId: string, @Res() res) {
    const id = parseInt(userId, 10);
    const response = await this.usersService.findOneUserById(id);
    return res.status(response.success ?  HttpStatus.OK : HttpStatus.NOT_FOUND).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('blockUser')
  async blockUser(@Body('receiverId') receiverId: number, @Req() req, @Res() res) {
    const user = req.user;
    const response = await this.usersService.blockUser(user.id, receiverId);
    return res.status(response.success && response.created ? HttpStatus.CREATED : HttpStatus.OK).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('unblockUser')
  async unblockUser(@Body('receiverId') receiverId: number, @Req() req, @Res() res): Promise<UserBlock[]> {
    const user = req.user;
    const response = await this.usersService.unblockUser(user.id, receiverId);
    return res.status(response.success && HttpStatus.OK).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('usersblocklist')
  async getUsersBlockList() : Promise<UserBlock[]> {
      return this.usersService.findAllUsersBlockList();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('isUserBlocked')
  async isUserBlocked(@Query('receiverId') receiverId: number, @Req() req, @Res() res) {
    const user = req.user;
    const response = await this.usersService.isUserBlocked(user, receiverId);
    return res.status(response.success ? HttpStatus.OK : HttpStatus.NO_CONTENT).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('allMyUsersBlocked')
  async allMyUsersBlocked(@Req() req, @Res() res) {
    const user = req.user;
    const response = await this.usersService.allMyUsersBlocked(user);
    return res.status(HttpStatus.OK).json(response);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('change2FA')
  async change2FA(@Req() req, @Res() res, ) {
    const user = req.user;
    if (user.doubleAuth === true) {
      const response = await this.usersService.change2FA(user);
      return res.status(response.success && HttpStatus.OK).json(response);
    }
    else {
      const response = await this.usersService.change2FA(user);
      const toDataURL = await this.usersService.generateQrCodeDataURL(response.otpauthUrl);
      return res.json(toDataURL);
    }
  }

  @UseGuards(AuthGuard('jwtOne'))
  @Get('verifyTwoFA')
  async verifyTwoFA(@Query('inputCode') inputCode: string, @Req() req, @Res() res) {
    const user = req.user;
    const isCodeValid = await this.usersService.isTwoFactorAuthenticationCodeValid(inputCode, user);
    if (!isCodeValid) {
      return res.json(false);
    }
    else {
      user.twoFactorValidate = true;
      await this.usersRepository.save(user);
      return res.json(true);
    }
  }
}
