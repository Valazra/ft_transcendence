import { useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../../Api/api";
import PseudoAddedContext from "../../context/PseudoAddedContext";
import { useNavigate, useParams } from "react-router-dom";
import SocketContext from '../../context/SocketContext';
import MyPseudoIdContext from '../../context/MyPseudoIdContext';
import NavbarContext from '../../context/NavbarContext';
import '../../assets/Game.css'
import Pong from '../Game/Pong';
import ShowChatContext from "../../context/ShowChatContext";
type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean; gameId: number };
interface GameState {
  ballPosition: {
    x: number,
    y: number
  },
  player1PaddlePosition: number,
  player2PaddlePosition: number,
  paddleSpeed: number,
  ballSpeed: {
    x: number,
    y: number
  },
  player1Score: number,
  player2Score: number
}

const Game: React.FC = () => {
  const { pseudoAdded, setPseudoAdded } = useContext(PseudoAddedContext);
  const navigate = useNavigate();
  const { gameIdParam } = useParams();
  const [gameId, setGameId] = useState(gameIdParam);
  const { socket } = useContext(SocketContext);
  const { myPseudoId } = useContext(MyPseudoIdContext);
  const [messages, setMessages] = useState<string[]>([]);
  const [howManyPlayers, setHowManyPlayers] = useState(0);
  const [howManySpec, setHowManySpec] = useState(0);
  const [isGameReady, setGameReady] = useState(false);
  const [isGameFinish, setIsGameFinish] = useState(false);
  const [imAPlayer, setImAPlayer] = useState(false);
  const [isGameStarted, setGameStarted] = useState(false);
  const { setShowNav } = useContext(NavbarContext);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameCountDown, setGameCountDown] = useState<number | null>(null);
  const mapStyleRef = useRef<string | null>(null);
  const gameplayStyleRef = useRef<string | null>(null);
  const [gameOptions, setGameOptions] = useState<{ mapStyle: string, gameplayStyle: string } | null>(null);
  const { showChat, setShowChat } = useContext(ShowChatContext);

  const handleMapStyleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    mapStyleRef.current = event.target.value;
  };

  const handleGameplayStyleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    gameplayStyleRef.current = event.target.value;

  };

  const [isGameOver, setGameOver] = useState(false);

  useEffect(() => {
    setGameId(gameIdParam);
    setGameCountDown(null);
    setGameState(null);
    setShowNav(true);
    setGameStarted(false);
    setIsGameFinish(false);
    setImAPlayer(false);
    setGameReady(false);
    setGameOver(false);
    setHowManySpec(0);
    setHowManyPlayers(0);
    setMessages([]);
  }, [gameIdParam,  setShowNav]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      socket?.emit('paddleMove', { direction: 'up', gameId, playerId: myPseudoId });
    } else if (event.key === 'ArrowDown') {
      socket?.emit('paddleMove', { direction: 'down', gameId, playerId: myPseudoId });
    }
  }, [socket, gameId, myPseudoId]);


  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress, gameIdParam]);


  useEffect(() => {
    if (howManyPlayers >= 2) {
      setGameReady(true);
    } else {
      setGameReady(false);
    }
  }, [howManyPlayers, gameIdParam]);


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
  }, [fetchUserPseudo, gameIdParam]);

  const connectGameRoom = useCallback(() => {
    if (!socket) return;
    socket?.emit('connectGameRoom', { myPseudoId: myPseudoId, gameId: gameId });

  }, [socket, gameId, myPseudoId]);

  const messageListener = useCallback((messages: string) => {
    setMessages(prevMessages => [...prevMessages, messages]);
  }, [setMessages]);

  const iJoinTheGame = useCallback(() => {
    setImAPlayer(true);
  }, [setImAPlayer]);

  useEffect(() => {
    if (!socket) return;
    socket?.on("createGameMessage", messageListener);
    socket?.on("userJoinGame", iJoinTheGame);
    socket.on('player count', (count) => {
      setHowManyPlayers(count);

    });
    socket.on('spec count', (count) => {
      setHowManySpec(count);
    });
    connectGameRoom();

    return () => {
      socket.off("createGameMessage", messageListener);
      socket.off("userJoinGame", messageListener);
      socket.off('player count');
      socket.off('spec count');
    };

  }, [socket, connectGameRoom, messageListener, iJoinTheGame, gameIdParam]);

  const handleStartGame = useCallback(() => {
    if (!mapStyleRef.current)
      mapStyleRef.current = "Default"
    if (!gameplayStyleRef.current)
      gameplayStyleRef.current = "Default"
    socket?.emit('startGame', {
      myPseudoId, gameId,
      mapStyle: mapStyleRef.current,
      gameplayStyle: gameplayStyleRef.current
    });
  }, [socket, gameId, myPseudoId]);

  useEffect(() => {
    if (!socket) return;
    const startGameListener = () => {
      setGameStarted(true);
      setShowNav(false);
    };
    socket.on('gameStart', startGameListener);
    return () => {
      socket.off('gameStart', startGameListener);
    };
  }, [socket, setShowNav, gameIdParam]);

  useEffect(() => {
    if (!socket) return;

    const playerLeftListener = (data: { pseudo: string }) => {
      setMessages(prevMessages => [...prevMessages, `Le joueur ${data.pseudo} a quitté la partie`]);
    };

    socket.on('playerLeft', playerLeftListener);

    return () => {
      socket.off('playerLeft', playerLeftListener);
    };

  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const gameUpdateListener = (newGameState: GameState) => {
      setGameState(newGameState);
    };

    socket.on('gameUpdate', gameUpdateListener);

    return () => {
     
      socket.off('gameUpdate', gameUpdateListener);
    };
  }, [socket, gameIdParam]);

  useEffect(() => {
    if (!socket) return;

    socket.on('gameOptions', (options) => {
      setGameOptions(options);
    });

    return () => {
     
      socket.off('gameOptions', (options) => {
        setGameOptions(options);
      });
    };
  }, [socket, gameIdParam]);

  useEffect(() => {
    if (!socket) return;

    const gameOverListener = (data: { winner: string }) => {
      
      setGameOver(true);
      setIsGameFinish(true);
      if (data.winner)
        setMessages(prevMessages => [...prevMessages, `Player ${data.winner} has won the game !`]);
      else
        setMessages(prevMessages => [...prevMessages, `End of game !`]);
    };

    socket.on('gameOver', gameOverListener);

    return () => {
      
      socket.off('gameOver', gameOverListener);
    };
  }, [socket, gameIdParam]);

  useEffect(() => {
    if (!socket) return;

    const gameOptionsListener = (data: { mapStyle: string, gameplayStyle: string }) => {
      
      setMessages(prevMessages => [...prevMessages, `Les options qui ont ete retenus sont pour le style de la map: ${data.mapStyle} et pour le gameplay: ${data.gameplayStyle}`]);
    };

    socket.on('gameOptions', gameOptionsListener);

    return () => {
      
      socket.off('gameOptions', gameOptionsListener);
    };
  }, [socket, gameIdParam]);

  useEffect(() => {
    if (!socket)
      return;
  

    return () => {
      socket.emit('endGame', { gameId, myPseudoId });
    }
  }, [socket, gameId, myPseudoId, gameIdParam]);

  useEffect(() => {
    if (!socket) return;
    const countDownListener = (countDown: number) => {
      countDown--;
      if (countDown <= 0)
        countDown = 0;
      setGameCountDown(countDown);
    };
    socket.on('countDown', countDownListener);
    return () => {
      socket.emit('leaveLobby', { gameId, myPseudoId });
      socket.off('countDown', countDownListener);
    };
  }, [socket, gameId, myPseudoId, gameIdParam]);

  useEffect(() => {
    if (!socket) return;
    const redirectToHome = () => {
      navigate('/')
    }
    socket.on('redirectToHome', redirectToHome);
    return () => {
      socket.off('redirectToHome', redirectToHome);
    };
  }, [socket, navigate, gameIdParam]);

  const handleForfeit = () => {
    if (!socket) return;
    socket.emit('handleForfeit', { gameId, myPseudoId });
    setGameOver(false);
    setGameStarted(false);
    setGameState(null);
    setShowNav(true);
  };

  const handleLeaveLobby = () => {
    if (!socket) return;
    socket.emit('cancelGameInvite', { gameId, myPseudoId });
    navigate('/')
  };

  const handleQuitGame = () => {
    navigate('/')
    setGameOver(false);
    setGameStarted(false);
    setGameState(null);
    setShowNav(true);
  };

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
  }, [myPseudoId, socket, redirectGame, gameRequestFromAccepted,  gameIdParam]);

  return (
    showChat === false ? (
      pseudoAdded ? (
        <>
          {!isGameStarted && (
            <div className="contentUnderNavbar">
              <div className="customMenu">
                Nous sommes dans la game {gameId}.
                <div className="numberBox">Players in this lobby: {howManyPlayers}/2</div>
                <div className="numberBox">Spectators in this lobby: {howManySpec}</div>
                {imAPlayer && (<button className="buttonPseudo" onClick={handleLeaveLobby}>Leave this game.</button>)}
              </div>
              {!isGameStarted && imAPlayer && (
                <>

                  <div className="customMenu">
                    <h2>Custom</h2>
                    <label>Choose your map:
                      <select onChange={handleMapStyleChange}>
                        <option value="default">Default - This is the default style</option>
                        <option value="alien">Alien - Alien style with green theme</option>
                        <option value="underwater">Underwater - Underwater theme with blue color</option>
                      </select>
                    </label>
                    <label>Choose your gameplay:
                      <select onChange={handleGameplayStyleChange}>
                        <option value="default">Default - This is the default gameplay</option>
                        <option value="slow">Slow - The game moves in slow motion</option>
                        <option value="invisible">Invisible - The ball turns invisible intermittently</option>
                      </select>
                    </label>
                    Each game one player custom's option is choose randomly.
                    {isGameReady && (
                      <button className="buttonPseudo" onClick={handleStartGame}>Ready?</button>
                    )}

                  </div>
                </>
              )}
              <h3>Game logs:</h3>
              {messages.map((message, index) => <p key={index}>{message}</p>)}
              <div className="customMenu"> <h3>Presentation:</h3> <p>Pong is a fast-paced virtual table tennis game.  </p><p> Your task is to prevent the ball from passing your paddle by moving it vertically.
              </p><p>Each time the ball gets past your opponent, you score a point. The first player to score three points wins.  </p><p>Quick reflexes and smart strategies are key to winning. Enjoy the game!</p>
                <h3>Commands:</h3> <p>Move paddle: arrow up and arrow down.</p></div>
            </div>
          )}
          {isGameStarted && (
            <div className="gameContainer">
              <div className="pongContainer">
                <Pong gameState={gameState} gameOptions={gameOptions} />
              </div>
              <div className="messagesContainer">
                {!isGameFinish && (<h2>Game starts in: {gameCountDown}</h2>)}

                {messages.map((message, index) => <p key={index}>{message}</p>)}
                {imAPlayer && !isGameFinish && (
                  <button onClick={handleForfeit}>Forfeit</button>
                )}
                {isGameOver && (
                  <button onClick={handleQuitGame}>Quit</button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="contentUnderNavbar">
        </div>
      )
    ) : (<div>

    </div>)
  );
};

export default Game;

