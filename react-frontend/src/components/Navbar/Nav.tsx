import { useCallback, useContext, useEffect, useState } from 'react';
import "../../assets/Nav.css";
import monImage from '../../assets/images/raquette.png';
import AuthContext from '../../context/AuthContext';
import MyPseudoContext from '../../context/MyPseudoContext';
import { Link } from 'react-router-dom';
import api from '../../Api/api';
import SocketContext from '../../context/SocketContext';
import MyPseudoIdContext from '../../context/MyPseudoIdContext';
import messageListener from '../../App'
import axios from "axios";
import Friends from '../Friends/Friends';
import Chat from '../Chat/Chat';
import ShowChatContext from '../../context/ShowChatContext';
import PseudoAddedContext from '../../context/PseudoAddedContext';
import ActualChanContext from "../../context/ActualChanContext";
import NavbarContext from '../../context/NavbarContext';
import MessageContext from '../../context/MessagesContext';
import PrevMessagesContext from '../../context/PrevMessagesContext';

/*
Quand on va clicker sur le bouton burger, on va passer la variable showLinks a true, elle qui est sur false normalement
*/
function Nav() {
  const [showLinks, setShowLinks] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const { showChat, setShowChat } = useContext(ShowChatContext);
  const { setAuthenticated } = useContext(AuthContext);
  const { myPseudo, setMyPseudo } = useContext(MyPseudoContext);
  const {socket} = useContext(SocketContext);
  const {myPseudoId} = useContext(MyPseudoIdContext);
  const { pseudoAdded } = useContext(PseudoAddedContext);
  const { setActualChan} = useContext(ActualChanContext);
  const { showNav } = useContext(NavbarContext);
  const { setMessages } = useContext(MessageContext);
  const {setPrevMessages} = useContext(PrevMessagesContext);
  
  const handleLogoutClick = () => {
    axios.get('http://localhost:5000/users/user', { withCredentials: true })
      .then((response) => {
        if (response.data.user.pseudo !== null) {
          axios.get(`http://localhost:5000/channels/getActualChanUser?userId=${response.data.user.id}`, { withCredentials: true })
          .then((response2) => {
            if (response2.data.found === true) {
              const chaaan = response2.data.channel.name;
              axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
              .then(() => {
                socket?.emit("leaveChan2", chaaan, response.data.user.pseudo);
              })
            }
            else {
              axios.get(`http://localhost:5000/channels/getActualChanMp?userId=${response.data.user.id}`, { withCredentials: true })
              .then((response2) => {
                if (response2.data.found === true) {
                  const chaaan = response2.data.chanMp.name;
                  axios.patch('http://localhost:5000/channels/changeIsInChan', {chaaan} , { withCredentials: true })
                  .then(() => {
                    socket?.emit("leaveChan2", chaaan, response.data.user.pseudo);
                  })
                }
                else {
                  socket?.emit("leaveChan2", "Global Chat", response.data.user.pseudo);
                }
              })
              .catch(() => {
              })
            }
          })
          .catch(() => {
          })
        }
      })
      axios.post(`http://localhost:5000/auth/logout`, {myPseudoId}, {withCredentials: true})
        .then(() => {
          setAuthenticated(false);
          socket?.off("createMessage", messageListener);
          socket?.off("joinChan", messageListener);
          socket?.off("leaveChan", messageListener);
          socket?.emit('userDisconnected', myPseudoId);
          
          socket?.close();
          window.location.href = `http://localhost`;
      
        })
  };
      
  const handleShowLinks = () => {
      setShowLinks(!showLinks);
  }

  const handleFriends = () => {
    if (pseudoAdded) {
      setShowFriends(!showFriends);
    }
  }

  const handleLinksClick = () => {
    if (showChat) {
      setShowChat(!showChat);
    }
    if (showFriends) {
      setShowFriends(!showFriends);
    }
}

  const handleChat = () => {
    if (pseudoAdded) {
      if (showChat === false) {
        axios.get('http://localhost:5000/users/user', { withCredentials: true })
        .then((response) => {
          if (response.data.user.pseudo !== null) {
            setMessages([]);
            if (response.data.user.actualChan === null) {
              setPrevMessages([]);
              setActualChan("Global Chat");
              socket?.emit("joinChan", "Global Chat", response.data.user.pseudo);
            }
            else if (/^\d/.test(response.data.user.actualChan)) {
              setActualChan(response.data.user.actualChan);
              socket?.emit("joinChan2", response.data.user.actualChan, response.data.user.pseudo);
              axios.get(`http://localhost:5000/channels/getOneChanMp?chanName=${response.data.user.actualChan}`, { withCredentials: true })
                .then((response2) => {
                  axios.get('http://localhost:5000/users/allMyUsersBlocked', {withCredentials: true})
                    .then((response3) => {
                        if (response3.data.blocked === true) {
                            const usersBlocked = response3.data.usersBlocked;
                            const usersBlockedIds = usersBlocked.map((userBlocked: any) => userBlocked.userBlockedId);
                            const goodPrevMessages = response2.data.chanMp.messages.filter((message: any) => {
                                const id = parseInt(message.match(/\[(\d+)\]/)[1]);
                                const isBlocked = usersBlockedIds.includes(id);
                                return !isBlocked;
                            });
                            setPrevMessages(goodPrevMessages);
                        }
                        else {
                            setPrevMessages(response2.data.chanMp.messages);
                        }
                    })
                })
            }
            else if (response.data.user.actualChan === "Global Chat") {
              socket?.emit("joinChan2", "Global Chat", response.data.user.pseudo);
              setActualChan(response.data.user.actualChan);
              setPrevMessages([]);
            }
            else {
              setActualChan(response.data.user.actualChan);
              socket?.emit("joinChan2", response.data.user.actualChan, response.data.user.pseudo);
              axios.get(`http://localhost:5000/channels/getOneChan?chanName=${response.data.user.actualChan}`, { withCredentials: true })
                .then((response2) => {
                  axios.get('http://localhost:5000/users/allMyUsersBlocked', {withCredentials: true})
                    .then((response3) => {
                        if (response3.data.blocked === true) {
                            const usersBlocked = response3.data.usersBlocked;
                            const usersBlockedIds = usersBlocked.map((userBlocked: any) => userBlocked.userBlockedId);
                            const goodPrevMessages = response2.data.messages.filter((message: any) => {
                                const id = parseInt(message.match(/\[(\d+)\]/)[1]);
                                const isBlocked = usersBlockedIds.includes(id);
                                return !isBlocked;
                            });
                            setPrevMessages(goodPrevMessages);
                        }
                        else {
                            setPrevMessages(response2.data.messages);
                        }
                    })
                })
            }
          }
        })
      }
      setShowChat(!showChat);
    }
  }

  const fetchMyPseudo = useCallback(() => {
      api
        .get("/users/user")
        .then((response) => {
          setMyPseudo(response.data.user.pseudo);   
        })            
  }, [setMyPseudo]);

  useEffect(() => {
      fetchMyPseudo();
    }, [fetchMyPseudo, myPseudo]);

return (
  showNav ? (
  <>
    <nav className={`navbar ${showLinks ? "show-nav" : "hide-nav"}`}>
      <div className='navbar__logo'>
        <img src={monImage} alt="raquette-logo"/>
      </div>
      <ul className='navbar__links'>
        <li className='navbar__item slideInDown-1'>
          <Link to='/' className='navbar__link' onClick={handleLinksClick}>Home</Link>
        </li>
        <li className='navbar__item slideInDown-2'>
          <Link to={`/profile/${myPseudoId}`} className='navbar__link' onClick={handleLinksClick}>Profil</Link>
        </li>
        <li className='navbar__item slideInDown-3'>
          <Link to='/matchmaking' className='navbar__link' onClick={handleLinksClick}>Matchmaking</Link>
        </li>
        <li className='navbar__item slideInDown-4'>
          <span className='navbar__link' onClick={handleChat}>Chat</span>
        </li>
        <li className='navbar__item slideInDown-5'>
          <span className={`navbar__link ${showFriends ? 'navbar__link--active' : ''}`} onClick={handleFriends}>Community</span>
        </li>
        <li className='navbar__item slideInDown-6'>
          <span className='navbar__link' onClick={handleLogoutClick}>Logout</span>
        </li>
      </ul>
      <button className='navbar__burger' onClick={handleShowLinks}>
        <span className='burger-bar'></span>
      </button>
    </nav>
    {showFriends && <Friends setShowFriends={setShowFriends} />}
    {showChat && <Chat />}
    </>
  ) : null);
}

export default Nav;