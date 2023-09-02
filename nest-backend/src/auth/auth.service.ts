import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly JwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async createAuthUser(userToCreate: User) {
        let user;
        const userInDb = await this.usersRepository.findOneBy({
            email: userToCreate.email,
        });
        if (!userInDb) {
            user = new User();
            user.email = userToCreate.email;
            user.pseudo = undefined;
            user.isConnected = true;
            user.isInGame = false;
            await this.usersRepository.save(user);
        }
        else {
            userInDb.isConnected = true;
            await this.usersRepository.save(userInDb);
            user = userInDb;
        }
        const jwtId = uuidv4();
        const payload = {
            sub: user.id,
            email: user.email,
            idJwt: jwtId
        };
        const token = this.JwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_EXPIRESIN'),
            secret: this.configService.get('JWT_SECRET'),
        });
        user.idJwt = jwtId;
        await this.usersRepository.save(user);
        return { user, token };
    }

    async logOut(id: number) {
        const user = await this.usersRepository.findOne({ where: { id: id } });
        if (user) {
            user.isConnected = false;
            user.twoFactorValidate = false;
            user.idJwt = null;
            await this.usersRepository.save(user);
            return {
                success: true,
                message: 'User logout avec succès',
                user: user,
            };
        }
        //throw exception user not found
    }
}
