import { createContext } from 'react';

const MyPseudoContext = createContext({
  myPseudo: "",
  setMyPseudo: (value: string) => {},
});

export default MyPseudoContext;