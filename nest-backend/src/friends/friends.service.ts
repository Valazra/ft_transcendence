import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendRequest } from 'src/users/entities/friend-request.entity';
import { User } from 'src/users/entities/user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class FriendsService {
    constructor(
        @InjectRepository(FriendRequest)
        private readonly friendsRepository: Repository<FriendRequest>, 
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>) {}
    
    async sendFriendRequest(creator: User, receiver: User) {
        if (creator && receiver) {
            if (creator.id === receiver.id) {
                return {
                    success: false,
                    message: "You can't add yourself"
                }
            }
            let friendreq = await this.friendsRepository.findOne({ where: [{ creatorId: creator.id, receiverId: receiver.id }, 
                { creatorId: receiver.id, receiverId: creator.id}]});
            if (friendreq) {
                if (friendreq.status === "denied") {
                    if (friendreq.creatorId === receiver.id)
                    {
                        friendreq.creatorId = creator.id;
                        friendreq.receiverId = receiver.id;
                    }
                    friendreq.status = "pending";
                    this.friendsRepository.save(friendreq);
                    return {
                        success: true,
                        message: "friendrequest passe de denied a pending",
                    }
                }
                else {
                    return {
                        success: false,
                        message: "You already add him or he already added you"
                    }
                }  
            }
            let myFriendRequest: FriendRequest = {id: null, creatorId: creator.id, receiverId: receiver.id, creator: creator, receiver: receiver, status: 'pending' }
            const request = await this.friendsRepository.save(myFriendRequest);
            return {
                success: true,
                message: "friendrequest cree",
                friendRequest: request,
            }
        }
        else {
            return {
                success: false,
                message: "User ou receiver pas trouve",
            };
        }
    }

    async getMyRequestsSent(user: User) {
        
        const requestSent = await this.friendsRepository.find({ where: { creatorId: user.id, status: 'pending' }});
        
        if (requestSent) {
            
            const receiverIds = requestSent.map(request => request.receiverId);
            const userlist = await this.usersRepository.find({where: { id: In(receiverIds) }});
            return {
                success: true,
                message: "Voici les requests que vous avez envoye",
                requestSent: requestSent,
                userlist: userlist,
            }
        }
        else {
            return {
                success: false,
                message: "Pas de requests sent",
            }
        }
    }

    async getMyRequestsReceived(user: User) {
        
        const requestsReceived = await this.friendsRepository.find({ where: { receiverId: user.id, status: 'pending' }});
        if (requestsReceived) {
            const creatorIds = requestsReceived.map(request => request.creatorId);
            const userlist = await this.usersRepository.find({where: { id: In(creatorIds) }})
            return {
                success: true,
                message: "Voici les requests que vous avez recu",
                requestReceived: requestsReceived,
                userlist: userlist,
            }
        }
        else {
            return {
                success: false,
                message: "Pas de requests recu",
            }
        }
    }

    async acceptRequests(creator: User, receiver: User) {
        let requestsReceived = await this.friendsRepository.findOne({ where: { creatorId: creator.id, receiverId: receiver.id, status: 'pending' }});
        if (requestsReceived) {
            requestsReceived.status = 'accepted';
            await this.friendsRepository.save(requestsReceived);
            return {
                success: true,
                message: "Request accepted with success", 
            }
        }
        else {
            return {
                success: false,
                message: "Pas de requests recu",
            }
        }
    }

    async denyRequests(creator: User, receiver: User) {
        let requestsReceived = await this.friendsRepository.findOne({ where: { creatorId: creator.id, receiverId: receiver.id, status: 'pending' }});
        if (requestsReceived) {
            requestsReceived.status = 'denied';
            await this.friendsRepository.save(requestsReceived);
            return {
                success: true,
                message: "Request denied with success", 
            }
        }
        else {
            return {
                success: false,
                message: "Pas de requests recu",
            }
        }
    }
    async removeFriend(meUser: User, friendUser: User)
    {
        let friend = await this.friendsRepository.findOne({ where: [{ creatorId: meUser.id, receiverId: friendUser.id, status: 'accepted' }, 
            { creatorId: friendUser.id, receiverId: meUser.id, status: 'accepted'}]});
        if (!friend)
        {
            return {
                success: false,
                message: "Vous n'etes pas amis."
            }
        }
        friend.status = 'denied';
        await this.friendsRepository.save(friend);
        return {
            success: true,
            message: "Vous n'etes plus amis.",
        }

    }

    async getMyFriends(user: User) {
        const friendlist = await this.friendsRepository.find({ where: [{creatorId: user.id, status: 'accepted'}, {receiverId: user.id, status: 'accepted'}]})
        if (friendlist) {
            const creatorIds = friendlist.map(request => request.creatorId);
            const receiverIds = friendlist.map(request => request.receiverId);
            const usersCreators = await this.usersRepository.find({where: { id: In(creatorIds) }});
            const usersReceivers = await this.usersRepository.find({where: { id: In(receiverIds) }});
            const friendslist = [];
            for (const friends of usersCreators) {
                if (friends.id !== user.id) {
                    friendslist.push(friends)
                }
            }
            for (const friends of usersReceivers) {
                if (friends.id !== user.id) {
                    friendslist.push(friends)
                }
            }
            return {
                success: true,
                message: "Voici votre friendlist",
                usersCreators: usersCreators,
                usersReceivers: usersReceivers,
                friendslist: friendslist,
            }
        }
        else {
            return {
                success: false,
                message: "Pas d'amis dans ce monde de brutes"
            }
        }
    }

    async findAll(): Promise<FriendRequest[]> {
        return this.friendsRepository.find();
    }

    async isMyFriend(user: User, receiverId: number) {
        const receiver = await this.usersRepository.findOne({where: {id: receiverId}});
        if (receiver) {
            const friendRequest = await this.friendsRepository.findOne({where: [{creatorId: user.id, receiverId: receiverId, status: 'accepted'}, {creatorId: receiverId, receiverId: user.id, status: 'accepted'}]})
            if (friendRequest) {
                return {
                    success: true,
                    isMyFriend: true
                }
            }
            return {
                success: true,
                isMyFriend: false
            }
        }
        else {
            return {
                success: false,
            }
        }
    }
}
