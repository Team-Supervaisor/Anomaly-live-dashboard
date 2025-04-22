import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [streamDetails, setStreamDetails] = useState(null);

  // Initialize state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const expiration = localStorage.getItem('authExpiration');
    if (expiration) {
        const expirationTime = parseInt(expiration);
        if (new Date().getTime() > expirationTime) {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('authExpiration');
            localStorage.removeItem('user');
            return false;
        }
    }
    return localStorage.getItem('isAuthenticated') === 'true';
});
  
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ 
      isAuthenticated, 
      login, 
      logout,
      user,
      setUser,
      streamDetails,
      setStreamDetails
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};