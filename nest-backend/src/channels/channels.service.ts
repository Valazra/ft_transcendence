import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChanMp } from 'src/users/entities/chan-mp.entity';
import { ChanUser } from 'src/users/entities/chan-user.entity';
import { Channel } from 'src/users/entities/channel.entity';
import { User } from 'src/users/entities/user.entity';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ChannelsService {
    constructor(
        @InjectRepository(Channel)
        private readonly channelsRepository: Repository<Channel>, 
        @InjectRepository(ChanUser)
        private readonly chanUserRepository: Repository<ChanUser>, 
        @InjectRepository(ChanMp)
        private readonly chanMpRepository: Repository<ChanMp>, 
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async createChan(user: User, chanName: string, isPrivate: boolean, isPassword: boolean, password: string) {
        let infosChan = {name: chanName, ownerId: user.id, isPrivate: isPrivate, isPassword: isPassword, password: password}
        const newChan = await this.channelsRepository.save(infosChan);
        let infosChanUser = { userId: user.id, chanId: newChan.id, isAdmin: true, user: user, chan: newChan, isInChan: true}
        const newChanUser = await this.chanUserRepository.save(infosChanUser);
        return {
            success: true,
            channel: newChan,
            chanUser: newChanUser,
        }
    }

    async createMpChan(user: User, userTargetId: number, chanName: string) {
        /*if (user.id === userTargetId) {
            return {
                success: true,
                error: "you can't mp yourself"
            }
        }*/
        const chanMp = await this.chanMpRepository.findOne({ where: [{userId: user.id, userTargetId: userTargetId}, {userId: userTargetId, userTargetId: user.id}]});
        if (chanMp) {
            return {
                success: true,
                alreadyCreated: true,
            }
        }
        else {
            let infosChan = {name: chanName, userId: user.id, userTargetId: userTargetId}
            await this.chanMpRepository.save(infosChan);
            return {
                success: true,
                alreadyCreated: false,
            }
        }
    }

    async addInChan(user: User, chanName: string) {
        const channel = await this.channelsRepository.findOne({ where: { name: chanName }});
        if (channel) {
            const chanUser = await this.chanUserRepository.findOne({ where: {userId: user.id, chanId: channel.id}});
            if (chanUser) {
                chanUser.isInChan = true;
                await this.chanUserRepository.save(chanUser);
                return {
                    success: true,
                    chanUser: chanUser,
                    created: false
                }
            }
            else {
                let infosChanUser = { userId: user.id, chanId: channel.id, user: user, chan: channel, isInChan: true}
                const newChanUser = await this.chanUserRepository.save(infosChanUser);
                return {
                    success: true,
                    chanUser: newChanUser,
                    created: true,
                }
            }
        }
    }

    async findAllChan(): Promise<Channel[]> {
        return this.channelsRepository.find();
    }

    async findAllMpChan(): Promise<ChanMp[]> {
        return this.chanMpRepository.find();
    }

    async findAllChanUser(): Promise<ChanUser[]> {
        return this.chanUserRepository.find();
    }

    async findAllPublicChan(): Promise<Channel[]> {
        const publicChanList = await this.channelsRepository.find({ where: { isPrivate: false}});
        return publicChanList;
    }

    async findMyPrivateChans(user: User): Promise<Channel[]> {
        const myPrivateChanList = await this.chanUserRepository.find({ where: { userId: user.id }});
        const chanIds = myPrivateChanList.map(ChanUser => ChanUser.chanId);
        const channels = await this.channelsRepository.find({ where: {id: In(chanIds), isPrivate: true}})
        return channels;
    }

    async checkPassword(chanName: string, password: string) {
        const channel = await this.channelsRepository.findOne({where: {name: chanName}});
        if (channel) {
            const isOk = await bcrypt.compare(password, channel.password);
            if (isOk) {
                return {
                    success: true,
                    isOk: true
                }
            }
            else {
                return {
                    success: true,
                    isOk: false,
                }
            }
        }
    }

    async findOneChan(chanName: string): Promise<Channel> {
        return this.channelsRepository.findOne({where: {name: chanName}});
    }

    async findOneChanUser(chanId: number, userId: number): Promise<ChanUser> {
        return this.chanUserRepository.findOne({where: {chanId: chanId, userId: userId}});
    }

    async findActualChanUser(userId: number) {
        const chanUser = await this.chanUserRepository.findOne({where: {userId: userId, isInChan: true}});
        if (chanUser) {
            const channel = await this.channelsRepository.findOne({where: {id: chanUser.chanId}})
            if (channel) {
                return {
                    success: true,
                    chanUser: chanUser,
                    channel: channel,
                    found: true,
                }
            }
        }
        else {
            return {
                success: true,
                found: false,
            }
        }
    }

    async findOneChanMp(chanName: string) {
        const chanMp = await this.chanMpRepository.findOne({where: {name: chanName}});
        if (chanMp) {
            return {
                success: true,
                chanMp: chanMp,
                found: true,
            }
        }
        return {
            success: true,
            found: false,
        }
    }

    async findActualChanMp(userId: number) {
        const chanMp = await this.chanMpRepository.findOne({where: [{userId: userId, userIsInChan: true}, {userTargetId: userId, userTargetIsInChan: true}]});
        if (chanMp) {
            return {
                success: true,
                chanMp: chanMp, 
                found: true,
            }
        }
        return {
            success: true,
            found: false
        }
        
    }

    async usersInChanMp(actualChan: string) {
        const chanmp = await this.chanMpRepository.findOne({where: {name: actualChan}});
        if (chanmp) {
            const user1 = await this.usersRepository.findOne({where: {id: chanmp.userId}});
            const user2 = await this.usersRepository.findOne({where: {id: chanmp.userTargetId}});
            if (!user1 || !user2) {
                return {
                    success: true,
                    error: "user1 ou user2 non trouve."
                }
            }
            const userlist: User[] = [];
            userlist.push(user1);
            userlist.push(user2);
            return {
                success: true,
                userlist: userlist
            }
        }
    }

    async usersInChan(actualChan: string) {
        const channel = await this.channelsRepository.findOne({where: {name: actualChan}});
        if (channel) {
            const chansUserList = await this.chanUserRepository.find({where: {chanId: channel.id, isInChan: true}});
            if (chansUserList) {
                const userlist: User[] = [];
                for (const chanUserList of chansUserList) {
                    const user = await this.usersRepository.findOne({where: {id: chanUserList.userId}});
                    if (user) {
                        userlist.push(user);
                    }
                    else {
                        //throw exception user not found
                    }
                }
                return {
                    success: true,
                    allFound: true,
                    userlist: userlist
                }
            }
            else {
                //throw exception chanuser not found
            }
        }
        else {
            //throw exception channel not found
        }
    }


    async changeIsInChan(user: User, chanName: string) {
        if (chanName === null) {
            chanName = "Global Chat";
        }
        const channel = await this.channelsRepository.findOne({where: {name: chanName}});
        if (!channel) {
            const chanMp = await this.chanMpRepository.findOne({where: {name: chanName}})
            if (!chanMp) {
                return {
                    success: true,
                    message: "on est dans global chat"
                }
            }
            else {
                if (chanMp.userId === user.id) {
                    if (chanMp.userIsInChan === true) {
                        chanMp.userIsInChan = false;
                        await this.chanMpRepository.save(chanMp);
                    }
                    else {
                        chanMp.userIsInChan = true;
                        await this.chanMpRepository.save(chanMp);
                    }
                    return {
                        success: true,
                        chanMp: chanMp
                    }
                }
                else if (chanMp.userTargetId === user.id) {
                    if (chanMp.userTargetIsInChan === true) {
                        chanMp.userTargetIsInChan = false;
                        await this.chanMpRepository.save(chanMp);
                    }
                    else {
                        chanMp.userTargetIsInChan = true;
                        await this.chanMpRepository.save(chanMp);
                    }
                    return {
                        success: true,
                        chanMp: chanMp
                    }
                }
            }
        }
        const chanUser = await this.chanUserRepository.findOne({where: {userId: user.id, chanId: channel.id}});
        if (channel) {
            if (chanUser.isInChan === true) {
                chanUser.isInChan = false;
                await this.chanUserRepository.save(chanUser);
            }
            else {
                chanUser.isInChan = true;
                await this.chanUserRepository.save(chanUser);
            }
            return {
                success: true,
                chanUser: chanUser
            }
        }
    }
}
