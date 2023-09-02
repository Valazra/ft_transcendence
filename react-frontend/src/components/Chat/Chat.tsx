import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import '../../assets/global.css';
import '../../assets/chat.css';
import MessageInput from "./MessageInput";
import Messages from "./Messages";
import PseudoAddedContext from "../../context/PseudoAddedContext";
import SocketContext from '../../context/SocketContext';
import { useNavigate } from "react-router-dom";
import api from "../../Api/api";
import axios from "axios";
import Userlist from "./Userlist";
import MessageContext from '../../context/MessagesContext';
import MyPseudoContext from "../../context/MyPseudoContext";
import ActualChanContext from "../../context/ActualChanContext";
import PrevMessagesContext from "../../context/PrevMessagesContext";
import MyPseudoIdContext from "../../context/MyPseudoIdContext";
import ShowChatContext from "../../context/ShowChatContext";
type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean; gameId: number };

const Chat: React.FC = () => {

    const { myPseudoId } = useContext(MyPseudoIdContext);
    const { showChat, setShowChat } = useContext(ShowChatContext);

    const { pseudoAdded, setPseudoAdded } = useContext(PseudoAddedContext);
    const { messages, setMessages } = useContext(MessageContext);
    
    const [userlist, setUserlist] = useState<{ id:number, pseudo: string; isConnected: boolean; isInGame: boolean; }[]>([]);
    const navigate = useNavigate();
    const [publicChannels, setPublicChannels] = useState<string[]>([]);
    const [privateChannels, setPrivateChannels] = useState<string[]>([]);
    const [chanName, setChanName] = useState("");
    const [error, setError] = useState("");
    const [optionsChan, setOptionsChan] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isPassword, setIsPassword] = useState(false);
    const [passwordCreation, setPasswordCreation] = useState('');
    const [password, setPassword] = useState('');
    const [showInputPasswordJoin, setShowInputPasswordJoin] = useState(false);
    const [tmpChanName, setTmpChanName] = useState('');
    const [userId, setUserId] = useState(0);
    const [isLocked, setIsLocked] = useState(false);

    const {myPseudo} = useContext(MyPseudoContext);
    const {socket} = useContext(SocketContext);
    const currentChan = useRef("Global Chat");
    const [actualChan, setActualChan] = useState("Global Chat");
    const {setPrevMessages} = useContext(PrevMessagesContext);


    useEffect(() => {
        const fetchUserPseudo = () => {
            api
                .get("/users/user")
                .then((response) => {
                    if (response.data.user.pseudo === null) {
                        setPseudoAdded(false);
                        navigate('/')
                    }
                    else {
                        setPseudoAdded(true);
                        setUserId(response.data.user.id);
                    }
                })
                .catch(() => {
                    console.log("Chat fetchUserPseudo");
                });
        };

        const fetchActualChan = () => {
            api
                .get("/users/user")
                .then((response) => {
                    if (response.data.user.actualChan === null) {
                        setActualChan("Global Chat");
                        currentChan.current = "Global Chat";
                    }
                    else {
                        setActualChan(response.data.user.actualChan);
                        currentChan.current = response.data.user.actualChan;
                    }
                })
                .catch(() => {
                    console.log("Chat fetchActualChan");
                });
        }
    
        const fetchChannels = () => {
            api
                .get("/channels/publicChanlist")
                .then((response) => {
                    const chanlist = response.data.map((channel: any) => channel.name)
                    setPublicChannels(chanlist);
                })
            api
                .get("/channels/privateChanlist")
                .then((response) => {
                    const chanlist = response.data.map((channel: any) => channel.name)
                    setPrivateChannels(chanlist);
                })
        };

        const fetchUserlist = () => {
            if (actualChan === "Global Chat") {
                api
                .get("/users/userlist")
                .then((response) => {
                    const userlist = response.data.map((user: any) => ({
                        id: user.id,
                        pseudo: user.pseudo,
                        isConnected: user.isConnected,
                        isInGame: user.isInGame,
                    }))
                    setUserlist(userlist);
                })
            }
            else {
                axios.get(`http://localhost:5000/channels/usersInChan?actualChan=${actualChan}`, {withCredentials: true})
                .then((response) => {
                    if (response.data.allFound === true) {
                        const userlist = response.data.userlist.map((user: any) => ({
                            id: user.id,
                            pseudo: user.pseudo,
                            isConnected: user.isConnected,
                            isInGame: user.isInGame,
                        }))
                        setUserlist(userlist);
                    }
                    else {
                        axios.get(`http://localhost:5000/channels/usersInChanMp?actualChan=${actualChan}`, {withCredentials: true})
                        .then((response2) => {
                            const userlist = response2.data.userlist.map((user: any) => ({
                                id: user.id,
                                pseudo: user.pseudo,
                                isConnected: user.isConnected,
                                isInGame: user.isInGame,
                            }))
                            setUserlist(userlist);
                        })
                    }
                })
                .catch(() => {
                })
            } 
        };
        fetchUserPseudo();
        if (pseudoAdded) {
            fetchChannels();
            fetchUserlist();
            fetchActualChan();
        } 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on("banChan", (chan) => {
                const chaaan = chan;
                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                .then(() => {
                    socket?.emit("leaveChan", chan, myPseudo);
                    setActualChan("Global Chat");
                    currentChan.current = "Global Chat";
                    setPrevMessages([]);
                    setMessages([`You have been banned from chan ${chan}`]);
                    socket?.emit("joinChan", "Global Chat", myPseudo);
                })
            })

            return () => {
                socket?.off("banChan", (chan) => {
                    const chaaan = chan;
                    axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                    .then(() => {
                        socket?.emit("leaveChan", chan, myPseudo);
                        setActualChan("Global Chat");
                        currentChan.current = "Global Chat";
                        setPrevMessages([]);
                        setMessages([`You have been banned from chan ${chan}`]);
                        socket?.emit("joinChan", "Global Chat", myPseudo);
                    })
                })
            }
        }
    }, [myPseudo, pseudoAdded, setMessages, setPrevMessages, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on("kickChan", (chan) => {
                const chaaan = chan;
                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                .then(() => {
                    socket?.emit("leaveChan", chan, myPseudo);
                    setActualChan("Global Chat");
                    currentChan.current = "Global Chat";
                    setPrevMessages([]);
                    setMessages([`You have been kicked from chan ${chan}`]);
                    socket?.emit("joinChan", "Global Chat", myPseudo);
                })
            })

            return () => {
                socket?.off("kickChan", (chan) => {
                    const chaaan = chan;
                    axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                    .then(() => {
                        socket?.emit("leaveChan", chan, myPseudo);
                        setActualChan("Global Chat");
                        currentChan.current = "Global Chat";
                        setPrevMessages([]);
                        setMessages([`You have been kicked from chan ${chan}`]);
                        socket?.emit("joinChan", "Global Chat", myPseudo);
                    })
                })
            }
        }
    }, [myPseudo, pseudoAdded, setMessages, setPrevMessages, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('newChan', (channel) => {
                if (channel.isPrivate === false) {
                    setPublicChannels(prevChannels => [...prevChannels, channel.name]);
                }
            })
        
            return () => {
                socket?.off('newChan', (channel) => {
                    if (channel.isPrivate === false) {
                        setPublicChannels(prevChannels => [...prevChannels, channel.name]);
                    }
                })
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('newUser', (newUser) => {
                if (currentChan.current === "Global Chat") {
                    setUserlist(prevUsers => [...prevUsers, newUser])
                }
            })
        

            return () => {
                socket?.off('newUser', (newUser) => {
                    if (currentChan.current === "Global Chat") {
                        setUserlist(prevUsers => [...prevUsers, newUser])
                    }
                })
            }
        }
    }, [pseudoAdded, socket])


    useEffect(() => {
        if (pseudoAdded) {
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
            })
        

            return () => {
                socket?.off('userReconnected', (user) => {
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
                })
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
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
            })
        

            return () => {
                socket?.off('userDisconnected', (user) => {
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
                })
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('changePseudo', (userId, userPseudo) => {
                setUserlist(prevUserlist => {
                    return prevUserlist.map(user => {
                        if (user.id === userId) {
                            return { ...user, pseudo: userPseudo };
                        }
                        return user;
                    });
                });
            });
        

            return () => {
                socket?.off('changePseudo', (userId, userPseudo) => {
                    setUserlist(prevUserlist => {
                        return prevUserlist.map(user => {
                            if (user.id === userId) {
                                return { ...user, pseudo: userPseudo };
                            }
                            return user;
                        });
                    });
                });
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('invitedInChan', (channel) => {
                if (channel.isPrivate === true) {
                    setPrivateChannels(prevChannels => [...prevChannels, channel.name]);
                }
            })
        
            return () => {
                socket?.off('invitedInChan', (channel) => {
                    if (channel.isPrivate === true) {
                        setPrivateChannels(prevChannels => [...prevChannels, channel.name]);
                    }
                })
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('newUserInChan', (newUser) => {
                setUserlist(prevUsers => [...prevUsers, newUser])
            })
        
            return () => {
                socket?.off('newUserInChan', (newUser) => {
                    setUserlist(prevUsers => [...prevUsers, newUser])
                })
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('userLeftTheChan', (user) => {
                setUserlist(prevUserlist => prevUserlist.filter(u => u.id !== user.id));
            })
        
            return () => {
                socket?.off('userLeftTheChan', (user) => {
                    setUserlist(prevUserlist => prevUserlist.filter(u => u.id !== user.id));
                })
            }
        }
    }, [pseudoAdded, socket])

    useEffect(() => {
        if (pseudoAdded) {
            socket?.on('backInChan', () => {
                api
                  .get("/users/user")
                      .then((response) => {
                          axios.get(`http://localhost:5000/channels/usersInChan?actualChan=${response.data.user.actualChan}`, {withCredentials: true})
                          .then((response3) => {
                              if (response3.data.allFound === true) {
                                  const userlist = response3.data.userlist.map((user: any) => ({
                                      id: user.id,
                                      pseudo: user.pseudo,
                                      isConnected: user.isConnected,
                                      isInGame: user.isInGame,
                                  }))
                                  setUserlist(userlist);
                              }
                              else {
                                  axios.get(`http://localhost:5000/channels/usersInChanMp?actualChan=${response.data.user.actualChan}`, {withCredentials: true})
                                  .then((response4) => {
                                      const userlist = response4.data.userlist.map((user: any) => ({
                                          id: user.id,
                                          pseudo: user.pseudo,
                                          isConnected: user.isConnected,
                                          isInGame: user.isInGame,
                                      }))
                                      setUserlist(userlist);
                                  })
                              }
                          })
                      })
              })
        
            return () => {
                socket?.off('backInChan', () => {
                    api
                      .get("/users/user")
                          .then((response) => {
                              axios.get(`http://localhost:5000/channels/usersInChan?actualChan=${response.data.user.actualChan}`, {withCredentials: true})
                              .then((response3) => {
                                  if (response3.data.allFound === true) {
                                      const userlist = response3.data.userlist.map((user: any) => ({
                                          id: user.id,
                                          pseudo: user.pseudo,
                                          isConnected: user.isConnected,
                                          isInGame: user.isInGame,
                                      }))
                                      setUserlist(userlist);
                                  }
                                  else {
                                      axios.get(`http://localhost:5000/channels/usersInChanMp?actualChan=${response.data.user.actualChan}`, {withCredentials: true})
                                      .then((response4) => {
                                          const userlist = response4.data.userlist.map((user: any) => ({
                                              id: user.id,
                                              pseudo: user.pseudo,
                                              isConnected: user.isConnected,
                                              isInGame: user.isInGame,
                                          }))
                                          setUserlist(userlist);
                                      })
                                  }
                              })
                          })
                  })
            }
        }
    }, [pseudoAdded, socket])

    const send = async (pseudo: string, value: string) => {
        // eslint-disable-next-line no-control-regex
        const regex = /[\u0000-\u001F\u007F-\u009F]/;
        if (!regex.test(value)) {
            socket?.emit("createMessage", pseudo, value, actualChan);
        }
    }
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChanName(event.target.value);
    }

    const handlePublicChan = () => {
        setIsPublic(true);
        setIsPrivate(false);
    }

    const handlePrivateChan = () => {
        setIsPublic(false);
        setIsPrivate(true);
    }

    const handlePasswordChan = () => {
        setIsPassword(!isPassword);
    }

    const handlePasswordCreationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordCreation(event.target.value);
    }

    const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
    }

    const createChan = () => {
        const regex = /\d/;
        if (regex.test(chanName)) {
            setError("You cant put numbers for channels names.");
            setOptionsChan(false);
        }
        else if (chanName.length > 15) {
            setError("You chan name is too long");
            setOptionsChan(false);
        }
        else if (chanName.length <= 3) {
            setError("You chan name is too short");
            setOptionsChan(false);
        }
        else if (chanName === "Global Chat") {
            setError("Channel already exists");
            setOptionsChan(false);
        }
        else if (optionsChan === true) {
            setOptionsChan(false);
            setIsLocked(false);
        }
        else {
            axios.get('http://localhost:5000/channels/chanlist', { withCredentials: true })
                .then((response) => {
                    const channels = response.data;
                    for (let i = 0; i < channels.length; i++) {
                        if (chanName === channels[i].name) {
                            setError("Channel already exists");
                            setOptionsChan(false);
                            return;
                        }
                    }
                    setError("")
                    setIsLocked(true);
                    setOptionsChan(true);
                    setShowInputPasswordJoin(false);
                })
        }
    }

    const validOptions = () => {
        axios.post('http://localhost:5000/channels/createChan', { chanName: chanName, isPrivate: isPrivate, isPassword: isPassword, password: passwordCreation }, { withCredentials: true })
        .then(() => {
            axios.get('http://localhost:5000/users/user', { withCredentials: true })
            .then((response) => {
                const chaaan = actualChan;
                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                .then(() => {
                    socket?.emit("leaveChan", actualChan, response.data.user.pseudo);
                    setActualChan(chanName);
                    currentChan.current = chanName;
                    setPrevMessages([]);
                    setMessages([]);
                    socket?.emit("joinChan", chanName, response.data.user.pseudo);
                    socket?.emit("newChan", chanName);
                    if (isPrivate === true) {
                        setPrivateChannels([...privateChannels, chanName]);
                    }
                    const filteredUserlist = userlist.filter(user => user.id === userId);
                    setUserlist(filteredUserlist); 
                    setOptionsChan(false);
                    setIsLocked(false);
                    setChanName("");
                })
            }) 
        })
    }

    const validPassword = () => {
        axios.get(`http://localhost:5000/channels/getOneChan?chanName=${tmpChanName}`, { withCredentials: true })
            .then((response) => {
                axios.get(`http://localhost:5000/channels/checkPassword?chanName=${tmpChanName}&password=${password}`, {withCredentials: true})
                .then((response2) => {
                    if (response2.data.isOk === true) {
                        const channel = tmpChanName;
                        axios.post('http://localhost:5000/channels/addInChan', { channel }, { withCredentials: true })
                        .then(() => {
                            axios.get('http://localhost:5000/users/user', { withCredentials: true })
                            .then((response3) => {
                                const chaaan = actualChan;
                                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                                .then(() => {
                                    socket?.emit("leaveChan", actualChan, response3.data.user.pseudo);
                                    setActualChan(tmpChanName);
                                    currentChan.current = tmpChanName;
                                    setPrevMessages(response.data.messages);
                                    setMessages([]);
                                    socket?.emit("joinChan", tmpChanName, response3.data.user.pseudo);
                                    setShowInputPasswordJoin(false);
                                    setPassword('');
                                })
                            })
                            .then(() => {
                                axios.get(`http://localhost:5000/channels/usersInChan?actualChan=${channel}`, {withCredentials: true})
                                .then((response4) => {
                                    if (response4.data.allFound === true) {
                                        const userlist = response4.data.userlist.map((user: any) => ({
                                            id: user.id,
                                            pseudo: user.pseudo,
                                            isConnected: user.isConnected,
                                            isInGame: user.isInGame,
                                        }))
                                        setUserlist(userlist);
                                    }
                                    else {
                                        axios.get(`http://localhost:5000/channels/usersInChanMp?actualChan=${channel}`, {withCredentials: true})
                                        .then((response5) => {
                                            const userlist = response5.data.userlist.map((user: any) => ({
                                                id: user.id,
                                                pseudo: user.pseudo,
                                                isConnected: user.isConnected,
                                                isInGame: user.isInGame,
                                            }))
                                            setUserlist(userlist);
                                        })
                                    }
                                })
                                .catch(() => {
                                })
                            })
                        }) 
                    }
                    else {
                        setError("Bad password");
                        setShowInputPasswordJoin(false);
                        setPassword("")
                    }
                })
                .catch(() => {
                })
            })
    }

    const chanClick = (channel: string) => {
        setError("")
        if (currentChan.current === channel) {
            return ;
        }
        axios.get(`http://localhost:5000/channels/getOneChan?chanName=${channel}`, { withCredentials: true })
            .then((response) => {
                setError("");
                axios.get(`http://localhost:5000/channels/getOneChanUser?chanId=${response.data.id}&userId=${userId}`, { withCredentials: true })
                .then((response2) => {
                    if (response2.data.isBanned === true ) {
                        const banTime = new Date(response2.data.banTime);
                        if (banTime > new Date()) {
                            setError("You are banned from this channel.")
                            return ;
                        }
                    }
                    if (response.data.isPassword === true) {
                        setShowInputPasswordJoin(true);
                        setOptionsChan(false);
                        setTmpChanName(channel);
                    }
                    else {
                        axios.post('http://localhost:5000/channels/addInChan', { channel }, { withCredentials: true })
                        .then(() => {
                            axios.get('http://localhost:5000/users/user', { withCredentials: true })
                            .then((response3) => {
                                const chaaan = actualChan;
                                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                                .then(() => {
                                    socket?.emit("leaveChan", actualChan, response3.data.user.pseudo);                              
                                    setActualChan(channel); 
                                    currentChan.current = channel;
                                    axios.get('http://localhost:5000/users/allMyUsersBlocked', {withCredentials: true})
                                    .then((response4) => {
                                        if (response4.data.blocked === true) {
                                            const usersBlocked = response4.data.usersBlocked;
                                            const usersBlockedIds = usersBlocked.map((userBlocked: any) => userBlocked.userBlockedId);
                                            const goodPrevMessages = response.data.messages.filter((message: any) => {
                                                const id = parseInt(message.match(/\[(\d+)\]/)[1]);
                                                const isBlocked = usersBlockedIds.includes(id);
                                                return !isBlocked;
                                            });
                                            setPrevMessages(goodPrevMessages);
                                        }
                                        else {
                                             setPrevMessages(response.data.messages);
                                        }
                                    })
                                    setMessages([]);
                                    socket?.emit("joinChan", channel, response3.data.user.pseudo);  
                                    setShowInputPasswordJoin(false);
                                    setOptionsChan(false);
                                    setPassword('');
                                })
                            })
                            .then(() => {
                                axios.get(`http://localhost:5000/channels/usersInChan?actualChan=${channel}`, {withCredentials: true})
                                .then((response3) => {
                                    if (response3.data.allFound === true) {
                                        const userlist = response3.data.userlist.map((user: any) => ({
                                            id: user.id,
                                            pseudo: user.pseudo,
                                            isConnected: user.isConnected,
                                            isInGame: user.isInGame,
                                        }))
                                        setUserlist(userlist);
                                    }
                                    else {
                                        axios.get(`http://localhost:5000/channels/usersInChanMp?actualChan=${channel}`, {withCredentials: true})
                                        .then((response4) => {
                                            const userlist = response4.data.userlist.map((user: any) => ({
                                                id: user.id,
                                                pseudo: user.pseudo,
                                                isConnected: user.isConnected,
                                                isInGame: user.isInGame,
                                            }))
                                            setUserlist(userlist);
                                        })
                                    }
                                })
                                .catch(() => {
                                })
                            })
                        })    
                    }
                    
                })
            })
    }

    const handleClickGlobalChat = () => {
        setError("")
        if (currentChan.current === "Global Chat") {
            return ;
        }
        axios.get('http://localhost:5000/users/user', { withCredentials: true })
            .then((response) => {
                const chaaan = actualChan;
                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                .then(() => {
                    socket?.emit("leaveChan", actualChan, response.data.user.pseudo);
                    setActualChan("Global Chat");
                    currentChan.current = "Global Chat";
                    setPrevMessages([]);
                    setMessages([]);
                    socket?.emit("joinChan", "Global Chat", response.data.user.pseudo);
                    setShowInputPasswordJoin(false);
                    setOptionsChan(false);
                    setPassword('');
                    api
                    .get("/users/userlist")
                    .then((response2) => {
                        const userlist = response2.data.map((user: any) => ({
                            id: user.id,
                            pseudo: user.pseudo,
                            isConnected: user.isConnected,
                            isInGame: user.isInGame,
                        }))
                        setUserlist(userlist);
                    })
                }) 
            })
    }

    const setCurrentChan = (newChan: string) => {
        currentChan.current = newChan;
    }

    const gameRequestFromAccepted = useCallback(({ user, gameId }: { user: User, gameId: number }) => {
        navigate(`/game/${gameId}`);
        if (showChat) {
            setShowChat(!showChat);
        }
    }, [navigate, setShowChat, showChat]);

    const redirectGame = useCallback(({ gameId }: { gameId: number }) => {
        navigate(`/game/${gameId}`);
      }, [navigate]);
      
      useEffect(() => {
        
        socket?.emit('amIInAGame', { fromId: myPseudoId });
        socket?.on("redirectToGame", redirectGame);
        socket?.on('gameRequestChat', gameRequestFromAccepted);
        return () => {
            socket?.off("redirectToGame", redirectGame);
            socket?.off('gameRequestChat', gameRequestFromAccepted);
        }
      }, [myPseudoId, socket, redirectGame, gameRequestFromAccepted]);

    return (
        <ActualChanContext.Provider value={{ actualChan, setActualChan}}>
        {pseudoAdded ? (
            <div className="contentUnderNavbar">
                <div className="chat_chansAndPromptAndUserlist">
                    <div className="chat_chans">
                        <h2> Channels </h2>
                        <ul className="chat_chan_ul">
                            <button className="chat_chan_button" onClick={handleClickGlobalChat}>Global Chat</button>
                            {publicChannels.length > 0 ? (
                                publicChannels.map((publicChannel, index) => <li key={index}><button className="chat_chan_button" onClick={() => chanClick(publicChannel)}>{publicChannel}</button></li>)
                            ) : (
                                <li></li>
                            )}
                            {privateChannels.length > 0 ? (
                                privateChannels.map((privateChannel, index) => <li key={index}><button className="chat_chan_button" onClick={() => chanClick(privateChannel)}>{privateChannel}</button></li>)
                            ) : (
                                <li></li>
                            )}
                        </ul>
                        <input className="chat_chan_input" value={chanName} type="text" onChange={handleChange} disabled={isLocked} placeholder="..." />
                        <button className="chat_chan_add_button" onClick={createChan}>Create Chan</button>
                        <div>
                            {optionsChan && (
                                <div>
                                    <h2>Chan Options</h2>
                                    <label>
                                        <input type="checkbox" checked={isPublic} onChange={handlePublicChan} />
                                        Public
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={isPrivate} onChange={handlePrivateChan} />
                                        Private
                                    </label>
                                    <label>
                                        <input type="checkbox" checked={isPassword} onChange={handlePasswordChan} value={password} />
                                        Mot de passe
                                    </label>
                                    {isPassword && (
                                        <input type="password" value={passwordCreation} onChange={handlePasswordCreationChange} placeholder="Type your new password" />
                                    )}
                                    <button onClick={validOptions}>Valid Options</button>
                                </div>
                            )}
                            {showInputPasswordJoin && (
                                <div>
                                    <label>
                                        <input type="password" value={password} onChange={handlePasswordChange} placeholder="password" />
                                        <button onClick={validPassword}>Go on chan</button>
                                    </label>
                                </div>
                            )}
                            {error}
                        </div>
                    </div>
                    <div className="chat_promptMessages">
                        <h2>{actualChan}</h2>
                        <Messages messages={messages} />
                        <div className="chat_down">
                    <MessageInput send={send} />
                </div>
                    </div>
                    <div className="chat_userlist">
                        <h2> Userlist</h2>
                        <Userlist userlist={userlist} currentChan={currentChan.current} setCurrentChan={setCurrentChan} />
                    </div>
                </div>
              
            </div>
        ) : (
            <div>
            </div>
        )}
        </ActualChanContext.Provider>
    );
};

export default Chat;