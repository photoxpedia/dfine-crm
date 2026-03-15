import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, CheckCircle, Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const passwordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password');

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const magicLinkForm = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    try {
      const response = await authApi.login(data.email, data.password);
      setUser(response.data.user);
      setToken(response.data.token);

      // Redirect based on role
      const role = response.data.user.role;
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'designer') {
        navigate('/designer');
      } else {
        navigate('/client');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMagicLinkSubmit = async (data: MagicLinkFormData) => {
    setIsSubmitting(true);
    try {
      await authApi.requestMagicLink(data.email);
      setEmailSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send login link');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-600 mb-6">
              We've sent a login link to <strong>{magicLinkForm.getValues('email')}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link in the email to sign in. The link expires in 15 minutes.
            </p>
            <button
              onClick={() => setEmailSent(false)}
              className="text-sm text-designer-600 hover:text-designer-700 font-medium"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-designer-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">RS</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ReModel Sync</h1>
          <p className="text-gray-600 mt-2">AI-first CRM for Remodeling Companies</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Login mode tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMode === 'password'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Lock className="w-4 h-4" />
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('magic')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginMode === 'magic'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Magic Link
            </button>
          </div>

          {loginMode === 'password' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in</h2>
              <p className="text-gray-600 mb-6">
                Enter your email and password to continue.
              </p>

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...passwordForm.register('email')}
                      type="email"
                      id="email"
                      placeholder="you@example.com"
                      className={`input pl-10 ${passwordForm.formState.errors.email ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {passwordForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...passwordForm.register('password')}
                      type="password"
                      id="password"
                      placeholder="Enter your password"
                      className={`input pl-10 ${passwordForm.formState.errors.password ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.password.message}</p>
                  )}
                  <div className="text-right">
                    <Link
                      to="/auth/forgot-password"
                      className="text-sm text-designer-600 hover:text-designer-700 font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-designer w-full py-2.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in with Magic Link</h2>
              <p className="text-gray-600 mb-6">
                Enter your email to receive a secure login link.
              </p>

              <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...magicLinkForm.register('email')}
                      type="email"
                      id="magic-email"
                      placeholder="you@example.com"
                      className={`input pl-10 ${magicLinkForm.formState.errors.email ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {magicLinkForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">{magicLinkForm.formState.errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-designer w-full py-2.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending link...
                    </>
                  ) : (
                    'Send login link'
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-designer-600 hover:text-designer-700 font-medium">
                Create one free
              </Link>
            </p>
            <p className="text-sm text-gray-500">
              Are you a client?{' '}
              <span className="text-gray-700">
                Use the invitation link from your designer.
              </span>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} ReModel Sync
        </p>
      </div>
    </div>
  );
}
