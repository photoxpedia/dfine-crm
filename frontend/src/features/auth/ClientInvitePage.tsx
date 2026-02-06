import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ClientInvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const verifyInvite = async () => {
      if (!token) {
        setStatus('error');
        setError('Invalid invitation link. No token provided.');
        return;
      }

      try {
        const response = await authApi.verifyClientInvite(token);
        const { user, token: jwtToken } = response.data;

        login(user, jwtToken);
        setStatus('success');

        setTimeout(() => {
          navigate('/client');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.error || 'Failed to verify invitation');
      }
    };

    verifyInvite();
  }, [token, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-client-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Setting up your access...
              </h1>
              <p className="text-gray-600">Please wait while we prepare your project portal.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to D'Fine Kitchen & Bath Remodeling!
              </h1>
              <p className="text-gray-600">Redirecting you to your project...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to access
              </h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <p className="text-sm text-gray-500">
                Please contact your designer for a new invitation link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
