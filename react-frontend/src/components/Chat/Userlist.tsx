import axios from "axios";
import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import SocketContext from "../../context/SocketContext";
import ActualChanContext from "../../context/ActualChanContext";
import MessageContext from '../../context/MessagesContext';
import PrevMessagesContext from "../../context/PrevMessagesContext";
import ShowChatContext from "../../context/ShowChatContext";
import MyPseudoIdContext from "../../context/MyPseudoIdContext";

type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean};

export default function Userlist({ userlist, currentChan, setCurrentChan }: { userlist: {id: number, pseudo: string; isConnected: boolean; isInGame: boolean;}[], currentChan: string, setCurrentChan: (newChan: string) => void }) {

    const [errorUserlist, setErrorUserlist] = useState("")

    const {socket} = useContext(SocketContext);
    const {setActualChan} = useContext(ActualChanContext);
    const {setMessages} = useContext(MessageContext);
    const {setPrevMessages} = useContext(PrevMessagesContext);
    const { showChat, setShowChat } = useContext(ShowChatContext);
    const { myPseudoId } = useContext(MyPseudoIdContext);

    const handleClickProfile = () => {
      setShowChat(!showChat);
    }

    const handleSendGameRequest = (to: User) => {
        socket?.emit('gameRequestSent', { fromId: myPseudoId, toId: to.id });
    };
    
    const privateDiscussChange = (userTargetId: number) => {
        setErrorUserlist("");
        axios.get('http://localhost:5000/users/user', { withCredentials: true })
            .then((response) => {
                if (userTargetId === response.data.user.id) {
                    setErrorUserlist("You can't talk to yourself.")
                }
                else {
                    axios.get(`http://localhost:5000/users/getOneUserById/${userTargetId}`, { withCredentials: true })
                    .then((response2) => {
                        const chanName = response.data.user.id.toString() + '-' + response2.data.user.id.toString();
                        const chanNameInversed = response2.data.user.id.toString() + '-' + response.data.user.id.toString();
                        axios.get(`http://localhost:5000/channels/getOneChanMp?chanName=${chanName}`, { withCredentials: true })
                        .then((response3) => {
                            if (response3.data.found === true) {
                                if (currentChan === chanName) {
                                    return ;
                                }
                                const chaaan = currentChan;
                                axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                                .then(() => {
                                    socket?.emit("leaveChan", currentChan, response.data.user.pseudo);                        
                                    setActualChan(chanName);
                                    setCurrentChan(chanName); 
                                    axios.get('http://localhost:5000/users/allMyUsersBlocked', {withCredentials: true})
                                    .then((response4) => {
                                        if (response4.data.blocked === true) {
                                            const usersBlocked = response4.data.usersBlocked;                   
                                            const usersBlockedIds = usersBlocked.map((userBlocked: any) => userBlocked.userBlockedId);                    
                                            const goodPrevMessages = response3.data.chanMp.messages.filter((message: any) => {
                                                const id = parseInt(message.match(/\[(\d+)\]/)[1]);
                                                const isBlocked = usersBlockedIds.includes(id);
                                                return !isBlocked;
                                            });
                                            setPrevMessages(goodPrevMessages);
                                        }
                                        else {
                                            setPrevMessages(response3.data.chanMp.messages);
                                        }
                                    })
                                    setMessages([]);               
                                    socket?.emit("joinChan", chanName, response.data.user.pseudo);
                                })
                            }
                            else {
                                axios.get(`http://localhost:5000/channels/getOneChanMp?chanName=${chanNameInversed}`, { withCredentials: true })
                                .then((response4) => {
                                    if (response4.data.found === true) {
                                        if (currentChan === chanNameInversed) {
                                            return ;
                                        }
                                        const chaaan = currentChan;
                                        axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                                        .then(() => {
                                            socket?.emit("leaveChan", currentChan, response.data.user.pseudo);                              
                                            setActualChan(chanNameInversed);
                                            setCurrentChan(chanNameInversed);
                                            axios.get('http://localhost:5000/users/allMyUsersBlocked', {withCredentials: true})
                                            .then((response25) => {
                                                if (response25.data.blocked === true) {
                                                    const usersBlocked = response25.data.usersBlocked;
                                                    const usersBlockedIds = usersBlocked.map((userBlocked: any) => userBlocked.userBlockedId);
                                                    const goodPrevMessages = response4.data.chanMp.messages.filter((message: any) => {
                                                        const id = parseInt(message.match(/\[(\d+)\]/)[1]);
                                                        const isBlocked = usersBlockedIds.includes(id);
                                                        return !isBlocked;
                                                    });
                                                    setPrevMessages(goodPrevMessages);
                                                }
                                                else {
                                                    setPrevMessages(response4.data.chanMp.messages);
                                                }
                                            })
                                            setMessages([]);
                                            socket?.emit("joinChan", chanNameInversed, response.data.user.pseudo);
                                        })
                                    }
                                    else {
                                        axios.post('http://localhost:5000/channels/createMpChan', { chanName: chanName, userTargetId: userTargetId }, { withCredentials: true })
                                        const chaaan = currentChan;
                                        axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                                        .then(() => {
                                            socket?.emit("leaveChan", currentChan, response.data.user.pseudo);                        
                                            setActualChan(chanName);
                                            setCurrentChan(chanName);
                                            setPrevMessages([]);
                                            setMessages([]);
                                            socket?.emit("joinChan", chanName, response.data.user.pseudo);
                                        })
                                    }
                                })
                                .catch(() => {
                                })
                            }
                        })
                        .catch(() => {
                        })
                    })
                }
            })
    }

    return (
        <div>
            {userlist.map((user, index) => (
                <div className="chat_div" key={index}>
                    <button onClick={() => privateDiscussChange(user.id)}>{user.pseudo}</button>
                    {user.isInGame ? <span style={{ color: 'orange', marginLeft: '5px' }}>●</span> 
                        : user.isConnected ? <span style={{ color: 'green', marginLeft: '5px' }}>●</span> 
                        : <span style={{ color: 'grey', marginLeft: '5px' }}>●</span>
                    }
                   <Link to={`/profile/${user.id}`} onClick={handleClickProfile}>Profile</Link>
                   {user.id !== myPseudoId && (
                    <button onClick={() => handleSendGameRequest(user)}>Game invite</button>
                   )}
                </div>
            ))}
            {errorUserlist}
        </div>
    )
}