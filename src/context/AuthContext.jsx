import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [registrationData, setRegistrationData] = useState(null);

  return (
    <AuthContext.Provider value={{ user, setUser, registrationData, setRegistrationData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);