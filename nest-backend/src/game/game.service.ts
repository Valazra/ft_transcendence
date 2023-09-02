import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GameRequest } from 'src/users/entities/game-request.entity';
import { User } from 'src/users/entities/user.entity';
import { Equal, FindManyOptions, In, Not, Repository } from 'typeorm';
import { Game } from 'src/users/entities/game.entity';

@Injectable()
export class GameService {
    constructor(
        @InjectRepository(Game)
        private readonly gameRepository: Repository<Game>,
        @InjectRepository(GameRequest)
        private readonly gameRRepository: Repository<GameRequest>,
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>) { }

    async endGame(gameId: string, firstPlayerId: number, secondPlayerId: number, firstPlayerScore: number, secondPlayerScore: number): Promise<void> {
        const game = new Game();

        game.firstPlayerId = firstPlayerId;
        game.secondPlayerId = secondPlayerId;
        game.firstPlayerScore = firstPlayerScore;
        game.secondPlayerScore = secondPlayerScore;
        if (firstPlayerScore > secondPlayerScore) {
            game.winner = firstPlayerId;
        } else if (secondPlayerScore > firstPlayerScore) {
            game.winner = secondPlayerId;
        } else {
            game.winner = null; 
        }
        await this.gameRepository.save(game);
    }

    async lfGameInviteAccepted(userId: number)
{
    const gamereq = await this.gameRRepository.findOne({
        where: [
            { 
                creatorId: userId, 
                status: 'accepted'
            },
            {  
                receiverId: userId,
                status: 'accepted'
            }
        ]
    });
    if (!gamereq)
    {
        return (null);
    }
    return( gamereq.id);
}

async cancelGameInviteAccepted(userId: number, gameId: number)
{
    const gamereq = await this.gameRRepository.findOne({
        where: [
            { 
                creatorId: userId,
                id: gameId, 
                status: 'accepted'
            },
            {  
                receiverId: userId,
                id: gameId, 
                status: 'accepted'
            }
        ]
    });
    if (!gamereq)
    {
        return (false);
    }
    gamereq.status = 'denied';
    await this.gameRRepository.save(gamereq);
    return( true);
}

    async createGameInvite(creatorId: number, receiverId: number) {
        const creator = await this.usersRepository.findOne({ where: { id:creatorId }});
        const receiver = await this.usersRepository.findOne({ where: { id:receiverId }});
        if (creator && receiver) {
            if (creator.id === receiver.id) {
                return {
                    success: false,
                    message: "You can't add yourself"
                }
            }
    
            let myGameRequest: GameRequest = { id: null, creatorId: creator.id, receiverId: receiver.id, creator: creator, receiver: receiver, status: 'accepted' }
            const request = await this.gameRRepository.save(myGameRequest);
            return {
                success: true,
                message: "gamerequest cree",
                gameRequest: request,
            }
        }
        else {
            return {
                success: false,
                message: "User ou receiver pas trouve",
            };
        }
    }

