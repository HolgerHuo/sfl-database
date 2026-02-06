import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Check if token is not expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp >= currentTime) {
          // Token is valid, redirect to admin
          navigate('/admin');
          return;
        }
      } catch (e) {
        // Token is invalid, continue to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }

    // Auto-redirect to OIDC login
    api.login();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在跳转到登录页面...</p>
      </div>
    </div>
  );
}
