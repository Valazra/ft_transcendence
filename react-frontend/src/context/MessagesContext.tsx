import { createContext } from 'react';

interface MessagesContextProps {
  messages: string[];
  setMessages: (value: string[]) => void;
}

const MessagesContext = createContext<MessagesContextProps>({
  messages: [],
  setMessages: (value: string[]) => {},
});

export default MessagesContext;