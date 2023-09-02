import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Not, Repository } from 'typeorm';
import { UserBlock } from './entities/user-block.entity';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

@Injectable()
export class UsersService {
   
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(UserBlock)
        private usersBlockRepository: Repository<UserBlock>,
    ) {}

    async addPseudo(id: number, pseudo: string) {
        const userWithThisPseudo = await this.usersRepository.findOne({ where: { pseudo: pseudo }});
        if (userWithThisPseudo) {
            return {
                success: true,
                message: 'pseudo deja pris',
                pseudoTaken: true
            }
        }
        const user = await this.usersRepository.findOne({ where: { id }});
        if (user) {
            user.pseudo = pseudo;
            await this.usersRepository.save(user);
            return {
                success: true,
                message: 'Pseudo enregistré avec succès',
                user: user,
                pseudoTaken: false
            };
        }
        throw new NotFoundException('User not found');
    }

    async getUser(id: number) {
        const user = await this.usersRepository.findOne({ where: { id:id }});
        if (user) {
            return {
                success: true,
                message: 'User trouve avec succès',
                user: user,
            };
        }
    }

    async changePseudo(id: number, newPseudo: string) {
        const isPseudoUsed = await this.usersRepository.findOne({where: {pseudo: newPseudo}});
        if (isPseudoUsed) {
            return {
                success: true,
                error: "Pseudo is already used."
            }
        }
        const user = await this.usersRepository.findOne({ where: { id:id }});
        if (user) {
            user.pseudo = newPseudo;
            await this.usersRepository.save(user);
            return {
                success: true,
                user: user,
            };
        }       
    }
/*
    async deleteUser(id: number){
        const deleteResponse = await this.usersRepository.delete(id);
        if (!deleteResponse.affected) {
            throw new HttpException('User id not found', HttpStatus.NOT_FOUND);
        }
    }
*/
    async addAvatar(id: number, filename: string) {
        const user = await this.usersRepository.findOne({ where: { id:id }});
        if (user) {
            user.avatar = `src/users/avatars/${filename}`;
            await this.usersRepository.save(user);
            return {
                success: true,
                message: 'Avatar ajoute avec succès',
                user: user,
            };
        }
    }

    async getAvatar(id: number) {
        const user = await this.usersRepository.findOne({ where: { id:id }});
        if (user) {
            const path = user.avatar;
            return path;
        }
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find({where: {pseudo: Not("")}});
    }

    async findOneUser(userPseudo: string) {
        const user = await this.usersRepository.findOne({where: {pseudo: userPseudo}});
        if (user) {
            return {
                success: true,
                user: user,
            };
        }
    }

    async findOneUserById(userId: number) {
        const user = await this.usersRepository.findOne({where: {id: userId}});
        if (user) {
            return {
                success: true,
                user: user,
            };
        }
        return {
            success: false,
        }
    }

    async blockUser(userId: number, targetId: number) {
        const user = await this.usersRepository.findOne({where: {id: userId}});
        if (user) {
            const userTarget = await this.usersRepository.findOne({where: {id: targetId}});
            if (userTarget) {
                const userBlock = await this.usersBlockRepository.findOne({where: {userId: user.id, userBlockedId: userTarget.id}})
                if (userBlock) {
                    if (userBlock.isBlocked === true) {
                        return {
                            success: true,
                            error: "User is already blocked.",
                            created: false
                        }
                    }
                    else {
                        userBlock.isBlocked = true;
                        await this.usersBlockRepository.save(userBlock);
                        return {
                            success: true,
                            block_user: userBlock,
                            created: false
                        }
                    }
                }
                else {
                    let block_user = {userId: user.id, userBlockedId: userTarget.id, isBlocked: true}
                    await this.usersBlockRepository.save(block_user);
                    return {
                        success: true,
                        block_user: block_user,
                        created: true,
                    }
                }
            }
            //throw new exception User not found
        }
        //throw new exception User not found
    }

    async unblockUser(userId: number, targetId: number) {
        const user = await this.usersRepository.findOne({where: {id: userId}});
        if (user) {
            const userTarget = await this.usersRepository.findOne({where: {id: targetId}});
            if (userTarget) {
                const userBlock = await this.usersBlockRepository.findOne({where: {userId: user.id, userBlockedId: userTarget.id, isBlocked: true}})
                if (userBlock) {
                    userBlock.isBlocked = false;
                    await this.usersBlockRepository.save(userBlock);
                    return {
                        success: true,
                        user_block: userBlock
                    }
                }
            }
        }
    }

    async findAllUsersBlockList(): Promise<UserBlock[]> {
        return this.usersBlockRepository.find();
    }

    async isUserBlocked(user: User, targetId: number) {
        const user_block = await this.usersBlockRepository.findOne({where: {userId: user.id, userBlockedId: targetId}});
        if (user_block) {
            if (user_block.isBlocked === true) {
                return {
                    success: true,
                    user_block: user_block,
                    isBlocked: true,
                }
            }
            else {
                return {
                    success: true,
                    user_block: user_block,
                    isBlocked: false,
                }
            }
        }
        else {
            return {
                success: false,
            }
        }
    }

    async allMyUsersBlocked(user: User) {
        const usersBlocked = await this.usersBlockRepository.find({where: {userId: user.id, isBlocked: true}});
        if (usersBlocked) {
            return {
                message: "au moins un user blocked",
                blocked : true,
                usersBlocked: usersBlocked
            }
        }
        return {
            message: "aucun user blocked",
            blocked: false
        }
    }

    async change2FA(user: User) {
        if (user.doubleAuth === true) {
            user.doubleAuth = false;
            user.twoFactorAuthSecret = null;
            user.twoFactorValidate = false;
            await this.usersRepository.save(user);
            return {
                success: true,
                user: user
            }
        }
        else {
            user.doubleAuth = true;
            const secret = authenticator.generateSecret();
            const otpauthUrl = authenticator.keyuri(user.email, 'Transcendence', secret);
            user.twoFactorAuthSecret = secret;
            user.twoFactorValidate = true;
            await this.usersRepository.save(user);
            return {
                success: true,
                secret: secret,
                otpauthUrl: otpauthUrl,
                user: user
            }
        }
    }

    async generateQrCodeDataURL(otpauthUrl: string) {
        return toDataURL(otpauthUrl);
    }

    isTwoFactorAuthenticationCodeValid(twoFactorAuthenticationCode: string, user: User) {
        return authenticator.verify({
            token: twoFactorAuthenticationCode,
            secret: user.twoFactorAuthSecret,
        });
    }
}
