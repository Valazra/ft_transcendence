import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Channel } from 'src/users/entities/channel.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ChanUser } from 'src/users/entities/chan-user.entity';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FriendsService } from '../friends/friends.service';
import { GameService } from '../game/game.service';
import { ChanMp } from 'src/users/entities/chan-mp.entity';
import { UserBlock } from 'src/users/entities/user-block.entity';
import { GameRequest } from 'src/users/entities/game-request.entity';
import { GameClass } from './Game';
import * as bcrypt from 'bcrypt';
import * as moment from 'moment';

interface Game {
  count: number;
  countSpec: number;
  player1: number;
  player2: number;
  joinedSockets: Set<string>;
  readyPlayers?: Set<string>;
  gameInstance?: any;
  paused?: boolean;
  spectatorSockets: Set<string>,
  playerOptions: { mapStyle: string, gameplayStyle: string },
  selectedPlayerId: number;
  playerIds?: Set<number>;
}

interface UserList {
  id: number;
  socketId: string
}

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway {
  @WebSocketServer()
  server: Server;
  private games: { [gameId: string]: Game } = {};
  private queue: UserList[] = [];

  constructor(
    private readonly friendsService: FriendsService,
    private readonly gameService: GameService,
    @InjectRepository(GameRequest)
    private gameRequestRepository: Repository<GameRequest>,
    @InjectRepository(Channel)
    private readonly channelsRepository: Repository<Channel>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(ChanUser)
    private readonly chanUserRepository: Repository<ChanUser>,
    @InjectRepository(ChanMp)
    private readonly chanMpRepository: Repository<ChanMp>,
    @InjectRepository(UserBlock)
    private usersBlockRepository: Repository<UserBlock>,
  ) { }

  handleConnection(client: Socket) {
  }

  async handleDisconnect(client: Socket) {
    let user = await this.usersRepository.findOne({ where: { socketId: client.id } })
    if (user) {
      if (this.queue.find(u => u.id === user.id)) {
        this.queue = this.queue.filter(u => u.id !== user.id);
      }

      for (const gameId in this.games) {
        let game = this.games[gameId];

        if (game.spectatorSockets.has(client.id)) {
          game.countSpec -= 1;
          game.spectatorSockets.delete(client.id);
        }
        if (game.joinedSockets.has(client.id)) {
          game.count -= 1;
          game.joinedSockets.delete(client.id);

          if (game.gameInstance) {
            game.paused = true;
            this.server.to(gameId.toString()).emit('gamePaused', { message: `Player ${user.id} has left the game.` });
          }

          this.server.to(gameId).emit('playerCount', game.count);

          //         if (game.readyPlayers)
          //          console.log("Game ready", game.readyPlayers, game.readyPlayers.has(client.id));
          if (game.readyPlayers && !game.readyPlayers.has(client.id)) {
            // Informez les autres joueurs de la partie que quelqu'un s'est déconnecté
            this.server.to(gameId).emit('playerLeft', { pseudo: user.pseudo });
          }

          if (game.count === 0) {
            delete this.games[gameId];
          }
          break;
        }
      }
      user.isConnected = false;
      user.socketId = null;
      await this.usersRepository.save(user);

      if (user.pseudo !== null) {
        this.server.emit('userDisconnected', user);
      }
    }
  }
  @SubscribeMessage('cancelGameInvite')
  async cancelGameInvite(client: Socket, data: { gameId: number, userId: number }): Promise<void> {
    const gameId = data.gameId;
    const userId = data.userId;
    const rep = await this.gameService.cancelGameInviteAccepted(userId, gameId);
    if (!rep)
      return;

    if (this.games[gameId]) {
      this.server.to(gameId.toString()).emit('redirectToHome');
      delete this.games[gameId];
    }
  }


  @SubscribeMessage('leaveQueue')
  async leaveQueue(client: Socket, pseudoId: number): Promise<void> {
    let user = await this.usersRepository.findOne({ where: { socketId: client.id } })
    if (user) {
      if (this.queue.find(u => u.id === user.id)) {
        this.queue = this.queue.filter(u => u.id !== user.id);
      }
    }
  }
  @SubscribeMessage('leaveLobby')
  async leaveLobby(client: Socket, pseudoId: number): Promise<void> {
    let user = await this.usersRepository.findOne({ where: { socketId: client.id } })
    if (user) {
      if (this.queue.find(u => u.id === user.id)) {
        this.queue = this.queue.filter(u => u.id !== user.id);
      }

      for (const gameId in this.games) {
        let game = this.games[gameId];

        if (game.spectatorSockets.has(client.id)) {
          game.countSpec -= 1;
          game.spectatorSockets.delete(client.id);
        }
        if (game.joinedSockets.has(client.id)) {
          game.count -= 1;
          game.joinedSockets.delete(client.id);

          if (game.gameInstance) {
            game.paused = true;
            this.server.to(gameId.toString()).emit('gamePaused', { message: `Player ${user.id} has left the game.` });
          }
          this.server.to(gameId).emit('playerCount', game.count);

          // if (game.readyPlayers)
          //   console.log(game.readyPlayers, game.readyPlayers.has(client.id));
          if (game.readyPlayers && !game.readyPlayers.has(client.id)) {
            this.server.to(gameId).emit('playerLeft', { pseudo: user.pseudo });
          }
          if (game.count === 0) {
            delete this.games[gameId];
          }
          break;
        }
      }
    }

  }

  @SubscribeMessage('userConnected')
  async handleUserConnected(client: Socket, pseudoId: number): Promise<void> {
    let user = await this.usersRepository.findOne({ where: { id: pseudoId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    user.isConnected = true;
    user.socketId = client.id;
    await this.usersRepository.save(user);
    if (user.pseudo !== null) {
      this.server.emit('userReconnected', user);
    }
  }

  @SubscribeMessage('userDisconnected')
  async handleUserDisconnect(client: Socket, pseudoId: number): Promise<void> {
    let user = await this.usersRepository.findOne({ where: { id: pseudoId } });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    user.isConnected = false;
    user.socketId = null;
    await this.usersRepository.save(user);
    if (user.pseudo !== null) {
      this.server.emit('userDisconnected', user);
    }
  }

  @SubscribeMessage('amIInAGame')
  async checkIfUserInGame(client: Socket, data: { fromId: number }) {
    const userId = data.fromId;
    let user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    for (const gameId in this.games) {
      let game = this.games[gameId];
      let player1InGame = false;
      if (game.player1 === user.id)
        player1InGame = true;
      if ((game.player2 === user.id) || player1InGame) {
        if (game.gameInstance) {
          if (game.paused === true) {
            this.server.to(client.id).emit('redirectToGame', { gameId: gameId });
            return;
          }
        }
      }
    }
    const rep = await this.gameService.lfGameInviteAccepted(userId);
    if (rep) {
      this.server.to(client.id).emit('redirectToGame', { gameId: rep });
      return;
    }
  }

  //FRIENDS
  @SubscribeMessage('friendRequestSent')
  async handleFriendRequestSent(frommage: Socket, data: { fromId: number, toId: number }) {
    const from = data.fromId;
    const to = data.toId;

    // Get the sender and receiver from the database
    const toUser = await this.usersRepository.findOne({ where: { id: to } });
    const fromUser = await this.usersRepository.findOne({ where: { id: from } });
    if (!toUser) {
      throw new HttpException('toUser not found', HttpStatus.NOT_FOUND);
    }
    if (!fromUser) {
      throw new HttpException('fromUser not found', HttpStatus.NOT_FOUND);
    }

    const friendRequestResponse = await this.friendsService.sendFriendRequest(fromUser, toUser);
    if (friendRequestResponse.success) {

      this.server.to(toUser.socketId).emit('friendRequestReceived', { user: fromUser, friendRequest: friendRequestResponse.friendRequest });
      this.server.to(fromUser.socketId).emit('friendRequestReceivedFrom', { user: toUser, friendRequest: friendRequestResponse.friendRequest });
    } else {
      this.server.to(fromUser.socketId).emit('friendRequestFailed', { user: toUser, message: friendRequestResponse.message });
    }
  }

  @SubscribeMessage('friendRequestAccepted')
  async handleFriendRequestAccepted(frommage: Socket, data: { fromId: number, toId: number }) {
    const from = data.fromId;
    const to = data.toId;

    // Get the sender and receiver from the database
    const toUser = await this.usersRepository.findOne({ where: { id: to } });
    const fromUser = await this.usersRepository.findOne({ where: { id: from } });

    if (!toUser) {
      throw new HttpException('toUser not found', HttpStatus.NOT_FOUND);
    }
    if (!fromUser) {
      throw new HttpException('fromUser not found', HttpStatus.NOT_FOUND);
    }

    // Use your existing accept friend request logic here...
    const friendRequestResponse = await this.friendsService.acceptRequests(toUser, fromUser);
    if (friendRequestResponse.success) {
      this.server.to(fromUser.socketId).emit('friendRequestFromAccepted', { user: toUser });
      this.server.to(toUser.socketId).emit('friendRequestToAccepted', { user: fromUser });
    } else {
      this.server.to(to.toString()).emit('friendRequestAcceptFailed', { from: from, message: friendRequestResponse.message });
    }
  }

  @SubscribeMessage('removeFriend')
  async handleRemoveFriend(frommage: Socket, data: { myId: number, friendId: number }) {
    const me = data.myId;
    const friend = data.friendId;
    const meUser = await this.usersRepository.findOne({ where: { id: me } });
    const friendUser = await this.usersRepository.findOne({ where: { id: friend } });

    if (!meUser) {
      throw new HttpException('meUser not found', HttpStatus.NOT_FOUND);
    }
    if (!friendUser) {
      throw new HttpException('friendUser not found', HttpStatus.NOT_FOUND);
    }

    const friendRequestResponse = await this.friendsService.removeFriend(meUser, friendUser);
    if (friendRequestResponse.success) {
      this.server.to(meUser.socketId).emit('removeMyFriend', { user: friendUser });
      this.server.to(friendUser.socketId).emit('removedByMyFriend', { user: meUser });
    } else {
      this.server.to(meUser.socketId).emit('removeFriendFailed', { user: friendUser, message: friendRequestResponse.message });
    }
  }

  @SubscribeMessage('friendRequestDeny')
  async friendRequestDeny(frommage: Socket, data: { fromId: number, toId: number }) {
    const from = data.fromId;
    const to = data.toId;

    // Get the sender and receiver from the database
    const toUser = await this.usersRepository.findOne({ where: { id: to } });
    const fromUser = await this.usersRepository.findOne({ where: { id: from } });

    if (!toUser) {
      throw new HttpException('toUser not found', HttpStatus.NOT_FOUND);
    }
    if (!fromUser) {
      throw new HttpException('fromUser not found', HttpStatus.NOT_FOUND);
    }

    // Use your existing accept friend request logic here...
    const friendRequestResponse = await this.friendsService.denyRequests(toUser, fromUser);
    if (friendRequestResponse.success) {
      this.server.to(fromUser.socketId).emit('friendRequestFromDeny', { user: toUser });
      this.server.to(toUser.socketId).emit('friendRequestToDeny', { user: fromUser });
    } else {
      this.server.to(to.toString()).emit('friendRequestAcceptFailed', { from: from, message: friendRequestResponse.message });
    }
  }

  //GAME INVITE
  @SubscribeMessage('gameRequestSent')
  async handleGameRequestSent(frommage: Socket, data: { fromId: number, toId: number }) {
    const from = data.fromId;
    const to = data.toId;

    // Get the sender and receiver from the database
    const toUser = await this.usersRepository.findOne({ where: { id: to } });
    const fromUser = await this.usersRepository.findOne({ where: { id: from } });

    if (!toUser) {
      throw new HttpException('toUser not found', HttpStatus.NOT_FOUND);
    }
    if (!fromUser) {
      throw new HttpException('fromUser not found', HttpStatus.NOT_FOUND);
    }
    const gameRequestResponse = await this.gameService.sendGameRequest(fromUser, toUser);
    if (gameRequestResponse.success) {
      this.server.to(toUser.socketId).emit('gameRequestReceived', { user: fromUser, gameRequest: gameRequestResponse.gameRequest });
      this.server.to(fromUser.socketId).emit('gameRequestReceivedFrom', { user: toUser, gameRequest: gameRequestResponse.gameRequest });
    } else {
      this.server.to(fromUser.socketId).emit('gameRequestFailed', { user: toUser, message: gameRequestResponse.message });
    }
  }

  @SubscribeMessage('gameRequestAccepted')
  async handleGameRequestAccepted(client: Socket, data: { fromId: number, toId: number }) {
    const from = data.fromId;
    const to = data.toId;

    // Get the sender and receiver from the database
    const toUser = await this.usersRepository.findOne({ where: { id: to } });
    const fromUser = await this.usersRepository.findOne({ where: { id: from } });
    if (!toUser) {
      throw new HttpException('toUser not found', HttpStatus.NOT_FOUND);
    }
    if (!fromUser) {
      throw new HttpException('fromUser not found', HttpStatus.NOT_FOUND);
    }
    // Use your existing accept friend request logic here...
    const gameRequestResponse = await this.gameService.acceptRequests(toUser, fromUser);
    if (gameRequestResponse.success === true) {
      this.server.to(fromUser.socketId).emit('gameRequestFromAccepted', { user: toUser, gameId: gameRequestResponse.gameId });
      this.server.to(toUser.socketId).emit('gameRequestToAccepted', { user: fromUser, gameId: gameRequestResponse.gameId });
      this.server.to(toUser.socketId).emit('gameRequestChat', { user: fromUser, gameId: gameRequestResponse.gameId });
      //this.server.to(fromUser.socketId).emit('gameRequestChat', { user: fromUser });
      return;
    }
    else if (gameRequestResponse.userId) {
      this.server.to(client.id).emit('gameRequestAcceptFailed', { message: gameRequestResponse.message });
      return;
    }
    else {
      this.server.to(client.id).emit('gameRequestAcceptFailed', { message: gameRequestResponse.message });
      return;
    }
  }

  @SubscribeMessage('removeGame')
  async handleRemoveGame(frommage: Socket, data: { myId: number, friendId: number }) {
    const me = data.myId;
    const friend = data.friendId;
    const meUser = await this.usersRepository.findOne({ where: { id: me } });
    const friendUser = await this.usersRepository.findOne({ where: { id: friend } });

    if (!meUser) {
      throw new HttpException('meUser not found', HttpStatus.NOT_FOUND);
    }
    if (!friendUser) {
      throw new HttpException('friendUser not found', HttpStatus.NOT_FOUND);
    }

    const gameRequestResponse = await this.gameService.removeGame(meUser, friendUser);
    if (gameRequestResponse.success) {
      this.server.to(meUser.socketId).emit('removeMyGame', { user: friendUser });
      this.server.to(friendUser.socketId).emit('removedByMyGame', { user: meUser });
    } else {
      this.server.to(meUser.socketId).emit('removeGameFailed', { user: friendUser, message: gameRequestResponse.message });
    }
  }

  @SubscribeMessage('gameRequestDeny')
  async gameRequestDeny(frommage: Socket, data: { fromId: number, toId: number }) {
    const from = data.fromId;
    const to = data.toId;

    // Get the sender and receiver from the database
    const toUser = await this.usersRepository.findOne({ where: { id: to } });
    const fromUser = await this.usersRepository.findOne({ where: { id: from } });

    if (!toUser) {
      throw new HttpException('toUser not found', HttpStatus.NOT_FOUND);
    }
    if (!fromUser) {
      throw new HttpException('fromUser not found', HttpStatus.NOT_FOUND);
    }

    // Use your existing accept friend request logic here...
    const gameRequestResponse = await this.gameService.denyRequests(toUser, fromUser);
    if (gameRequestResponse.success) {
      this.server.to(fromUser.socketId).emit('gameRequestFromDeny', { user: toUser });
      this.server.to(toUser.socketId).emit('gameRequestToDeny', { user: fromUser });
    } else {
      this.server.to(to.toString()).emit('gameRequestAcceptFailed', { from: from, message: gameRequestResponse.message });
    }
  }

  @SubscribeMessage('createMessage')
  async create(@MessageBody() infosMessage) {
    const pseudo = infosMessage[0];
    const user = await this.usersRepository.findOne({ where: { pseudo: pseudo } });
    const userId = user.id;
    const message = infosMessage[1];
    let chan = infosMessage[2];
    if (chan === null) {
      chan = "Global Chat";
    }
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const complete_msg = "[" + userId + "][" + pseudo + "][" + timestamp + "] : " + message;
    if (message.startsWith('/')) {
      const nbr_words = message.split(' ').length;
      if ((nbr_words > 2 && (message.split(' ')[0].substr(1) !== "mute" && message.split(' ')[0].substr(1) !== "ban")) || (nbr_words > 3 && (message.split(' ')[0].substr(1) === "mute" || message.split(' ')[0].substr(1) === "ban"))) {
        this.server.to(user.socketId).emit('createMessage', "Bad command : too many arguments.");
        return;
      }
      const command = message.split(' ')[0].substr(1);
      switch (command) {
        case 'invite':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            if (actualChan.isPrivate === true) {
              if (user.id === actualChan.ownerId) {
                const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
                if (userTarget) {
                  const chanUserList = await this.chanUserRepository.find();
                  if (chanUserList) {
                    for (const chanUser of chanUserList) {
                      if (chanUser.chanId === actualChan.id && chanUser.userId === userTarget.id) {
                        this.server.to(user.socketId).emit('createMessage', "Bad command : this user is already invited in this chan.");
                        return;
                      }
                    }
                  }
                  let infosChanUser = { userId: userTarget.id, chanId: actualChan.id, user: userTarget, chan: actualChan, isInChan: false }
                  await this.chanUserRepository.save(infosChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been invited in the channel.`);
                  this.server.to(userTarget.socketId).emit('invitedInChan', actualChan);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : you're not the owner of this chan.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : this channel is not private.");
            }
          }
          break;
        case 'kick':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            const chanUser = await this.chanUserRepository.findOne({ where: { userId: user.id, chanId: actualChan.id } });
            if (user.id === actualChan.ownerId) {
              const userTargetPseudo = message.split(' ')[1];
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: userTargetPseudo } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't kick yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (userTargetChanUser.isInChan === true) {
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been kicked.`);
                  this.server.to(userTarget.socketId).emit('kickChan', actualChan.name);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', `${userTarget.pseudo} is not in chan ${chan}.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else if (chanUser.isAdmin === true) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't kick yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (actualChan.ownerId === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't kick the owner of the channel.");
                  return;
                }
                else if (userTargetChanUser.isAdmin === true) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't kick an admin of the channel with your role.");
                  return;
                }
                if (userTargetChanUser.isInChan === true) {
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been kicked.`);
                  this.server.to(userTarget.socketId).emit('kickChan', actualChan.name);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', `${userTarget.pseudo} is not in chan ${chan}.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not an admin of this chan.");
            }
          }
          break;
        case 'ban':
          if (nbr_words < 3) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const regex = /^[0-9]+$/;
            if (!regex.test(message.split(' ')[2]) || message.split(' ')[2][0] === '0') {
              this.server.to(user.socketId).emit('createMessage', "Bad command : time is not well written.");
              return;
            }
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            const chanUser = await this.chanUserRepository.findOne({ where: { userId: user.id, chanId: actualChan.id } });
            if (user.id === actualChan.ownerId) {
              const userTargetPseudo = message.split(' ')[1];
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: userTargetPseudo } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't ban yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (userTargetChanUser.isBanned === true && userTargetChanUser.banTime > new Date()) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : user is already banned.");
                }
                else {
                  userTargetChanUser.isBanned = true;
                  const timeBan = parseInt(message.split(' ')[2]);
                  userTargetChanUser.banTime = moment().add(timeBan, 'minutes').toDate();
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been banned for ${timeBan} minutes.`);
                  this.server.to(userTarget.socketId).emit('banChan', chan);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else if (chanUser.isAdmin === true) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't ban yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (actualChan.ownerId === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't ban the owner of the channel.");
                  return;
                }
                else if (userTargetChanUser.isAdmin === true) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't ban an admin of the channel with your role.");
                  return;
                }
                if (userTargetChanUser.isBanned === true && userTargetChanUser.banTime > new Date()) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : user is already banned.");
                }
                else {
                  userTargetChanUser.isBanned = true;
                  const timeBan = parseInt(message.split(' ')[2]);
                  userTargetChanUser.banTime = moment().add(timeBan, 'minutes').toDate();
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been banned for ${timeBan} minutes.`);
                  this.server.to(userTarget.socketId).emit('banChan', chan);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not an admin of this chan.");
            }
          }
          break;
        case 'unban':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            const chanUser = await this.chanUserRepository.findOne({ where: { userId: user.id, chanId: actualChan.id } });
            if (user.id === actualChan.ownerId) {
              const userTargetPseudo = message.split(' ')[1];
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: userTargetPseudo } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't unban yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (userTargetChanUser.isBanned === true && userTargetChanUser.banTime > new Date()) {
                  userTargetChanUser.isBanned = false;
                  userTargetChanUser.banTime = null;
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been unbanned.`);
                  this.server.to(userTarget.socketId).emit('createMessage', `You have been unbanned on chan ${chan}.`);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', `You can't unban someone who is not banned.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else if (chanUser.isAdmin === true) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't unban yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (actualChan.ownerId === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't unban the owner of the channel.");
                  return;
                }
                if (userTargetChanUser.isBanned === true && userTargetChanUser.banTime > new Date()) {
                  userTargetChanUser.isBanned = false;
                  userTargetChanUser.banTime = null;
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been unbanned.`);
                  this.server.to(userTarget.socketId).emit('createMessage', `You have been unbanned on chan ${chan}.`);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', `You can't unban someone who is not banned.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not an admin of this chan.");
            }
          }
          break;
        case 'mute':
          if (nbr_words < 3) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const regex = /^[0-9]+$/;
            if (!regex.test(message.split(' ')[2]) || message.split(' ')[2][0] === '0') {
              this.server.to(user.socketId).emit('createMessage', "Bad command : time is not well written.");
              return;
            }
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            const chanUser = await this.chanUserRepository.findOne({ where: { userId: user.id, chanId: actualChan.id } });
            if (user.id === actualChan.ownerId) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't mute yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (userTargetChanUser.isMuted === true && userTargetChanUser.muteTime > new Date()) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : user is already muted.");
                }
                else {
                  userTargetChanUser.isMuted = true;
                  const timeMute = parseInt(message.split(' ')[2]);
                  userTargetChanUser.muteTime = moment().add(timeMute, 'minutes').toDate();
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been muted for ${timeMute} minutes.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else if (chanUser.isAdmin === true) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't mute yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (actualChan.ownerId === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't mute the owner of the channel.");
                  return;
                }
                else if (userTargetChanUser.isAdmin === true) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't mute an admin of the channel with your role.");
                  return;
                }
                if (userTargetChanUser.isMuted === true && userTargetChanUser.muteTime > new Date()) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : user is already muted.");
                }
                else {
                  userTargetChanUser.isMuted = true;
                  const timeMute = parseInt(message.split(' ')[2]);
                  userTargetChanUser.muteTime = moment().add(timeMute, 'minutes').toDate();
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been muted for ${timeMute} minutes.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not an admin of this chan.");
            }
          }
          break;
        case 'unmute':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            const chanUser = await this.chanUserRepository.findOne({ where: { userId: user.id, chanId: actualChan.id } });
            if (user.id === actualChan.ownerId) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't unmute yourself.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (userTargetChanUser.isMuted === true && userTargetChanUser.muteTime > new Date()) {
                  userTargetChanUser.isMuted = false;
                  userTargetChanUser.muteTime = null;
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been unmuted.`);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', `You can't unmute someone who is not muted.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else if (chanUser.isAdmin === true) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                if (user.id === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't unmute yourself.");
                  return;
                }
                if (actualChan.ownerId === userTarget.id) {
                  this.server.to(user.socketId).emit('createMessage', "Bad command : you can't unmute the owner of the channel.");
                  return;
                }
                const userTargetChanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (userTargetChanUser.isMuted === true && userTargetChanUser.muteTime > new Date()) {
                  userTargetChanUser.isMuted = false;
                  userTargetChanUser.muteTime = null;
                  await this.chanUserRepository.save(userTargetChanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} has been unmuted.`);
                }
                else {
                  this.server.to(user.socketId).emit('createMessage', `You can't unmute someone who is not muted.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not an admin of this chan.");
            }
          }
          break;
        case 'addPass':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            if (user.id === actualChan.ownerId) {
              if (actualChan.isPassword === true) {
                this.server.to(actualChan.name).emit('createMessage', "Bad command : there's already a password for this chan.");
              }
              else {
                actualChan.isPassword = true;
                const hashPassword = await bcrypt.hash(message.split(' ')[1], 10);
                actualChan.password = hashPassword;
                await this.channelsRepository.save(actualChan);
                this.server.to(actualChan.name).emit('createMessage', "Password has been added.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not the owner of this chan.");
            }
          }
          break;
        case 'editPass':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            if (user.id === actualChan.ownerId) {
              if (actualChan.isPassword === true) {
                const hashPassword = await bcrypt.hash(message.split(' ')[1], 10);
                actualChan.password = hashPassword;
                await this.channelsRepository.save(actualChan);
                this.server.to(actualChan.name).emit('createMessage', "Password has been changed.");
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : there's no password for this chan.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not the owner of this chan.");
            }
          }
          break;
        case 'deletePass':
          if (nbr_words > 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : too many arguments.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            if (user.id === actualChan.ownerId) {
              if (actualChan.isPassword === true) {
                actualChan.password = null;
                actualChan.isPassword = false;
                await this.channelsRepository.save(actualChan);
                this.server.to(actualChan.name).emit('createMessage', "Password has been deleted");
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : there's already no password for this chan.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not the owner of this chan.");
            }
          }
          break;
        case 'setAdmin':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          if (chan === "Global Chat") {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in the global chat.");
          }
          else if (!isNaN(parseInt(chan.charAt(0)))) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : you're in a mp chan.");
          }
          else {
            const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
            if (user.id === actualChan.ownerId) {
              const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
              if (userTarget) {
                const chanUser = await this.chanUserRepository.findOne({ where: { userId: userTarget.id, chanId: actualChan.id } });
                if (chanUser.isAdmin === true) {
                  this.server.to(user.socketId).emit('createMessage', `Bad command : ${userTarget.pseudo} is already an admin.`);
                }
                else {
                  chanUser.isAdmin = true;
                  await this.chanUserRepository.save(chanUser);
                  this.server.to(actualChan.name).emit('createMessage', `${userTarget.pseudo} is now an admin.`);
                }
              }
              else {
                this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
              }
            }
            else {
              this.server.to(user.socketId).emit('createMessage', "Bad command : you're not the owner of this chan.");
            }
          }
          break;
        case 'block':
          if (nbr_words === 1) {
            this.server.to(user.socketId).emit('createMessage', "Bad command : not enough argument.");
            break;
          }
          const userTarget = await this.usersRepository.findOne({ where: { pseudo: message.split(' ')[1] } })
          if (userTarget) {
            if (user.id === userTarget.id) {
              this.server.to(user.socketId).emit('createMessage', `You can't block yourself.`);
              break;
            }
            const blockUser = await this.usersBlockRepository.findOne({ where: { userId: user.id, userBlockedId: userTarget.id } });
            if (blockUser) {
              if (blockUser.isBlocked === true) {
                blockUser.isBlocked = false;
                await this.usersBlockRepository.save(blockUser);
                this.server.to(user.socketId).emit('unblockUser', userTarget.id);
                this.server.to(user.socketId).emit('createMessage', `You unblocked ${userTarget.pseudo}.`);
              }
              else {
                blockUser.isBlocked = true;
                await this.usersBlockRepository.save(blockUser);
                this.server.to(user.socketId).emit('blockUser', userTarget.id);
                this.server.to(user.socketId).emit('createMessage', `You blocked ${userTarget.pseudo}.`);
              }
            }
            else {
              let block_user = { userId: user.id, userBlockedId: userTarget.id, isBlocked: true }
              await this.usersBlockRepository.save(block_user);
              this.server.to(user.socketId).emit('blockUser', userTarget.id);
              this.server.to(user.socketId).emit('createMessage', `You blocked ${userTarget.pseudo}.`);
            }
          }
          else {
            this.server.to(user.socketId).emit('createMessage', "Bad command : user not found.");
          }
          break;
        default:
          this.server.to(user.socketId).emit('createMessage', "Command not found.");
          break;
      }
    }
    else {
      const isChanMp = /\d/.test(chan);
      if (chan === "Global Chat") {
        const socketsInGlobalChat = await this.server.in("Global Chat").fetchSockets();
        const blockUsersWhoBlockedMe = await this.usersBlockRepository.find({ where: { userBlockedId: user.id, isBlocked: true } })
        if (blockUsersWhoBlockedMe) {
          let bool = false;
          for (const socketInGlobalChat of socketsInGlobalChat) {
            bool = false;
            for (const blockUserWhoBlockedMe of blockUsersWhoBlockedMe) {
              const userWhoBlockedMe = await this.usersRepository.findOne({ where: { id: blockUserWhoBlockedMe.userId } })
              if (socketInGlobalChat.id === userWhoBlockedMe.socketId) {
                bool = true;
              }
            }
            if (bool === false) {
              this.server.to(socketInGlobalChat.id).emit('createMessage', complete_msg);
            }
          }
        }
        else {
          this.server.to("Global Chat").emit('createMessage', complete_msg);
        }
      }
      else if (isChanMp) {
        const actualChanMp = await this.chanMpRepository.findOne({ where: { name: chan } });
        let otherUserId;
        if (actualChanMp.userId === user.id) {
          otherUserId = actualChanMp.userTargetId;
        }
        else {
          otherUserId = actualChanMp.userId;
        }
        const usersWhoBlockedMe = await this.usersBlockRepository.find({ where: { userBlockedId: user.id, isBlocked: true } })
        if (usersWhoBlockedMe) {
          let bool = false;
          for (const userWhoBlockedMe of usersWhoBlockedMe) {
            if (userWhoBlockedMe.userId === otherUserId) {
              bool = true;
            }
          }
          if (bool === false) {
            actualChanMp.messages.push(complete_msg);
            await this.chanMpRepository.save(actualChanMp);
            this.server.to(actualChanMp.name).emit('createMessage', complete_msg);
          }
          else {
            this.server.to(user.socketId).emit('createMessage', "This user blocked you.");
          }
        }
        else {
          actualChanMp.messages.push(complete_msg);
          await this.chanMpRepository.save(actualChanMp);
          this.server.to(actualChanMp.name).emit('createMessage', complete_msg);
        }
      }
      else {
        const actualChan = await this.channelsRepository.findOne({ where: { name: chan } });
        const chanUser = await this.chanUserRepository.findOne({ where: { userId: user.id, chanId: actualChan.id } });
        if (chanUser.isBanned === true) {
          if (chanUser.banTime > new Date()) {
            this.server.to(user.socketId).emit('createMessage', "You are banned from this channel.");
          }
          else {
            chanUser.isBanned = false;
            chanUser.banTime = null;
            await this.chanUserRepository.save(chanUser);
            const socketsInChan = await this.server.in(actualChan.name).fetchSockets();
            const blockUsersWhoBlockedMe = await this.usersBlockRepository.find({ where: { userBlockedId: user.id, isBlocked: true } })
            if (blockUsersWhoBlockedMe) {
              let bool = false;
              for (const socketInChan of socketsInChan) {
                bool = false;
                for (const blockUserWhoBlockedMe of blockUsersWhoBlockedMe) {
                  const userWhoBlockedMe = await this.usersRepository.findOne({ where: { id: blockUserWhoBlockedMe.userId } })
                  if (socketInChan.id === userWhoBlockedMe.socketId) {
                    bool = true;
                  }
                }
                if (bool === false) {
                  this.server.to(socketInChan.id).emit('createMessage', complete_msg);
                }
              }
              actualChan.messages.push(complete_msg);
              await this.channelsRepository.save(actualChan);
            }
            else {
              actualChan.messages.push(complete_msg);
              await this.channelsRepository.save(actualChan);
              this.server.to(actualChan.name).emit('createMessage', complete_msg);
            }
          }
        }
        else if (chanUser.isMuted === true) {
          if (chanUser.muteTime > new Date()) {
            this.server.to(user.socketId).emit('createMessage', "You are muted on this channel.");
          }
          else {
            chanUser.isMuted = false;
            chanUser.muteTime = null;
            await this.chanUserRepository.save(chanUser);
            const socketsInChan = await this.server.in(actualChan.name).fetchSockets();
            const blockUsersWhoBlockedMe = await this.usersBlockRepository.find({ where: { userBlockedId: user.id, isBlocked: true } })
            if (blockUsersWhoBlockedMe) {
              let bool = false;
              for (const socketInChan of socketsInChan) {
                bool = false;
                for (const blockUserWhoBlockedMe of blockUsersWhoBlockedMe) {
                  const userWhoBlockedMe = await this.usersRepository.findOne({ where: { id: blockUserWhoBlockedMe.userId } })
                  if (socketInChan.id === userWhoBlockedMe.socketId) {
                    bool = true;
                  }
                }
                if (bool === false) {
                  this.server.to(socketInChan.id).emit('createMessage', complete_msg);
                }
              }
              actualChan.messages.push(complete_msg);
              await this.channelsRepository.save(actualChan);
            }
            else {
              actualChan.messages.push(complete_msg);
              await this.channelsRepository.save(actualChan);
              this.server.to(actualChan.name).emit('createMessage', complete_msg);
            }
          }
        }
        else {
          const socketsInChan = await this.server.in(actualChan.name).fetchSockets();
          const blockUsersWhoBlockedMe = await this.usersBlockRepository.find({ where: { userBlockedId: user.id, isBlocked: true } })
          if (blockUsersWhoBlockedMe) {
            let bool = false;
            for (const socketInChan of socketsInChan) {
              bool = false;
              for (const blockUserWhoBlockedMe of blockUsersWhoBlockedMe) {
                const userWhoBlockedMe = await this.usersRepository.findOne({ where: { id: blockUserWhoBlockedMe.userId } })
                if (socketInChan.id === userWhoBlockedMe.socketId) {
                  bool = true;
                }
              }
              if (bool === false) {
                this.server.to(socketInChan.id).emit('createMessage', complete_msg);
              }
            }
            actualChan.messages.push(complete_msg);
            await this.channelsRepository.save(actualChan);
          }
          else {
            actualChan.messages.push(complete_msg);
            await this.channelsRepository.save(actualChan);
            this.server.to(actualChan.name).emit('createMessage', complete_msg);
          }
        }
      }
    }
  }

  @SubscribeMessage('newUser')
  async newUser(client: Socket, inputPseudo: string) {
    const user = await this.usersRepository.findOne({ where: { pseudo: inputPseudo } })
    await this.server.emit('newUser', user);
  }

  @SubscribeMessage('leaveChan')
  async leaveChan(client: Socket, chanNameAndPseudo: string) {
    const channel = await this.channelsRepository.findOne({ where: { name: chanNameAndPseudo[0] } });
    const user = await this.usersRepository.findOne({ where: { socketId: client.id } })
    const socketsInChan = await this.server.in(chanNameAndPseudo[0]).fetchSockets();
    if (channel) {
      const chanUser = await this.chanUserRepository.findOne({ where: { chanId: channel.id, userId: user.id, isInChan: false } });
      if (chanUser) {
        await client.leave(chanNameAndPseudo[0]);
        const leaveMessage = chanNameAndPseudo[1] + " has left the chan " + chanNameAndPseudo[0];
        for (const socketInChan of socketsInChan) {
          if (socketInChan.id !== user.socketId) {
            await this.server.to(socketInChan.id).emit('leaveChan', leaveMessage);
            await this.server.to(socketInChan.id).emit('userLeftTheChan', user);
          }
        }
      }
    }
    else if (chanNameAndPseudo[0] === "Global Chat") {
      await client.leave(chanNameAndPseudo[0]);
      const leaveMessage = chanNameAndPseudo[1] + " has left the chan " + chanNameAndPseudo[0];
      await this.server.to(chanNameAndPseudo[0]).emit('leaveChan', leaveMessage);
    }
    else {
      await client.leave(chanNameAndPseudo[0]);
      const leaveMessage = chanNameAndPseudo[1] + " has left the chan " + chanNameAndPseudo[0];
      await this.server.to(chanNameAndPseudo[0]).emit('leaveChan', leaveMessage);
    }
  }

  @SubscribeMessage('leaveChan2')
  async leaveChan2(client: Socket, chanNameAndPseudo: string) {
    const channel = await this.channelsRepository.findOne({ where: { name: chanNameAndPseudo[0] } });
    const user = await this.usersRepository.findOne({ where: { socketId: client.id } })
    const socketsInChan = await this.server.in(chanNameAndPseudo[0]).fetchSockets();
    if (channel) {
      const chanUser = await this.chanUserRepository.findOne({ where: { chanId: channel.id, userId: user.id, isInChan: false } });
      if (chanUser) {
        await client.leave(chanNameAndPseudo[0]);
        for (const socketInChan of socketsInChan) {
          if (socketInChan.id !== user.socketId) {
            await this.server.to(socketInChan.id).emit('userLeftTheChan', user);
          }
        }
      }
    }
    else if (chanNameAndPseudo[0] === "Global Chat") {
      await client.leave(chanNameAndPseudo[0]);
    }
    else {
      await client.leave(chanNameAndPseudo[0]);
    }
  }








  @SubscribeMessage('joinChan')
  async joinChan(client: Socket, chanNameAndPseudo: string) {
    const channel = await this.channelsRepository.findOne({ where: { name: chanNameAndPseudo[0] } });
    const user = await this.usersRepository.findOne({ where: { socketId: client.id } });
    const socketsInChan = await this.server.in(chanNameAndPseudo[0]).fetchSockets();
    if (channel) {
      const chanUser = await this.chanUserRepository.findOne({ where: { chanId: channel.id, userId: user.id, isInChan: true } });
      if (chanUser) {
        user.actualChan = chanNameAndPseudo[0];
        await this.usersRepository.save(user);
        await client.join(chanNameAndPseudo[0]);
        const joinMessage = chanNameAndPseudo[1] + " has joined the chan " + chanNameAndPseudo[0];
        await this.server.to(chanNameAndPseudo[0]).emit('joinChan', joinMessage);
        for (const socketInChan of socketsInChan) {
          if (socketInChan.id !== user.socketId) {
            await this.server.to(socketInChan.id).emit('newUserInChan', user);
          }
        }
      }
    }
    else if (chanNameAndPseudo[0] === "Global Chat") {
      user.actualChan = chanNameAndPseudo[0];
      await this.usersRepository.save(user);
      await client.join(chanNameAndPseudo[0]);
      const joinMessage = chanNameAndPseudo[1] + " has joined the chan " + chanNameAndPseudo[0];
      await this.server.to(chanNameAndPseudo[0]).emit('joinChan', joinMessage);
    }
    else {
      const chanMp = await this.chanMpRepository.findOne({ where: [{ name: chanNameAndPseudo[0], userId: user.id }, { name: chanNameAndPseudo[0], userTargetId: user.id }] });
      if (chanMp) {
        if (chanMp.userId === user.id) {
          chanMp.userIsInChan = true;
          await this.chanMpRepository.save(chanMp);
        }
        else if (chanMp.userTargetId === user.id) {
          chanMp.userTargetIsInChan = true;
          await this.chanMpRepository.save(chanMp);
        }
        user.actualChan = chanNameAndPseudo[0];
        await this.usersRepository.save(user);
        await client.join(chanNameAndPseudo[0]);
        const joinMessage = chanNameAndPseudo[1] + " has joined the chan " + chanNameAndPseudo[0];
        await this.server.to(chanNameAndPseudo[0]).emit('joinChan', joinMessage);
      }
    }
  }



  @SubscribeMessage('joinChan2')
  async joinChan2(client: Socket, chanNameAndPseudo: string) {
    const channel = await this.channelsRepository.findOne({ where: { name: chanNameAndPseudo[0] } });
    const user = await this.usersRepository.findOne({ where: { socketId: client.id } });
    if (channel) {
      const chanUser = await this.chanUserRepository.findOne({ where: { chanId: channel.id, userId: user.id } });
      if (chanUser) {
        chanUser.isInChan = true;
        await this.chanUserRepository.save(chanUser);
        user.actualChan = chanNameAndPseudo[0];
        await this.usersRepository.save(user);
        await client.join(chanNameAndPseudo[0]);
        await this.server.to(user.socketId).emit('backInChan');
      }
    }
    else if (chanNameAndPseudo[0] === "Global Chat") {
      user.actualChan = chanNameAndPseudo[0];
      await this.usersRepository.save(user);
      await client.join(chanNameAndPseudo[0]);
    }
    else {
      const chanMp = await this.chanMpRepository.findOne({ where: [{ name: chanNameAndPseudo[0], userId: user.id }, { name: chanNameAndPseudo[0], userTargetId: user.id }] });
      if (chanMp) {
        if (chanMp.userId === user.id) {
          chanMp.userIsInChan = true;
          await this.chanMpRepository.save(chanMp);
        }
        else if (chanMp.userTargetId === user.id) {
          chanMp.userTargetIsInChan = true;
          await this.chanMpRepository.save(chanMp);
        }
        user.actualChan = chanNameAndPseudo[0];
        await this.usersRepository.save(user);
        await client.join(chanNameAndPseudo[0]);
      }
    }
  }

  @SubscribeMessage('newChan')
  async newChan(client: Socket, chanName: string) {
    const channel = await this.channelsRepository.findOne({ where: { name: chanName } })
    this.server.emit('newChan', channel);
  }

  @SubscribeMessage('changePseudo')
  async changePseudo(client: Socket) {
    const user = await this.usersRepository.findOne({ where: { socketId: client.id } })
    if (!user)
      return ;
    this.server.emit('changePseudo', user.id, user.pseudo);
  }

  @SubscribeMessage('matchMaking')
  async handleJoinMatchMaking(client: Socket, data: { userId: number }): Promise<void> {
    const userId = data.userId;
    const user = {
      id: userId,
      socketId: client.id
    };
    const rep = await this.gameService.lfGameInviteAccepted(userId);
    if (rep) {
      client.emit('alreadyAcceptedAGame', rep);
      return;
    }
    if (!this.queue.find(u => u.id === user.id)) {
      this.queue.push(user);
    }
    this.checkQueue();
  }

  private async checkQueue() {
    if (this.queue.length >= 2) {
      const user1 = this.queue.shift();
      const user2 = this.queue.shift();

      const gameInvite = await this.gameService.createGameInvite(user1.id, user2.id);
      if (gameInvite.success) {
        this.server.to(user1.socketId).emit('gameInviteCreated', gameInvite.gameRequest.id);
        this.server.to(user2.socketId).emit('gameInviteCreated', gameInvite.gameRequest.id);
      }
    }
  }

  @SubscribeMessage('connectGameRoom')
  async handleJoinGame(client: Socket, data: { myPseudoId: number, gameId: number }): Promise<void> {
    const pseudoId = data.myPseudoId;
    const gameId = data.gameId;
    const gameChan = gameId.toString();

    let user = await this.usersRepository.findOne({ where: { id: pseudoId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const gameInvite = await this.gameRequestRepository.findOne({
      where: { id: gameId, status: 'accepted' },
      relations: ['creator', 'receiver']
    });
    if (!gameInvite) {
      if (!this.games[gameId]) {
        return;
      }
    }

    let isCreator = false;
    if (pseudoId === gameInvite.creatorId)
      isCreator = true;

    if (isCreator || (pseudoId === gameInvite.receiverId)) {
      if (!this.games[gameId]) {
        this.games[gameId] = {
          count: 0,
          countSpec: 0,
          player1: gameInvite.creatorId,
          player2: gameInvite.receiverId,
          joinedSockets: new Set(),
          spectatorSockets: new Set(),
          playerOptions: null,
          selectedPlayerId: null,
          playerIds: new Set(),
        };
        this.games[gameId].playerIds.add(gameInvite.creatorId);
        this.games[gameId].playerIds.add(gameInvite.receiverId);
      }
      if (!this.games[gameId].joinedSockets.has(client.id)) {
        client.join(gameChan);
        this.games[gameId].count += 1;

        this.games[gameId].joinedSockets.add(client.id);
        if (this.games[gameId].gameInstance) {
          if (this.games[gameId].paused) {
            this.server.to(gameId.toString()).emit('gameStart', {});
            const selectedOptions = this.games[gameId].playerOptions[pseudoId];
            this.server.to(gameId.toString()).emit('gameOptions', selectedOptions);
            let countDown = 5;
            const countDownInterval = setInterval(() => {
              this.server.to(gameId.toString()).emit('countDown', countDown);
              countDown--;
              if (countDown === 0) {
                this.games[gameId].paused = false;
                clearInterval(countDownInterval);
              }
            }, 1000);
          }
        }
      }
      this.server.to(gameChan).emit('player count', this.games[gameId].count);
      this.server.to(gameChan).emit('spec count', this.games[gameId].countSpec);
      this.server.to(gameChan).emit('createGameMessage', `${user.pseudo}(${pseudoId}) joigned game as player.`);
      this.server.to(gameChan).emit('userJoinGame');
      return;

    }
    if (!this.games[gameId]) {
      return;
    }
    if (!this.games[gameId].spectatorSockets.has(client.id)) {
      this.games[gameId].spectatorSockets.add(client.id);
      this.games[gameId].countSpec++;
      this.server.to(gameChan).emit('createGameMessage', `${user.pseudo}(${pseudoId}) joigned game as spectator.`);
    }
    client.join(gameChan);
    if (this.games[gameId].gameInstance)
      this.server.to(client.id).emit('gameStart', {});
    this.server.to(gameChan).emit('player count', this.games[gameId].count);
    this.server.to(gameChan).emit('spec count', this.games[gameId].countSpec);
  }

  getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  @SubscribeMessage('startGame')
  async handleStartGame(client: Socket, data: { myPseudoId: number, gameId: number, mapStyle: string, gameplayStyle: string }) {
    const gameId = data.gameId;
    const userId = data.myPseudoId;
    const mapStyle = data.mapStyle;
    const gameplayStyle = data.gameplayStyle;

    let user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (this.games[gameId]) {
      if (!this.games[gameId].playerOptions) {
        this.games[gameId].playerOptions = { mapStyle: null, gameplayStyle: null };
      }
      this.games[gameId].playerOptions[userId] = { mapStyle, gameplayStyle };
      if (!this.games[gameId].readyPlayers) {
        this.games[gameId].readyPlayers = new Set();
      }
      this.games[gameId].readyPlayers.add(client.id);
      this.server.to(gameId.toString()).emit('createGameMessage', `${user.pseudo}(${userId}) is ready. He choose this options: mapstyle: ${mapStyle}, ${gameplayStyle} `);

      if (this.games[gameId].readyPlayers.size === 2) {
        const playerIds = Array.from(this.games[gameId].playerIds);
        const selectedPlayerId = this.getRandomItem(playerIds);
        this.games[gameId].selectedPlayerId = selectedPlayerId;
        const selectedOptions = this.games[gameId].playerOptions[selectedPlayerId];
        this.server.to(gameId.toString()).emit('gameOptions', selectedOptions);


        this.server.to(gameId.toString()).emit('gameStart', {});
        if (!this.games[gameId].gameInstance) {
          this.server.emit('isInGame', this.games[gameId].player1, gameId);
          this.server.emit('isInGame', this.games[gameId].player2, gameId);
          this.games[gameId].gameInstance = new GameClass(selectedOptions.gameplayStyle);
          this.games[gameId].paused = true;
        }
        let countDown = 5;
        const countDownInterval = setInterval(() => {
          this.server.to(gameId.toString()).emit('countDown', countDown);
          countDown--;
          if (countDown === 0) {
            if (this.games[gameId])
              this.games[gameId].paused = false;
            clearInterval(countDownInterval);
          }
        }, 1000);
      }

    }
  }

  @SubscribeMessage('paddleMove')
  handlePlayerMove(client: Socket, data: { gameId: number, playerId: number; direction: 'up' | 'down' }) {
    const gameId = data.gameId;
    const gameData = this.games[gameId];
    if (gameData) {

      const game = gameData.gameInstance;
      if (!game)
        return;
      if (data.playerId === this.games[gameId].player1) {

        game.player1Move(data.direction);
      } else if (data.playerId === this.games[gameId].player2) {

        game.player2Move(data.direction);
      }
    }
  }

  @SubscribeMessage('handleForfeit')
  async handleForfeit(client: Socket, data: { gameId: number, myPseudoId: number }) {
    const gameId = data.gameId;
    const playerId = data.myPseudoId;
    const gameData = this.games[gameId];
    if (gameData) {
      const game = gameData.gameInstance;
      if (!game) {
        let player1Score = 0;
        let player2Score = 0;
        let winner = 0;
        if (gameData.player1 === playerId) {
          player1Score = 3;
          player2Score = 0;
          winner = 1;
        }
        else {
          player1Score = 0;
          player2Score = 3;
          winner = 2;
        }

        this.gameService.endGame(gameId.toString(), gameData.player1, gameData.player2, player1Score, player2Score);
        this.gameService.finishGameInvite(gameId);
        if (winner === 2) {

          let user = await this.usersRepository.findOne({ where: { id: gameData.player1 } })
          if (user)
            this.server.to(gameId.toString()).emit('gameOver', { winner: user.pseudo });
          else
            this.server.to(gameId.toString()).emit('gameOver', { winner: "" });
        }
        else {

          let user = await this.usersRepository.findOne({ where: { id: gameData.player2 } })
          if (user)
            this.server.to(gameId.toString()).emit('gameOver', { winner: user.pseudo });
          else
            this.server.to(gameId.toString()).emit('gameOver', { winner: "" });
        }
        delete this.games[gameId];
        this.server.to(client.id).emit('redirectToHome');
      }
      else {
        game.paused = true;
        let player1Score = 0;
        let player2Score = 0;
        let winner = 0;
        if (gameData.player1 === playerId) {
         
          player1Score = 3;
          player2Score = 0;
          winner = 1;
        }
        else {
          
          player1Score = 0;
          player2Score = 3;
          winner = 2;
        }

        this.gameService.endGame(gameId.toString(), gameData.player1, gameData.player2, player2Score , player1Score);
        this.gameService.finishGameInvite(gameId);
        if (winner === 2) {
          
          let user = await this.usersRepository.findOne({ where: { id: gameData.player1 } })
          if (user)
          {
            this.server.to(gameId.toString()).emit('gameOver', { winner: user.pseudo });
          }
          else
          {
            this.server.to(gameId.toString()).emit('gameOver', { winner: "" });
          }
        }
        else {
         
          let user = await this.usersRepository.findOne({ where: { id: gameData.player2 } })
          if (user)
          {
            this.server.to(gameId.toString()).emit('gameOver', { winner: user.pseudo });
          }
          else
          {
            this.server.to(gameId.toString()).emit('gameOver', { winner: "" });
          }
        }
        delete this.games[gameId];
        this.server.to(client.id).emit('redirectToHome');
      }
    }

  }

  @SubscribeMessage('endGame')
  handleEndGame(client: Socket, data: { gameId: number, playerId: number }) {
    const gameId = data.gameId;
    const playerId = data.playerId;
    const gameData = this.games[gameId];
    if (gameData) {
      gameData.joinedSockets.delete(client.id);
      gameData.count -= 1;
      if (gameData.count === 0) {
        if (gameData.paused)
          this.games[gameId].paused = true;
        this.server.emit('isntInGame', this.games[gameId].player1);
        this.server.emit('isntInGame', this.games[gameId].player2);
        this.server.to(gameId.toString()).emit('gameOver', { winner: "No one, game was abandoned." });
        delete this.games[gameId];
      } else {
        gameData.paused = true;
        this.server.to(gameId.toString()).emit('gamePaused', { message: `Player ${playerId} has left the game.` });
      }
    }
  }

  onModuleInit() {
    setInterval(() => this.tick(), 1000 / 60);
  }


  async tick() {

    for (const gameId in this.games) {
      const gameData = this.games[gameId];

      if (gameData.gameInstance && gameData.paused) {
        this.server.to(gameId).emit('gameUpdate', gameData.gameInstance.getState());
      }
      if (gameData && gameData.gameInstance && !gameData.paused) {
        const game = gameData.gameInstance;
        game.update();
        this.server.to(gameId).emit('gameUpdate', game.getState());
        const winner = game.getWinner();
        if (winner !== null && !gameData.paused) {

          gameData.paused = true;
          this.gameService.endGame(gameId, gameData.player1, gameData.player2, game.player1Score, game.player2Score);
          this.gameService.finishGameInvite(parseInt(gameId));
          if (winner === 1) {

            let user = await this.usersRepository.findOne({ where: { id: gameData.player1 } })
            if (user) {
              this.server.to(gameId.toString()).emit('gameOver', { winner: user.pseudo });
            }
            else {
              this.server.to(gameId.toString()).emit('gameOver', { winner: "" });
            }
          }
          else if (winner === 2) {

            let user = await this.usersRepository.findOne({ where: { id: gameData.player2 } })
            if (user) {
              this.server.to(gameId.toString()).emit('gameOver', { winner: user.pseudo });
            }
            else {
              this.server.to(gameId.toString()).emit('gameOver', { winner: "" });
            }
          }

          this.server.emit('isntInGame', gameData.player1);
          this.server.emit('isntInGame', gameData.player2);

          delete this.games[gameId];
        }
      }
    }
  }

}