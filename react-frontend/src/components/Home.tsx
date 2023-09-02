import React, { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import PseudoAddedContext from "../context/PseudoAddedContext";
import api from "../Api/api";
import { useNavigate } from "react-router-dom";
import "../assets/global.css";
import "../assets/home.css";
import SocketContext from "../context/SocketContext";
import MyPseudoContext from "../context/MyPseudoContext";
import MyPseudoIdContext from "../context/MyPseudoIdContext";
import ShowChatContext from "../context/ShowChatContext";
type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean; gameId: number };
const Home: React.FC = () => {
  const { pseudoAdded, setPseudoAdded } = useContext(PseudoAddedContext);
  const { showChat, setShowChat } = useContext(ShowChatContext);
  const { myPseudo, setMyPseudo } = useContext(MyPseudoContext);
  const [inputPseudo, setInputPseudo] = useState('');
  const navigate = useNavigate();
  const [avatarSrc, setAvatarSrc] = useState('');
  const [errorPseudo, setErrorPseudo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useContext(SocketContext);
  const { myPseudoId } = useContext(MyPseudoIdContext);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputPseudo.length > 3 && inputPseudo.length < 13 && /^[a-zA-Z]+$/.test(inputPseudo)) {
      axios.patch('http://localhost:5000/users/addPseudo', { inputPseudo }, { withCredentials: true })
        .then((response) => {
          if (response.data.pseudoTaken === false) {
            setPseudoAdded(true);
            setMyPseudo(inputPseudo);
            socket?.emit('newUser', inputPseudo);
          }
          else {
            setErrorPseudo("Pseudo is already used, please choose another one.");
          }
        })
        .catch(() => {
        });
    }
    else {
      if (inputPseudo.length <= 3) {
        setErrorPseudo("Pseudo must have minimum 4 characters.");
      }
      else if (inputPseudo.length >= 13) {
        setErrorPseudo("Pseudo must have maximum 12 characters.");
      }
      else if (/^[a-zA-Z]+$/.test(inputPseudo) === false) {
        setErrorPseudo("Pseudo must contains only letters.");
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputPseudo(event.target.value);
  };

  const fetchUserPseudo = useCallback(() => {
    api
      .get("/users/user")
      .then((response) => {
        if (response.data.user.pseudo === null) {
          setPseudoAdded(false);
          setIsLoading(false);
        }
        else {
          setPseudoAdded(true);
          setMyPseudo(response.data.user.pseudo)
          setIsLoading(false);
        }
      })
      .catch(() => {
        console.log("Home fetchUserPseudo");
      });
  }, [setPseudoAdded, setMyPseudo, setIsLoading]);

  const fetchAvatar = useCallback(async () => {
    const response = await api.get('/users/avatar', {
      responseType: 'blob',
    });
    const objectURL = URL.createObjectURL(response.data);
    setAvatarSrc(objectURL);
  }, []);



  useEffect(() => {
    fetchUserPseudo();
    fetchAvatar();
  }, [fetchUserPseudo, fetchAvatar]);


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

  const handleClickMatchmaking = () => {
    navigate(`/matchmaking`);
  };

  if (isLoading) {
    return (<div></div>)
  };

  return (
    isLoading ? (
      <div>Loading...</div>
    ) : pseudoAdded ? (
      showChat === false ? (
        <div className="contentUnderNavbar">
          <div className="welcome-container">
            <h1 className="welcome-text">WELCOME {myPseudo} !</h1>
            <img src={avatarSrc} alt="avatar" className="avatar-image" />
            <p className="welcome-description">Ready to challenge others in the game of Pong ? Click the button below to start the action !</p>

            <button className="start-game-btn" onClick={handleClickMatchmaking}>Start Game</button>
          </div>
        </div>
      ) : (
        <div></div>
      )
    ) : (
      <div className="contentUnderNavbar">
        <div className="create-profile-container">
          <h1>Create Your Profile</h1>
          <p> Welcome to our community ! Choose an unique pseudo and dive into the excitement of Pong ! Challenge other players, make your way up the leaderboard, and have a blast !</p>
          <form onSubmit={handleSubmit} className="create-profile-form">
            <div>
              <label className="labelPseudo" htmlFor="pseudo">Pseudo : </label>
              <input className="inputPseudo" type="text" name="pseudo" id="pseudo" onChange={handleChange} />
            </div>
            <button className="buttonPseudo" type="submit">Let's go</button>
            <p>
              {errorPseudo}
            </p>
          </form>
        </div>
      </div>
    )
  );
};
export default Home;

