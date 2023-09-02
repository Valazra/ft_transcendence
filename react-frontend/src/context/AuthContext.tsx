import { createContext } from 'react';

const AuthContext = createContext({
  authenticated: false,
  setAuthenticated: (value: boolean) => {},
});

export default AuthContext;
