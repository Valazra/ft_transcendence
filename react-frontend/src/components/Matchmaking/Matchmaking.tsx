import { useCallback, useContext, useEffect, useState } from "react";
import api from "../../Api/api";
import PseudoAddedContext from "../../context/PseudoAddedContext";
import { useNavigate } from "react-router-dom";
import SocketContext from '../../context/SocketContext';
import MyPseudoIdContext from '../../context/MyPseudoIdContext';
import '../../assets/matchmaking.css'
import ShowChatContext from "../../context/ShowChatContext";

const Matchmaking: React.FC = () => {
  const { pseudoAdded, setPseudoAdded } = useContext(PseudoAddedContext);
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const { myPseudoId } = useContext(MyPseudoIdContext);
  const [waiting, setWaiting] = useState<boolean>(false);
  const { showChat, setShowChat } = useContext(ShowChatContext);
  type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean; gameId: number };


  const fetchUserPseudo = useCallback(() => {
    api
      .get("/users/user")
      .then((response) => {
        if (response.data.user.pseudo === null) {
          setPseudoAdded(false);
          navigate('/')
        }
        else {
          setPseudoAdded(true);
        }
      })
      .catch(() => {
        console.log("Game fetchUserPseudo");
      });
  }, [setPseudoAdded, navigate]);

  useEffect(() => {
    fetchUserPseudo();
  }, [fetchUserPseudo]);

  const joinMatchmaking = () => {

    setWaiting(true);
    socket?.emit('matchMaking', { userId: myPseudoId });
  }

  const navigateToGame = useCallback((gameId: number) => {
    navigate(`/game/${gameId}`);
  }, [navigate]);

  useEffect(() => {
    if (!socket) return;
    socket.on('alreadyAcceptedAGame', navigateToGame);
    return () => {
      socket.off('alreadyAcceptedAGame');
    };
  }, [socket, navigateToGame]);

  useEffect(() => {
    if (!socket) return;
    socket.on('gameInviteCreated', navigateToGame);
    return () => {
      socket.off('gameInviteCreated');
    };
  }, [socket, navigateToGame]);

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
        socket?.emit('leaveQueue', { fromId: myPseudoId });
    }
  }, [myPseudoId, socket, redirectGame, gameRequestFromAccepted]);

  return (
    showChat === false ? (
      pseudoAdded ? (
        <div className="contentUnderNavbar">
          <div className="matchmaking-container">
            <h1>Welcome to Matchmaking</h1>
            {waiting ?
              <div className="waiting-message">
                <p>Waiting for another player to join...</p>
              </div> :
              <button className="connect-button" onClick={joinMatchmaking}>
                Connect to Matchmaking
              </button>
            }
          </div>
        </div>
      ) : (
        <div className="contentUnderNavbar">
          <div className="matchmaking-container">
            <h1>Please add a pseudo before accessing matchmaking</h1>
          </div>
        </div>
      )
    ) : (
      <div>
      </div>
    )

  );
};

export default Matchmaking;
