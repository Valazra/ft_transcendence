import { createContext} from "react";
import { Socket } from "socket.io-client";

const SocketContext = createContext<{
  socket: Socket | undefined;
  setSocket: (value: Socket) => void;
}>({
  socket: undefined,
  setSocket: (value: Socket) => {},
});

export default SocketContext;