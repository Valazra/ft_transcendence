import { createContext } from 'react';

const MyPseudoIdContext = createContext<{
  myPseudoId: number | undefined;
  setMyPseudoId: (value: number) => void;
}>({
  myPseudoId: undefined,
  setMyPseudoId: (value: number) => {},
});

export default MyPseudoIdContext;