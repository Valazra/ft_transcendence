import { useCallback, useContext, useEffect, useRef, useState } from "react";
import PseudoAddedContext from "../../context/PseudoAddedContext";
import MyPseudoContext from '../../context/MyPseudoContext';
import api from "../../Api/api";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import '../../assets/global.css';
import '../../assets/profile.css';
import ShowChatContext from "../../context/ShowChatContext";
import SocketContext from "../../context/SocketContext";
import MyPseudoIdContext from '../../context/MyPseudoIdContext';

type Game = {
  id: number;
  firstPlayerId: number;
  secondPlayerId: number;
 firstPlayer: User;
 secondPlayer: User;
  firstPlayerScore: number;
  secondPlayerScore: number;
 winner: number;
};

type User = { pseudo: string; id: number; isConnected: boolean; isInGame: boolean; };

const Profile: React.FC = () => {
  const { pseudoAdded, setPseudoAdded } = useContext(PseudoAddedContext);
  const { showChat, setShowChat } = useContext(ShowChatContext);
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarSrc, setAvatarSrc] = useState('');
  const [emailUser, setEmailUser] = useState("");
  const { userId } = useParams();
  const [pseudoUser, setPseudoUser] = useState("");
  const [newPseudo, setNewPseudo] = useState("");
  const [error, setError] = useState(false);
  const { myPseudo, setMyPseudo } = useContext(MyPseudoContext);
  const [myProfile, setMyProfile] = useState(false);
  const [errorPseudo, setErrorPseudo] = useState("");
  const [receiverId, setReceiverId] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const { socket } = useContext(SocketContext);
  const [isChecked, setIsChecked] = useState(false);
  const [qrCodeDataURL, setQRCodeDataURL] = useState('')
  const { myPseudoId } = useContext(MyPseudoIdContext);
  const [gameHistory, setGameHistory] = useState<Game[]>([]);
  const [isShowingHistory, setIsShowingHistory] = useState(false);
  const [userStats, setUserStats] = useState<{ winCount: number; lossCount: number } | null>(null);
  const [isShowingStats, setIsShowingStats] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const actualUser = useRef("");
  const [errorAvatar, setErrorAvatar] = useState("");

  const fetchUserStats = useCallback(() => {
    api
      .get(`/game/${receiverId}/stats`)
      .then((response) => {
        setUserStats({ winCount: response.data.winCount, lossCount: response.data.lossCount });
      })
      .catch(() => {
        console.log("fetchUserStats", receiverId);
      });
  }, [receiverId]);

  const handleShowStats = () => {
    setErrorPseudo("");
    setNewPseudo("");
    setIsShowingStats(true);
    fetchUserStats();
  };

  const handleBackToProfileFromStats = () => {
    setIsShowingStats(false);
  };

  const fetchGameHistory = useCallback(() => {
    api
      .get(`/game/${receiverId}/game-history`)
      .then((response) => {
        setGameHistory(response.data);
      })
      .catch(() => {
        console.log("fetchGameHistory", receiverId);
      });
  }, [receiverId]);


  const fetchUserPseudoAdded = useCallback(() => {
    api
      .get("/users/user")
      .then((response) => {
        if (response.data.user.pseudo === null) {
          setPseudoAdded(false);
          navigate('/')
        }
        else {
          setPseudoAdded(true);
          setMyPseudo(response.data.user.pseudo);
        }
      })
      .catch(() => {
      });
  }, [setPseudoAdded, setMyPseudo, navigate]);

  const handleShowHistory = () => {
    setErrorPseudo("");
    setNewPseudo("");
    setIsShowingHistory(true);
    fetchGameHistory();
  };

  const handleBackToProfile = () => {
    setIsShowingHistory(false);
  };

  const fetchUserInfos = useCallback(() => {
    api
      .get(`/users/getOneUserById/${userId}`)
      .then((response) => {
        if (response.data.success === true) {
          setEmailUser(response.data.user.email);
          setPseudoUser(response.data.user.pseudo);
          setReceiverId(response.data.user.id);
          actualUser.current = response.data.user.id;
          setError(false);
          setIsChecked(response.data.user.doubleAuth);
          if (response.data.user.pseudo === myPseudo) {
            setMyProfile(true);
          }
          else {
            setMyProfile(false);
            axios.get(`http://localhost:5000/users/isUserBlocked?receiverId=${receiverId}`, { withCredentials: true })
              .then((response2) => {
                if (response2.data.isBlocked === true) {
                  setIsBlocked(true);
                }
                else {
                  setIsBlocked(false);
                }
              })
              .catch(() => {
              })
            axios.get(`http://localhost:5000/friends/isMyFriend?receiverId=${receiverId}`, { withCredentials: true })
            .then((response3) => { 
              if (response3.data.isMyFriend === true) {
                setIsFriend(true);
              }
              else {
                setIsFriend(false);
              }
            })
            .catch(() => {
              console.log("fetchUserInfos");
            })
          }
        }
        else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      })
  }, [setEmailUser, setPseudoUser, setError, setMyProfile, setIsFriend, userId, myPseudo, receiverId]);

  const fetchAvatar = useCallback(async (userId: number | undefined) => {
    const response = await api.get(`/users/avatar/${userId}`, { responseType: 'blob' });
    const objectURL = URL.createObjectURL(response.data);
    setAvatarSrc(objectURL);
  }, [setAvatarSrc]);

  useEffect(() => {
    fetchUserPseudoAdded();
    if (receiverId)
      fetchAvatar(receiverId);
    fetchUserInfos();
  }, [fetchUserPseudoAdded, fetchAvatar, fetchUserInfos, receiverId]);

  useEffect(() => {
    socket?.on('changePseudo', (userId, userPseudo) => {
      if (userId === receiverId)
        setPseudoUser(userPseudo);
    });

    return () => {
      socket?.off('changePseudo', (userId, userPseudo) => {
        if (userId === receiverId)
          setPseudoUser(userPseudo);
      });
    }
  }, [myPseudoId, setPseudoUser, socket, receiverId])

  useEffect(() => {
    socket?.on('unblockUser', (userTargetId) => {
      if (userTargetId === receiverId)
        setIsBlocked(false);
    });

    return () => {
      socket?.off('unblockUser', (userTargetId) => {
        if (userTargetId === receiverId)
          setIsBlocked(false);
      });
    }
  }, [socket, receiverId, setIsBlocked])

  useEffect(() => {
    socket?.on('blockUser', (userTargetId) => {
      if (userTargetId === receiverId)
        setIsBlocked(true);
    });

    return () => {
      socket?.off('blockUser', (userTargetId) => {
        if (userTargetId === receiverId)
          setIsBlocked(true);
      });
    }
  }, [socket, receiverId, setIsBlocked])

  useEffect(() => {
    socket?.on('friendRequestFromAccepted', ({ user }: { user: User }) => {
      if (!myProfile && parseInt(actualUser.current) === user.id) {
        setIsFriend(true);
      }
    });

    return () => {
      socket?.off('friendRequestFromAccepted', ({ user }: { user: User }) => {
        if (!myProfile && parseInt(actualUser.current) === user.id) {
          setIsFriend(true);
        }
      });
    }
  }, [socket, setIsFriend, myProfile])

  useEffect(() => {
    socket?.on('friendRequestToAccepted', ({ user }: { user: User }) => {
      if (!myProfile && parseInt(actualUser.current) === user.id) {
        setIsFriend(true);
      }
    });

    return () => {
      socket?.off('friendRequestToAccepted', ({ user }: { user: User }) => {
        if (!myProfile && parseInt(actualUser.current) === user.id) {
          setIsFriend(true);
        }
      });
    }
  }, [setIsFriend, myProfile, socket]);

  useEffect(() => {
    socket?.on('removeMyFriend', ({ user }: { user: User }) => {
      if (!myProfile && parseInt(actualUser.current) === user.id) {
        setIsFriend(false);
      }
    });

    return () => {
      socket?.off('removeMyFriend', ({ user }: { user: User }) => {
        if (!myProfile && parseInt(actualUser.current) === user.id) {
          setIsFriend(false);
        }
      });
    }
  }, [setIsFriend, myProfile, socket]);

  useEffect(() => {
    socket?.on('removedByMyFriend', ({ user }: { user: User }) => {
      if (!myProfile && parseInt(actualUser.current) === user.id) {
        setIsFriend(false);
      }
    });

    return () => {
      socket?.off('removedByMyFriend', ({ user }: { user: User }) => {
        if (!myProfile && parseInt(actualUser.current) === user.id) {
          setIsFriend(false);
        }
      });
    }
  }, [setIsFriend, myProfile, socket]);

  const handlePseudoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewPseudo(event.target.value);
  };

  const handleSubmitNewPseudo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorAvatar("");
    if (newPseudo.length > 3 && newPseudo.length < 13 && /^[a-zA-Z]+$/.test(newPseudo)) {
      axios.patch('http://localhost:5000/users/changePseudo', { newPseudo }, { withCredentials: true })
        .then((response) => {
          if (response.data.error) {
            setErrorPseudo("This pseudo is already used.");
          }
          else {
            socket?.emit("changePseudo", newPseudo);
            setNewPseudo("")
          }
        })
        .catch(() => {
          console.log("handleSubmitNewPseudo");
        })
    }
    else {
      if (newPseudo.length <= 3) {
        setErrorPseudo("Pseudo must have minimum 4 characters.");
      }
      else if (newPseudo.length >= 13) {
        setErrorPseudo("Pseudo must have maximum 12 characters.");
      }
      else if (/^[a-zA-Z]+$/.test(newPseudo) === false) {
        setErrorPseudo("Pseudo must contains only letters.");
      }
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmitAvatar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorPseudo("");
    setErrorAvatar("");
    if (selectedFile) {
      const formData = new FormData();
      formData.append('avatar', selectedFile);
      await axios.post('http://localhost:5000/users/addAvatar', formData, { withCredentials: true })
        .then(() => {
          fetchAvatar(myPseudoId);
        })
        .catch((error) => {
          if (error.response && error.response.data && error.response.data.error) {
            setErrorAvatar(error.response.data.error);
          }     
          else {
            setErrorAvatar("Erreur lors de l'envoi de l'image");
          }
          console.log("handleSubmitAvatar")
        })
    }
  }

  const handleSubmitSendFriendRequest = () => {
    setErrorPseudo("");
    setErrorAvatar("");
    socket?.emit('friendRequestSent', { fromId: myPseudoId, toId: receiverId });     
  }

  const handleSubmitBlockUser = () => {
    setErrorPseudo("");
    setErrorAvatar("");
    axios.post('http://localhost:5000/users/blockUser', { receiverId }, { withCredentials: true })
      .then((response) => {
        setIsBlocked(true);
      })
      .catch(() => {
        console.log("handleSubmitBlockUser");
      })
  }

  const handleSubmitUnblockUser = () => {
    setErrorPseudo("");
    setErrorAvatar("");
    axios.patch('http://localhost:5000/users/unblockUser', { receiverId }, { withCredentials: true })
      .then((response) => {
        setIsBlocked(false);
      })
      .catch(() => {
        console.log("handleSubmitUnblockUser");
      })
  }

  const handleCheckboxChange = () => {
    axios.get(`http://localhost:5000/users/change2FA`, { withCredentials: true })
      .then((response) => {
        setIsChecked(!isChecked);
        if (response.data.user) {
          setQRCodeDataURL('');
        }
        else {
          setQRCodeDataURL(response.data);
        }
      })
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

  const renderProfileError = () => (
    <div className="contentUnderNavbar">
      Error : User not found
    </div>
  );

  const renderMyProfile = () => (
    <div className="contentUnderNavbar">
      <h1> {pseudoUser} </h1>
      <div>
        <img src={avatarSrc} alt="avatar" />
      </div>
      <div className="profile_div">
        Email : {emailUser}
      </div>
      <div className="profile_div">
        2FA : <input type="checkbox" checked={isChecked} onChange={handleCheckboxChange} />
        {qrCodeDataURL !== '' ? (
          <div>
            <img src={qrCodeDataURL} alt="QR Code" />
          </div>
        ) : null}
      </div>
      <div className="profile_div">
        <form onSubmit={handleSubmitNewPseudo}>
          <label>
            Modify your pseudo :&nbsp;
          </label>
          <input className="input_profile" type="text" onChange={handlePseudoChange} value={newPseudo} />
          <button className="button_profile" type="submit">
            Modify
          </button>
        </form>
        {errorPseudo ? (
          <div>
            {errorPseudo}
          </div>
        ) : null}
      </div>
      <div className="profile_div">
        <form onSubmit={handleSubmitAvatar}>
          <label>
            Modify your avatar :&nbsp;
          </label>
          <input className="input_profile" type="file" onChange={handleFileChange} accept=".jpg,.jpeg,.png" />
          <button className="button_profile" type="submit" disabled={!selectedFile}>
            Modify
          </button>
        </form>
        {errorAvatar ? (
          <div>
            {errorAvatar}
          </div>
        ) : null}
      </div>
      <div className="profile_div">
        <button className="button_profile" onClick={handleShowHistory}>
          Afficher l'historique des parties
        </button>
        <button className="button_profile" onClick={handleShowStats}>
          Afficher les statistiques du joueur
        </button>
      </div>
    </div>
  );

  const renderBlockedProfile = () => (
    <div className="contentUnderNavbar">
      <h1> {pseudoUser} </h1>
      <div>
        <img src={avatarSrc} alt="avatar" />
      </div>
      <div className="profile_div">
        Email : {emailUser}
      </div>
      <div className="profile_div">
        Pseudo : {pseudoUser}
      </div>
      {isFriend === false ? (
        <div>
          <button className="buttonPseudo" onClick={handleSubmitSendFriendRequest}>Send Friend Request</button>
        </div>
      ) : null}
      <div>
        <button className="buttonPseudo" onClick={handleSubmitUnblockUser}>Unblock User</button>
      </div>
      <button className="button_profile" onClick={handleShowHistory}>
          Afficher l'historique des parties
        </button>
        <button className="button_profile" onClick={handleShowStats}>
  Afficher les statistiques du joueur
</button>
    </div>
  );

  const renderUnblockedProfile = () => (
    <div className="contentUnderNavbar">
     <h1> {pseudoUser} </h1>
      <div>
        <img src={avatarSrc} alt="avatar" />
      </div>
      <div className="profile_div">
        Email : {emailUser}
      </div>
      <div className="profile_div">
        Pseudo : {pseudoUser}
      </div>
      {isFriend === false ? (
        <div>
          <button className="buttonPseudo" onClick={handleSubmitSendFriendRequest}>Send Friend Request</button>
        </div>
      ) : null}
      <div>
        <button className="buttonPseudo" onClick={handleSubmitBlockUser}>Block User</button>
      </div>
      <button className="button_profile" onClick={handleShowHistory}>
          Afficher l'historique des parties
        </button>
        <button className="button_profile" onClick={handleShowStats}>
  Afficher les statistiques du joueur
</button>
    </div>
  );

  const renderUserStats = () => (
    <div className="contentUnderNavbar">
      <h1> Statistiques du joueur </h1>
      {userStats ? (
        <div>
          <h2>Nombre de victoires : {userStats.winCount}</h2>
          <h2>Nombre de défaites : {userStats.lossCount}</h2>
        </div>
      ) : (
        <p>Chargement des statistiques...</p>
      )}
      <button className="button_profile" onClick={handleBackToProfileFromStats}>
        Retourner au profil
      </button>
    </div>
  );

  const renderProfile = () => {
    if (isShowingHistory) return renderGameHistory();
    if (isShowingStats) return renderUserStats();
    if (myProfile) return renderMyProfile();
    return isBlocked ? renderBlockedProfile() : renderUnblockedProfile();
  };

  const renderGameHistory = () => (
   
    <div className="contentUnderNavbar">
      <h1> Historique des parties </h1>
      {gameHistory.map(game => (
        <div key={game.id}>
          <h2>Partie {game.id}</h2>
          <p>
            <span style={{ color: game.winner === game.firstPlayer.id ? 'green' : 'red' }}>
              {game.firstPlayer.pseudo}
            </span>: {game.firstPlayerScore} - 
            <span style={{ color: game.winner === game.secondPlayer.id ? 'green' : 'red' }}>
              {game.secondPlayer.pseudo}
            </span>: {game.secondPlayerScore}
          </p>
        </div>
      ))}
      <button className="button_profile" onClick={handleBackToProfile}>
        Retourner au profil
      </button>
    </div>
  );
  

  return (
    showChat === false ? (
      pseudoAdded ? (
        error ? renderProfileError() : renderProfile()
      ) : (
        <div className="contentUnderNavbar">
          PAGE PROFILE PSEUDO PAS MIS
        </div>
      )
    ) : (
      <div>
      </div>
    )
  );

};
export default Profile;