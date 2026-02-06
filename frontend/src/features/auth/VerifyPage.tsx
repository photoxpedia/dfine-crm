import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setError('Invalid login link. No token provided.');
        return;
      }

      try {
        const response = await authApi.verifyMagicLink(token);
        const { user, token: jwtToken } = response.data;

        login(user, jwtToken);
        setStatus('success');

        // Redirect based on role
        setTimeout(() => {
          switch (user.role) {
            case 'admin':
              navigate('/admin');
              break;
            case 'designer':
              navigate('/designer');
              break;
            case 'client':
              navigate('/client');
              break;
            default:
              navigate('/');
          }
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.error || 'Failed to verify login link');
      }
    };

    verifyToken();
  }, [token, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-designer-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Verifying your login...
              </h1>
              <p className="text-gray-600">Please wait while we sign you in.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Successfully signed in!
              </h1>
              <p className="text-gray-600">Redirecting you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to sign in
              </h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-designer"
              >
                Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
