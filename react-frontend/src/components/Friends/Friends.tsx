import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../Api/api";
import PseudoAddedContext from "../../context/PseudoAddedContext";
import '../../assets/global.css';
import '../../assets/friends.css';
import SocketContext from '../../context/SocketContext';
import MyPseudoIdContext from '../../context/MyPseudoIdContext';
import ShowChatContext from "../../context/ShowChatContext";

type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean; gameId: number };
interface FriendsProps {
    setShowFriends: React.Dispatch<React.SetStateAction<boolean>>;
}

const Friends: React.FC<FriendsProps> = ({ setShowFriends }) => {
    const [messages, setMessages] = useState<string>("");
    const { pseudoAdded, setPseudoAdded } = useContext(PseudoAddedContext);
    const navigate = useNavigate();
    const [userlist, setUserlist] = useState<User[]>([]);
    //Friends
    const [friends, setFriends] = useState<User[]>([]);
    const [requestsSent, setRequestsSent] = useState<User[]>([]);
    const [requestsReceived, setRequestsReceived] = useState<User[]>([]);
    //Game Invite
    const [requestsGSent, setRequestsGSent] = useState<User[]>([]);
    const [requestsGReceived, setRequestsGReceived] = useState<User[]>([]);
    //
    const { socket } = useContext(SocketContext);

    const [Users, setUsers] = useState<User[]>([]);
    const { myPseudoId } = useContext(MyPseudoIdContext);
    const [activeTab, setActiveTab] = useState('Users');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [avatarSrc, setAvatarSrc] = useState('');
    const { showChat, setShowChat } = useContext(ShowChatContext);

    const closeFriends = () => {
        setShowFriends(false);
    };

    const fetchUserPseudo = useCallback(async () => {
        try {
            const response = await api.get("/users/user");
            setPseudoAdded(response.data.user.pseudo !== null);
            if (response.data.user.pseudo === null) navigate('/');
        } catch {
            console.log("Friends fetchUserPseudo");
        }
    }, [setPseudoAdded, navigate]);

    const fetchUserlist = useCallback(async () => {
        const response = await api.get("/users/userlist");
        const userList: User[] = response.data.map((user: User) => ({
            pseudo: user.pseudo,
            isConnected: user.isConnected,
            isInGame: user.isInGame,
            id: user.id,
        }))
        setUserlist(userList);
    }, []);

    const fetchUserFriendlist = useCallback(async () => {
        const response = await api.get("/friends/myFriends");
        if (response.data.success) {
            const userList: User[] = response.data.friendslist.map((user: User) => ({
                pseudo: user.pseudo,
                isConnected: user.isConnected,
                isInGame: user.isInGame,
                id: user.id,
            }))
            setFriends(userList);
        }
    }, []);

    const fetchRequestsSent = useCallback(async () => {
        try {
            const response = await api.get("/friends/getMyRequestsSent");
            if (response.data.success) {
                const userList: User[] = response.data.userlist.map((user: User) => ({
                    pseudo: user.pseudo,
                    isConnected: user.isConnected,
                    isInGame: user.isInGame,
                    id: user.id,
                }));
                setRequestsSent(userList);
            }
          } catch (error) {
            console.log("fetchRequestsSent");
          }

    }, []);

    const fetchRequestsReceived = useCallback(async () => {
        const response = await api.get("/friends/getMyRequestsReceived");
        if (response.data.success) {
            const userList: User[] = response.data.userlist.map((user: User) => ({
                pseudo: user.pseudo,
                isConnected: user.isConnected,
                isInGame: user.isInGame,
                id: user.id,
            }))
            setRequestsReceived(userList);
        }
    }, []);

    const fetchRequestsGSent = useCallback(async () => {
        const response = await api.get("/game/getMyRequestsSent");
        if (response.data.success) {
            const userList: User[] = response.data.userlist.map((user: User) => ({
                pseudo: user.pseudo,
                isConnected: user.isConnected,
                isInGame: user.isInGame,
                id: user.id,
            }));
            setRequestsGSent(userList);
        }
    }, []);

    const fetchRequestsGReceived = useCallback(async () => {
        const response = await api.get("/game/getMyRequestsReceived");
        if (response.data.success) {
            const userList: User[] = response.data.userlist.map((user: User) => ({
                pseudo: user.pseudo,
                isConnected: user.isConnected,
                isInGame: user.isInGame,
                id: user.id,
            }))
            setRequestsGReceived(userList);
        }
    }, []);

    useEffect(() => {
        fetchRequestsGSent();
        fetchRequestsGReceived();
        fetchUserPseudo();
        fetchUserFriendlist();
        fetchUserlist();
        fetchRequestsSent();
        fetchRequestsReceived();
    }, [fetchUserPseudo, fetchUserFriendlist, fetchUserlist, fetchRequestsSent, fetchRequestsReceived, fetchRequestsGReceived, fetchRequestsGSent]);

    useEffect(() => {
        setUsers(userlist.filter(user => user.id !== myPseudoId && !friends.find(friend => friend.pseudo === user.pseudo)));
    }, [userlist, friends, myPseudoId]);

    useEffect(() => {
        if (!socket) return;


        socket?.on('newUser', (newUser) => {
            setUserlist(prevUsers => [...prevUsers, newUser])
        })

        socket?.on('userReconnected', (user) => {
            setUserlist(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.pseudo === user.pseudo) {
                        return {
                            ...userInList,
                            isConnected: true,
                        };
                    }
                    return userInList;
                });
            });
            setFriends(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.pseudo === user.pseudo) {
                        return {
                            ...userInList,
                            isConnected: true,
                        };
                    }
                    return userInList;
                });
            });
        })

        socket?.on('userDisconnected', (user) => {
            setUserlist(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.pseudo === user.pseudo) {
                        return {
                            ...userInList,
                            isConnected: false,
                        };
                    }
                    return userInList;
                });
            });
            setFriends(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.pseudo === user.pseudo) {
                        return {
                            ...userInList,
                            isConnected: false,
                        };
                    }
                    return userInList;
                });
            });
        })
        socket?.on('isInGame', (userId, gameId) => {

            setUserlist(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.id === userId) {
                        return {
                            ...userInList,
                            isInGame: true,
                            gameId: gameId,
                        };
                    }
                    return userInList;
                });
            });
            setFriends(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.id === userId) {
                        return {
                            ...userInList,
                            isInGame: true,
                            gameId: gameId,
                        };
                    }
                    return userInList;
                });
            });
        })

        socket?.on('isntInGame', (userId) => {

            setUserlist(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.id === userId) {
                        return {
                            ...userInList,
                            isInGame: false,
                        };
                    }
                    return userInList;
                });
            });
            setFriends(prevUserlist => {
                return prevUserlist.map((userInList) => {
                    if (userInList.id === userId) {
                        return {
                            ...userInList,
                            isInGame: false,
                        };
                    }
                    return userInList;
                });
            });
        })

        socket?.on('changePseudo', (userId, userPseudo) => {
            setUserlist(prevUserlist => {
                return prevUserlist.map(user => {
                    if (user.id === userId) {
                        return { ...user, pseudo: userPseudo };
                    }
                    return user;
                });
            });
            setFriends(prevUserlist => {
                return prevUserlist.map(user => {
                    if (user.id === userId) {
                        return { ...user, pseudo: userPseudo };
                    }
                    return user;
                });
            });
            setRequestsReceived(prevUserlist => {
                return prevUserlist.map(user => {
                    if (user.id === userId) {
                        return { ...user, pseudo: userPseudo };
                    }
                    return user;
                });
            });
            setRequestsGSent(prevUserlist => {
                return prevUserlist.map(user => {
                    if (user.id === userId) {
                        return { ...user, pseudo: userPseudo };
                    }
                    return user;
                });
            });
            setRequestsGReceived(prevUserlist => {
                return prevUserlist.map(user => {
                    if (user.id === userId) {
                        return { ...user, pseudo: userPseudo };
                    }
                    return user;
                });
            });
            setRequestsSent(prevUserlist => {
                return prevUserlist.map(user => {
                    if (user.id === userId) {
                        return { ...user, pseudo: userPseudo };
                    }
                    return user;
                });
            });


        });

    }, [socket]);

    // Friend Request
    const friendRequestFromAccepted = useCallback(({ user }: { user: User }) => {
        setRequestsReceived(requestsReceived.filter(request => request.id !== user.id));
        setFriends([...friends, user]);
    }, [setRequestsReceived, setFriends, friends, requestsReceived]);

    const friendRequestFromDeny = useCallback(({ user }: { user: User }) => {
        setRequestsReceived(requestsReceived.filter(request => request.id !== user.id));
    }, [setRequestsReceived, requestsReceived]);


    const friendRequestToAccepted = useCallback(({ user }: { user: User }) => {
        setRequestsSent(requestsSent.filter(request => request.id !== user.id));
        setFriends([...friends, user]);
    }, [setRequestsSent, setFriends, friends, requestsSent]);

    const friendRequestToDeny = useCallback(({ user }: { user: User }) => {
        setRequestsSent(requestsSent.filter(request => request.id !== user.id));
    }, [setRequestsSent, requestsSent]);

    const friendRequestReceived = useCallback(({ user }: { user: User }) => {
        setRequestsReceived([...requestsReceived, user]);
    }, [setRequestsReceived, requestsReceived]);

    const friendRequestReceivedFrom = useCallback(({ user }: { user: User }) => {
        setRequestsSent([...requestsSent, user]);
    }, [setRequestsSent, requestsSent]);

    //Remove Friend
    const removeMyFriend = useCallback(({ user }: { user: User }) => {
        setFriends(friends.filter(friend => friend.id !== user.id));
    }, [setFriends, friends]);

    const removedByMyFriend = useCallback(({ user }: { user: User }) => {
        setFriends(friends.filter(friend => friend.id !== user.id));
    }, [setFriends, friends]);

    //Game Request
    const gameRequestFromAccepted = useCallback(({ user, gameId }: { user: User, gameId: number }) => {
        setRequestsGReceived(requestsReceived.filter(request => request.id !== user.id));
        navigate(`/game/${gameId}`);
        setShowFriends(false);
        if (showChat) {
            setShowChat(!showChat);
        }
    }, [setRequestsGReceived, navigate, requestsReceived, setShowChat, setShowFriends, showChat]);

    const gameRequestFromDeny = useCallback(({ user }: { user: User }) => {
        setRequestsGReceived(requestsGReceived.filter(request => request.id !== user.id));
    }, [setRequestsGReceived, requestsGReceived]);


    const gameRequestToAccepted = useCallback(({ user, gameId }: { user: User, gameId: number }) => {
        setRequestsGSent(requestsGSent.filter(request => request.id !== user.id));
        navigate(`/game/${gameId}`);
        setShowFriends(false);
        if (showChat) {
            setShowChat(!showChat);
        }
    }, [setRequestsGSent, requestsGSent, navigate, setShowChat, setShowFriends, showChat]);

    const gameRequestToDeny = useCallback(({ user }: { user: User }) => {
        setRequestsGSent(requestsGSent.filter(request => request.id !== user.id));
    }, [setRequestsGSent, requestsGSent]);

    const gameRequestReceived = useCallback(({ user }: { user: User }) => {
        setRequestsGReceived([...requestsGReceived, user]);
    }, [setRequestsGReceived, requestsGReceived]);

    const gameRequestReceivedFrom = useCallback(({ user }: { user: User }) => {
        setRequestsGSent([...requestsGSent, user]);
    }, [setRequestsGSent, requestsGSent]);

    const gameRequestAcceptFailed = useCallback(({ message }: { message: string }) => {
        setMessages(message);
    }, [setMessages]);

    useEffect(() => {
        //Friend Request
        socket?.on('friendRequestFromAccepted', friendRequestFromAccepted);
        socket?.on('friendRequestToAccepted', friendRequestToAccepted);
        socket?.on('friendRequestFromDeny', friendRequestFromDeny);
        socket?.on('friendRequestToDeny', friendRequestToDeny);
        socket?.on('friendRequestReceived', friendRequestReceived);
        socket?.on('friendRequestReceivedFrom', friendRequestReceivedFrom);
        //Game Request
        socket?.on('gameRequestFromAccepted', gameRequestFromAccepted);
        socket?.on('gameRequestToAccepted', gameRequestToAccepted);
        socket?.on('gameRequestFromDeny', gameRequestFromDeny);
        socket?.on('gameRequestToDeny', gameRequestToDeny);
        socket?.on('gameRequestReceived', gameRequestReceived);
        socket?.on('gameRequestReceivedFrom', gameRequestReceivedFrom);
        socket?.on('gameRequestAcceptFailed', gameRequestAcceptFailed);

        socket?.on('usersUpdated', setUserlist);
        socket?.on('removeMyFriend', removeMyFriend);
        socket?.on('removedByMyFriend', removedByMyFriend);

        return () => {
            socket?.off('friendRequestFromAccepted', friendRequestFromAccepted);
            socket?.off('friendRequestToAccepted', friendRequestToAccepted);
            socket?.off('friendRequestFromDeny', friendRequestFromDeny);
            socket?.off('friendRequestToDeny', friendRequestToDeny);
            socket?.off('friendRequestReceived', friendRequestReceived);
            socket?.off('friendRequestReceivedFrom', friendRequestReceivedFrom);

            socket?.off('gameRequestFromAccepted', gameRequestFromAccepted);
            socket?.off('gameRequestToAccepted', gameRequestToAccepted);
            socket?.off('gameRequestFromDeny', gameRequestFromDeny);
            socket?.off('gameRequestToDeny', gameRequestToDeny);
            socket?.off('gameRequestReceived', gameRequestReceived);
            socket?.off('gameRequestReceivedFrom', gameRequestReceivedFrom);

            socket?.off('removeMyFriend', removeMyFriend);
            socket?.off('removedByMyFriend', removedByMyFriend);
            socket?.off('usersUpdated', setUserlist);
        };

    }, [socket, friends, requestsSent, requestsReceived, gameRequestAcceptFailed, friendRequestFromAccepted, friendRequestToAccepted, friendRequestReceived, friendRequestReceivedFrom, friendRequestFromDeny, friendRequestToDeny, gameRequestFromAccepted, gameRequestFromDeny, gameRequestReceived, gameRequestReceivedFrom, gameRequestToAccepted, gameRequestToDeny, removeMyFriend, removedByMyFriend]);

    //Friend Request
    const handleSendFriendRequest = (to: User) => {
        socket?.emit('friendRequestSent', { fromId: myPseudoId, toId: to.id });
    };

    const handleAcceptFriendRequest = (to: User) => {
        socket?.emit('friendRequestAccepted', { fromId: myPseudoId, toId: to.id });
    };
    const handleDenyFriendRequest = (to: User) => {
        socket?.emit('friendRequestDeny', { fromId: myPseudoId, toId: to.id });
    };

    //Game Request
    const handleSendGameRequest = (to: User) => {
        socket?.emit('gameRequestSent', { fromId: myPseudoId, toId: to.id });
    };

    const handleAcceptGameRequest = (to: User) => {
        socket?.emit('gameRequestAccepted', { fromId: myPseudoId, toId: to.id });
    };
    const handleDenyGameRequest = (to: User) => {
        socket?.emit('gameRequestDeny', { fromId: myPseudoId, toId: to.id });
    };

    const handleRemoveFriend = (friend: User) => {
        socket?.emit('removeFriend', { myId: myPseudoId, friendId: friend.id });
    };

    const handleUserClick = (user: User) => {
        if (selectedUserId === user.id) {

            setSelectedUserId(null);
        } else {

            fetchAvatar(user.id);
            setSelectedUserId(user.id);
        }
    };

    const fetchAvatar = useCallback(async (userId: number) => {
        const response = await api.get(`/users/avatar/${userId}`, { responseType: 'blob' });
        const objectURL = URL.createObjectURL(response.data);
        setAvatarSrc(objectURL);
    }, [setAvatarSrc]);

    const handleSpectateGame = (friend: User) => {
        if (friend.isInGame)
            navigate(`/game/${friend.gameId}`)
    };

    const handleProfileClick = () => {
        if (showChat) {
            setShowChat(!showChat);
        }
        setShowFriends(false);
    }

    return pseudoAdded ? (
        <div className="sidebar">
            <div className="button-container">
                <button
                    onClick={() => setActiveTab('Users')}
                    className={activeTab === 'Users' ? 'active' : ''}
                >
                    Users
                </button>
                <button
                    onClick={() => setActiveTab('friends')}
                    className={activeTab === 'friends' ? 'active' : ''}
                >
                    Friends
                </button>
                <button
                    onClick={() => setActiveTab('reqSent')}
                    className={activeTab === 'reqSent' ? 'active' : ''}
                >
                    My request
                </button>
                <button
                    onClick={() => setActiveTab('reqReceived')}
                    className={activeTab === 'reqReceived' ? 'active' : ''}
                >
                    Their requests
                </button>
            </div>
            <div className="content">
                {activeTab === 'Users' && (
                    <div className="menu-section">
                        <ul>
                            {Users.map((nonFriend, index) => (
                                <li key={index}>
                                    <div
                                        className="user-item"
                                        onClick={() => handleUserClick(nonFriend)}
                                    >
                                        {nonFriend.pseudo} -{' '}
                                        {nonFriend.isInGame
                                            ? 'In game'
                                            : nonFriend.isConnected
                                                ? 'Connected'
                                                : 'Disconnected'}
                                    </div>

                                    {selectedUserId === nonFriend.id && (
                                        <div className="user-info">
                                            <h2><Link to={`/profile/${nonFriend.id}`} className="link-profile" onClick={handleProfileClick}>{nonFriend.pseudo}</Link> </h2>
                                            <img src={avatarSrc} alt="avatar" />
                                            <p>Is Connected: {nonFriend.isConnected ? 'Yes' : 'No'}</p>
                                            <p>Is in Game: {nonFriend.isInGame ? 'Yes' : 'No'}</p>
                                            {nonFriend.isInGame && (
                                                <button onClick={() => handleSpectateGame(nonFriend)}>Spectate</button>
                                            )}
                                            {!requestsSent.find(
                                                (request) => request.pseudo === nonFriend.pseudo
                                            ) &&
                                                !requestsReceived.find(
                                                    (request) => request.pseudo === nonFriend.pseudo
                                                ) && (
                                                    <button
                                                        onClick={() => handleSendFriendRequest(nonFriend)}
                                                    >
                                                        Add Friend
                                                    </button>
                                                )}

                                            <button onClick={() => setSelectedUserId(null)}>Close</button>
                                        </div>

                                    )}
                                </li>
                            ))}
                        </ul>

                        <button className="last-row" onClick={closeFriends}>Close</button>

                    </div>
                )}
                {activeTab === 'friends' && (
                    <div className="menu-section">
                        <ul>
                            {friends.map((friend, index) => (
                                <li key={index}>
                                    <div
                                        className="user-item"
                                        onClick={() => handleUserClick(friend)}
                                    >{friend.pseudo} -{' '}
                                        {friend.isInGame
                                            ? 'In game'
                                            : friend.isConnected
                                                ? 'Connected'
                                                : 'Disconnected'}</div>

                                    {selectedUserId === friend.id && (
                                        <div className="user-info">
                                            <h2><Link to={`/profile/${friend.id}`} className="link-profile" onClick={handleProfileClick}>{friend.pseudo}</Link> </h2>
                                            <img src={avatarSrc} alt="avatar" />
                                            <p>Is Connected: {friend.isConnected ? 'Yes' : 'No'}</p>
                                            <p>Is in Game: {friend.isInGame ? 'Yes' : 'No'}</p>

                                            {friend.isInGame && (
                                                <button onClick={() => handleSpectateGame(friend)}>Spectate</button>
                                            )}

                                            <button onClick={() => handleRemoveFriend(friend)}>
                                                Remove Friend
                                            </button>
                                            <button onClick={() => handleSendGameRequest(friend)}>Invite to a game</button>
                                            <button onClick={() => setSelectedUserId(null)}>Close</button>
                                        </div>
                                    )}

                                </li>
                            ))}
                        </ul>
                        <button className="last-row" onClick={closeFriends}>Close</button>
                    </div>

                )}
                {activeTab === 'reqSent' && (
                    <div className="menu-section">
                        <div>

                            <h2>my friends requets:</h2>
                            <ul>
                                {requestsSent.map((reqSent, index) => (
                                    <li key={index}>{reqSent.pseudo}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h2>my games requests:</h2>
                            <ul>
                                {requestsGSent.map((reqSentG, index) => (
                                    <li key={index}>{reqSentG.pseudo}</li>
                                ))}
                            </ul>
                        </div>
                        <button className="last-row" onClick={closeFriends}>Close</button>

                    </div>
                )}
                {activeTab === 'reqReceived' && (
                    <div className="menu-section">

                        <div>
                            <h2>their friends requets:</h2>
                            <ul>
                                {requestsReceived.map((reqRec, index) => (
                                    <li key={index}>
                                        {reqRec.pseudo}
                                        <button onClick={() => handleAcceptFriendRequest(reqRec)}>
                                            Accept
                                        </button>
                                        <button onClick={() => handleDenyFriendRequest(reqRec)}>
                                            Deny
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h2>their games requets:</h2>
                            <ul>
                                {requestsGReceived.map((reqRecG, index) => (
                                    <li key={index}>
                                        {reqRecG.pseudo}
                                        <button onClick={() => handleAcceptGameRequest(reqRecG)}>
                                            Accept
                                        </button>
                                        <button onClick={() => handleDenyGameRequest(reqRecG)}>
                                            Deny
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {messages}
                        </div>
                        <button className="last-row" onClick={closeFriends}>Close</button>
                    </div>
                )}



            </div>

        </div>
    ) : (
        <div />
    );
};

export default Friends;