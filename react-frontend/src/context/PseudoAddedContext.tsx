import { createContext } from 'react';

const PseudoAddedContext = createContext({
  pseudoAdded: false,
  setPseudoAdded: (value: boolean) => {},
});

export default PseudoAddedContext;