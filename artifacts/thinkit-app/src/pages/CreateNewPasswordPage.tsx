import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

// Shown when a customer logs in with a temporary password issued by an
// admin (manual password reset). They must set a new permanent password
// here before they can access any other part of the app.
export default function CreateNewPasswordPage() {
  const { refreshAuth, logout } = useApp();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', duration: 3000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', duration: 3000 });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-forced-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? 'Failed to save password', duration: 3000 });
        return;
      }
      // Refresh auth state so forcePasswordChange flips off and the customer
      // is taken to the normal app.
      await refreshAuth();
    } catch {
      toast({ title: 'Network error. Please try again.', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-white flex flex-col">
      <div className="bg-primary px-6 pt-14 pb-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
          <ShieldCheck className="text-white" size={30} />
        </div>
        <h1 className="text-white text-xl font-bold tracking-tight text-center">Create New Password</h1>
        <p className="text-secondary text-sm font-medium mt-1 text-center">
          For your security, please set a new password before continuing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 bg-white px-6 py-8 flex flex-col gap-4">
        <PasswordField
          label="New Password"
          show={show}
          onToggle={() => setShow((s) => !s)}
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Minimum 6 characters"
        />
        <PasswordField
          label="Confirm Password"
          show={showConfirm}
          onToggle={() => setShowConfirm((s) => !s)}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your new password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-2 disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
        >
          {loading ? 'Saving…' : 'Save Password'}
        </button>

        <button
          type="button"
          onClick={() => logout()}
          className="text-center text-xs text-gray-400 mt-2"
        >
          Log out instead
        </button>
      </form>
    </div>
  );
}

function PasswordField({
  label, show, onToggle, value, onChange, placeholder,
}: {
  label: string;
  show: boolean;
  onToggle: () => void;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
        <span className="text-gray-400 shrink-0"><Lock size={18} /></span>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
        />
        <button type="button" onClick={onToggle} className="text-gray-400 shrink-0">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
