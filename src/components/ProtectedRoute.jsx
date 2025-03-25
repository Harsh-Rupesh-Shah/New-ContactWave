import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Cookies from 'js-cookie';

function ProtectedRoute({ children, requireAdmin }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get('token');
    const storedUser = Cookies.get('user');

    if (token && !user && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        navigate('/login');
      }
    }
  }, [user, setUser, navigate]);

  const token = Cookies.get('token');
  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && (!user || !user.isAdmin)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default ProtectedRoute;