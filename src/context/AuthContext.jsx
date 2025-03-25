import React, { createContext, useState, useContext, useEffect } from 'react';
import Cookies from 'js-cookie';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);

  useEffect(() => {
    // Check for token in cookies on mount
    const token = Cookies.get('token');
    if (token) {
      // If token exists, set user from stored data
      const storedUser = Cookies.get('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    // Store user data in cookies
    Cookies.set('user', JSON.stringify(userData), { expires: 7 });
  };

  const logout = () => {
    setUser(null);
    // Clear cookies
    Cookies.remove('token');
    Cookies.remove('user');
    Cookies.remove('spreadsheetId');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: login,
      logout,
      registrationData, 
      setRegistrationData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);