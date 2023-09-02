import { createContext } from 'react';

interface PrevMessagesContextProps {
    prevMessages: string[];
    setPrevMessages: (value: string[]) => void;
}

const PrevMessagesContext = createContext<PrevMessagesContextProps>({
  prevMessages: [],
  setPrevMessages: (value: string[]) => {},
});

export default PrevMessagesContext;