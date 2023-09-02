import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

type Payload = {
  sub: number;
  email: string;
  idJwt: string;
};

@Injectable()
export class JwtOneStrategy extends PassportStrategy(Strategy, 'jwtOne') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          return req?.cookies?.jwt;
        },
      ]),
      secretOrKey: configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: Payload) {
    const user = await this.usersRepository.findOne({
      where: { email: payload.email },
    });
    if (!user) {
      throw new UnauthorizedException("Veuillez vous connecter pour acceder a cette page");
    }
    else {
      if (payload.idJwt !== user.idJwt)
      {
        throw new UnauthorizedException("Veuillez vous connecter pour acceder a cette page");
      }
      return user;
    }
  }
}