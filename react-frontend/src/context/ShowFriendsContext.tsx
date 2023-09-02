import { createContext } from 'react';

const ShowFriendsContext = createContext({
  showFriends: false,
  setShowFriends: (value: boolean) => {},
});

export default ShowFriendsContext;