import { createContext } from 'react';

const ActualChanContext = createContext({
  actualChan: "Global Chat",
  setActualChan: (value: string) => {},
});

export default ActualChanContext;