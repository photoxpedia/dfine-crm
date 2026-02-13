import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, User, Lock, Building, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { organizationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const acceptSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type AcceptFormData = z.infer<typeof acceptSchema>;

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { setUser, setToken } = useAuthStore();

  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AcceptFormData>({
    resolver: zodResolver(acceptSchema),
  });

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    organizationApi
      .verifyInvite(token)
      .then((res) => {
        setInviteInfo(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Invalid or expired invitation');
        setLoading(false);
      });
  }, [token]);

  const onSubmit = async (data: AcceptFormData) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const response = await organizationApi.acceptInvite({
        token,
        name: data.name,
        password: data.password,
      });
      setUser(response.data.user);
      setToken(response.data.token);
      toast.success('Welcome to the team!');
      const role = response.data.user.role;
      navigate(role === 'admin' ? '/admin' : '/designer');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/login" className="text-designer-600 hover:text-designer-700 font-medium">
              Go to Login
            </Link>
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
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join the Team</h1>
          <p className="text-gray-600 mt-2">
            You've been invited to join <strong>{inviteInfo?.organizationName}</strong>
          </p>
          {inviteInfo?.invitedBy && (
            <p className="text-sm text-gray-500 mt-1">
              Invited by {inviteInfo.invitedBy}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...form.register('name')}
                  type="text"
                  placeholder="John Smith"
                  className={`input pl-10 ${form.formState.errors.name ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="w-4 h-4" />
                <span>Email: <strong>{inviteInfo?.email}</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Create a password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...form.register('password')}
                  type="password"
                  placeholder="At least 8 characters"
                  className={`input pl-10 ${form.formState.errors.password ? 'input-error' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {form.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
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
                  Joining...
                </>
              ) : (
                'Accept & Join Team'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-designer-600 hover:text-designer-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
