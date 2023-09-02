import { createContext } from 'react';

const NavbarContext = createContext({
  showNav: true,
  setShowNav: (value: boolean) => {},
});

export default NavbarContext;