    async sendGameRequest(creator: User, receiver: User) {
    if (creator && receiver) {
        if (creator.id === receiver.id) {
            return {

                success: false,
                message: "You can't add yourself"
            }
        }
        let gamereq = await this.gameRRepository.findOne({
            where: [
                { 
                    creatorId: creator.id, 
                    receiverId: receiver.id,
                    status: Not('finish')
                },
                { 
                    creatorId: receiver.id, 
                    receiverId: creator.id,
                    status: Not('finish')
                }
            ]
        });
        if (gamereq) {
            if (gamereq.status === "denied") {
                if (gamereq.creatorId === receiver.id) {
                    gamereq.creatorId = creator.id;
                    gamereq.receiverId = receiver.id;
                }
                gamereq.status = "pending";
                this.gameRRepository.save(gamereq);
                return {
                    success: true,
                    message: "gamerequest passe de denied a pending",
                }
            }
            else{
                return {
                    success: false,
                    message: "You already add him or he already added you"
                }
            }
        }
        let myGameRequest: GameRequest = { id: null, creatorId: creator.id, receiverId: receiver.id, creator: creator, receiver: receiver, status: 'pending' }
        const request = await this.gameRRepository.save(myGameRequest);
        return {
            success: true,
            message: "gamerequest cree",
            gameRequest: request,
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
    const requestSent = await this.gameRRepository.find({ where: { creatorId: user.id, status: 'pending' } });
    if (requestSent) {
        const receiverIds = requestSent.map(request => request.receiverId);
        const userlist = await this.usersRepository.find({ where: { id: In(receiverIds) } })
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

    const requestsReceived = await this.gameRRepository.find({ where: { receiverId: user.id, status: 'pending' } });
    if (requestsReceived) {
        const creatorIds = requestsReceived.map(request => request.creatorId);
        const userlist = await this.usersRepository.find({ where: { id: In(creatorIds) } })
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
    let isAlreadyAGame = await this.gameRRepository.findOne({ where: { creatorId: creator.id, status: 'accepted' } });
    if (isAlreadyAGame)
    {
        return {
            success: false,
            message: "creator already accepted a game.",
            userId: creator.id,
        }
    }
    let isAlreadyAGameReceiver = await this.gameRRepository.findOne({ where: { receiverId: receiver.id, status: 'accepted' } });
    if (isAlreadyAGameReceiver)
    {
        return {
            success: false,
            message: "receiver already accepted a game.",
            userId: receiver.id,
        }
    }
    let requestsReceived = await this.gameRRepository.findOne({ where: { creatorId: creator.id, receiverId: receiver.id, status: 'pending' } });
    if (requestsReceived) {
        requestsReceived.status = 'accepted';
        this.gameRRepository.save(requestsReceived);
        return {
            success: true,
            message: "Request accepted with success",
            gameId: requestsReceived.id,
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
    let requestsReceived = await this.gameRRepository.findOne({ where: { creatorId: creator.id, receiverId: receiver.id, status: 'pending' } });
    if (requestsReceived) {
        requestsReceived.status = 'denied';
        this.gameRRepository.save(requestsReceived);
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

async finishGameInvite(gameId: number)
{
    let game = await this.gameRRepository.findOne({
        where: [{ id: gameId,}]
    });
    if (!game) {
        return {
            success: false,
            message: "The game you want to finish doesn't exist."
        }
    }
    game.status = "finish";
    this.gameRRepository.save(game);
    return {
        success: true,
        message: "Game invite finish.",
    }

}

    async removeGame(meUser: User, gameUser: User)
{
    let game = await this.gameRRepository.findOne({
        where: [{ creatorId: meUser.id, receiverId: gameUser.id, status: 'accepted' },
        { creatorId: gameUser.id, receiverId: meUser.id, status: 'accepted' }]
    });
    if (!game) {
        return {
            success: false,
            message: "Vous n'etes pas amis."
        }
    }
    game.status = 'denied';
    this.gameRRepository.save(game);
    return {
        success: true,
        message: "Vous n'etes plus amis.",
    }

}

    async getMyGame(user: User) {
    const gamelist = await this.gameRRepository.find({ where: [{ creatorId: user.id, status: 'accepted' }, { receiverId: user.id, status: 'accepted' }] })
    if (gamelist) {
        const creatorIds = gamelist.map(request => request.creatorId);
        const receiverIds = gamelist.map(request => request.receiverId);
        const usersCreators = await this.usersRepository.find({ where: { id: In(creatorIds) } });
        const usersReceivers = await this.usersRepository.find({ where: { id: In(receiverIds) } });
        const gameslist = [];
        for (const games of usersCreators) {
            if (games.id !== user.id) {
                gameslist.push(games)
            }
        }
        for (const games of usersReceivers) {
            if (games.id !== user.id) {
                gameslist.push(games)
            }
        }
        return {
            success: true,
            message: "Voici votre gamelist",
            usersCreators: usersCreators,
            usersReceivers: usersReceivers,
            gamelist: gamelist,
        }
    }
    else {
        return {
            success: false,
            message: "Pas d'amis dans ce monde de brutes"
        }
    }
}

    async findAll(): Promise < GameRequest[] > {
    return this.gameRRepository.find();

}

async getGamesByFirstPlayer(user: User): Promise<Game[]> {
    const options: FindManyOptions<Game> = {
      where: {
        firstPlayer: { id: user.id },
      },
    };
    return this.gameRepository.find(options);
  }
  
  async getGamesBySecondPlayer(user: User): Promise<Game[]> {
    const options: FindManyOptions<Game> = {
      where: {
        secondPlayer: { id: user.id },
      },
    };
    return this.gameRepository.find(options);
  }
  
  async updateWinLossCounters(user: User): Promise<void> {
    const gamesAsFirstPlayer = await this.getGamesByFirstPlayer(user);
    const gamesAsSecondPlayer = await this.getGamesBySecondPlayer(user);
  
    let winCount = 0;
    let lossCount = 0;

 
  
    gamesAsFirstPlayer.forEach((game) => {
      if (game.winner === game.firstPlayerId) {
        winCount++;
      } else if (game.winner === game.secondPlayerId) {
        lossCount++;
      }
    });
  
    gamesAsSecondPlayer.forEach((game) => {
      if (game.winner === game.secondPlayerId) {
        winCount++;
      } else if (game.winner === game.firstPlayerId) {
        lossCount++;
      }
    });
    user.winCount = winCount;
    user.lossCount = lossCount;
    await this.usersRepository.save(user);
  }

  async getUserGameHistory(userId: number): Promise<Game[]> {
    const options: FindManyOptions<Game> = {
      where: [{ firstPlayerId: userId }, { secondPlayerId: userId }],
      relations: ['firstPlayer', 'secondPlayer'],
      order: { id: 'DESC' },
    };
    return (this.gameRepository.find(options));
  }

}
