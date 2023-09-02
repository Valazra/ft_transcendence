import { useCallback, useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Navbar from "./components/Navbar/Nav";
import api from "./Api/api";
import Connect from "./components/Connection/Connect";
import './assets/global.css';
import './assets/connect.css';
import Game from "./components/Game/Game";
import Profile from "./components/Profile/Profile";
import AuthContext from "./context/AuthContext";
import SocketContext from "./context/SocketContext";
import PseudoAddedContext from "./context/PseudoAddedContext";
import io, { Socket } from "socket.io-client";
import MyPseudoIdContext from './context/MyPseudoIdContext';
import MyPseudoContext from './context/MyPseudoContext';
import MessagesContext from './context/MessagesContext';
import PrevMessagesContext from "./context/PrevMessagesContext";
import ShowChatContext from "./context/ShowChatContext";
import NavbarContext from "./context/NavbarContext";
import TwoFA from "./components/Connection/TwoFA";
import Matchmaking from "./components/Matchmaking/Matchmaking";

function App() {
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const [authenticated, setAuthenticated] = useState(false);
  const [pseudoAdded, setPseudoAdded] = useState(false);
  const [myPseudoId, setMyPseudoId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [myPseudo, setMyPseudo] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [prevMessages, setPrevMessages] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showNav, setShowNav] = useState(true);

  const fetchUserData = () => {
    api
      .get("/users/user")
      .then((response) => {
        setAuthenticated(true);
        setMyPseudoId(response.data.user.id);
        setMyPseudo(response.data.user.pseudo);
        setIsLoading(false);
      })
      .catch(() => {
        setAuthenticated(false);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const messageListener = useCallback((messages: string) => {
    setMessages(prevMessages => [...prevMessages, messages]);
  }, [setMessages]);


  useEffect(() => {
    if (authenticated) {
      const newSocket = io("http://localhost:5000");
      setSocket(newSocket);
      newSocket.emit('userConnected', myPseudoId);
      newSocket?.on("createMessage", messageListener);
      newSocket?.on("joinChan", messageListener);
      newSocket?.on("leaveChan", messageListener);

    }
  }, [authenticated, myPseudoId, messageListener]);

  if (isLoading) {
    return (<div></div>)
  };

  function NotFound() {
    return (<div className="contentUnderNavbar"><h1>Page not found</h1></div>);
  }
  return (
    <div className="app">

      <SocketContext.Provider value={{ socket, setSocket }}>
        <AuthContext.Provider value={{ authenticated, setAuthenticated }}>
          <NavbarContext.Provider value={{ showNav, setShowNav }}>
            <MyPseudoIdContext.Provider value={{ myPseudoId, setMyPseudoId }}>
              <MyPseudoContext.Provider value={{ myPseudo, setMyPseudo }}>
                <PseudoAddedContext.Provider value={{ pseudoAdded, setPseudoAdded }}>
                  <MessagesContext.Provider value={{ messages, setMessages }}>
                    <PrevMessagesContext.Provider value={{ prevMessages, setPrevMessages }}>
                      <ShowChatContext.Provider value={{ showChat, setShowChat }}>
                        <Router>
                          {authenticated ?
                            (
                              <>
                                <Navbar />
                                <Routes>
                                  <Route path="/" element={<Home />} />
                                  <Route path="/profile" element={<Profile />} />
                                  <Route path="/profile/:userId" element={<Profile />} />
                                  <Route path="/game/:gameIdParam" element={<Game />} />
                                  <Route path="/matchmaking" element={<Matchmaking />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </>
                            )
                            :
                            (
                              <>
                                <Routes>
                                  <Route path="/twofa" element={<TwoFA />} />
                                  <Route path="/" element={<Connect />} />
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </>
                            )}
                        </Router>
                      </ShowChatContext.Provider>
                    </PrevMessagesContext.Provider>
                  </MessagesContext.Provider>
                </PseudoAddedContext.Provider>
              </MyPseudoContext.Provider>
            </MyPseudoIdContext.Provider>
          </NavbarContext.Provider>
        </AuthContext.Provider>
      </SocketContext.Provider>
    </div>
  );
}

export default App;