import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ClientInvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
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
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.error || 'Failed to verify invitation');
      }
    };

    verifyInvite();
  }, [token, login]);

  const handleSetPassword = async () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSettingPassword(true);
    try {
      await authApi.setPassword(password);
      setPasswordSet(true);
      toast.success('Password set! You can now log in with your email and password.');
      setTimeout(() => {
        navigate('/client');
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to set password');
    } finally {
      setSettingPassword(false);
    }
  };

  const handleSkip = () => {
    navigate('/client');
  };

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

          {status === 'success' && !passwordSet && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to ReModel Sync!
              </h1>
              <p className="text-gray-600 mb-6">Your access has been set up successfully.</p>

              {/* Optional password setting */}
              <div className="border-t border-gray-200 pt-6 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Set a password for future login (optional)
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  This lets you log in anytime without needing a new invite link.
                </p>
                <div className="space-y-3 text-left">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="New password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10 text-sm"
                      disabled={settingPassword}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input pl-10 text-sm"
                      disabled={settingPassword}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSetPassword}
                      disabled={settingPassword || !password}
                      className="btn btn-client flex-1 py-2 text-sm"
                    >
                      {settingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Setting...
                        </>
                      ) : (
                        'Set Password'
                      )}
                    </button>
                    <button
                      onClick={handleSkip}
                      className="btn btn-secondary flex-1 py-2 text-sm"
                      disabled={settingPassword}
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {status === 'success' && passwordSet && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Password Set!
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
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Please contact your designer for a new invitation link.
                </p>
                <p className="text-sm text-gray-500">
                  If you already have a password,{' '}
                  <Link to="/login" className="text-client-600 hover:text-client-700 font-medium">
                    try logging in
                  </Link>
                  .
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
