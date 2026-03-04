import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';

export default function EmailVerificationBanner() {
  const { user } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user is verified, not logged in, or dismissed
  if (!user || user.isEmailVerified !== false || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      const response = await authApi.resendVerification();
      toast.success(response.data.message || 'Verification email sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send verification email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Please verify your email address. Check your inbox for a verification link.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleResend}
            disabled={sending}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend'
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-800 p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
