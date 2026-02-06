import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      // Check for base64 encoded auth data from backend (new flow)
      const authParam = searchParams.get('auth');
      if (authParam) {
        try {
          const authDataJson = atob(authParam);
          const authData = JSON.parse(authDataJson);

          // Store tokens
          localStorage.setItem('token', authData.accessToken);
          if (authData.refreshToken) {
            localStorage.setItem('refreshToken', authData.refreshToken);
          }

          // Redirect to admin dashboard
          navigate('/admin');
          return;
        } catch (e) {
          console.error('Failed to parse auth data:', e);
          setError('登录失败：无效的认证数据');
          return;
        }
      }

      // Fallback: check for tokens in URL hash or query params (old flow)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get('access_token') || searchParams.get('access_token');
      const refreshToken = params.get('refresh_token') || searchParams.get('refresh_token');

      if (accessToken) {
        // Store tokens
        localStorage.setItem('token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Redirect to admin dashboard
        navigate('/admin');
      } else {
        setError('登录失败：未收到访问令牌');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">❌</div>
            <h2 className="text-lg font-semibold mb-2">登录失败</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              重新登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在处理登录...</p>
      </div>
    </div>
  );
}
