import { createContext } from 'react';

const ShowChatContext = createContext({
  showChat: false,
  setShowChat: (value: boolean) => {},
});

export default ShowChatContext;