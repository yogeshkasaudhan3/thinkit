import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Phone, Lock, User, Home, MapPin, Hash, UserPlus, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '@/hooks/use-toast';

type Tab = 'login' | 'signup';

type LoginError =
  | { code: 'USER_NOT_FOUND'; mobile: string }
  | { code: 'WRONG_PASSWORD' }
  | { code: 'GENERIC'; message: string }
  | null;

interface LoginForm {
  mobile: string;
  password: string;
}

interface SignupForm {
  name: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  houseNumber: string;
  area: string;
  landmark: string;
  pincode: string;
}

const INITIAL_LOGIN: LoginForm = { mobile: '', password: '' };
const INITIAL_SIGNUP: SignupForm = {
  name: '', mobile: '', password: '', confirmPassword: '',
  houseNumber: '', area: '', landmark: '', pincode: '',
};

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { refreshAuth } = useApp();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState<LoginError>(null);

  const [login, setLogin] = useState<LoginForm>(INITIAL_LOGIN);
  const [signup, setSignup] = useState<SignupForm>(INITIAL_SIGNUP);

  const toastError = (msg: string) => toast({ title: msg, duration: 3000 });

  const switchToSignup = (mobile?: string) => {
    setTab('signup');
    if (mobile) setSignup(p => ({ ...p, mobile }));
  };

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!login.mobile.trim() || !login.password) {
      toastError('Please enter your mobile number and password');
      return;
    }
    if (!/^\d{10}$/.test(login.mobile.trim())) {
      toastError('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile: login.mobile.trim(), password: login.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'USER_NOT_FOUND') {
          setLoginError({ code: 'USER_NOT_FOUND', mobile: login.mobile.trim() });
        } else if (data.code === 'WRONG_PASSWORD') {
          setLoginError({ code: 'WRONG_PASSWORD' });
        } else {
          setLoginError({ code: 'GENERIC', message: data.error ?? 'Login failed' });
        }
        return;
      }

      await refreshAuth();
      setLocation('/home');
    } catch {
      setLoginError({ code: 'GENERIC', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Signup ──────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signup.name.trim()) { toastError('Full name is required'); return; }
    if (!/^\d{10}$/.test(signup.mobile.trim())) { toastError('Enter a valid 10-digit mobile number'); return; }
    if (signup.password.length < 6) { toastError('Password must be at least 6 characters'); return; }
    if (signup.password !== signup.confirmPassword) { toastError('Passwords do not match'); return; }
    if (!signup.houseNumber.trim()) { toastError('House number is required'); return; }
    if (!signup.area.trim()) { toastError('Area / Colony is required'); return; }
    if (!/^\d{6}$/.test(signup.pincode.trim())) { toastError('Enter a valid 6-digit pincode'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: signup.name.trim(),
          mobile: signup.mobile.trim(),
          password: signup.password,
          houseNumber: signup.houseNumber.trim(),
          area: signup.area.trim(),
          landmark: signup.landmark.trim(),
          pincode: signup.pincode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error ?? 'Sign up failed');
        return;
      }
      await refreshAuth();
      setLocation('/home');
    } catch {
      toastError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-white flex flex-col overflow-y-auto">

      {/* Hero */}
      <div className="bg-primary px-6 pt-14 pb-10 flex flex-col items-center">
        {/* Logo — no white box; logo has its own green bg that blends with the hero */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={{
            width: 112,
            height: 112,
            boxShadow:
              '0 12px 40px rgba(0,0,0,0.38), 0 4px 12px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <img src="/logo.png" alt="Thinkit" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Thinkit by Dwarika</h1>
        <p className="text-secondary text-sm font-medium mt-1 tracking-wide">Get It In Minutes</p>
      </div>

      {/* Tab Bar */}
      <div className="bg-primary px-6 pb-0">
        <div className="bg-white/10 rounded-t-2xl flex p-1 gap-1">
          <button
            onClick={() => { setTab('login'); setLoginError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === 'login'
                ? 'bg-white text-primary shadow-md'
                : 'text-white bg-white/[0.08] hover:bg-white/[0.14]'
            }`}
          >
            Existing Customer
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === 'signup'
                ? 'bg-white text-primary shadow-md'
                : 'text-white bg-white/[0.08] hover:bg-white/[0.14]'
            }`}
          >
            New Customer
          </button>
        </div>
      </div>

      {/* Forms */}
      <div className="flex-1 bg-white">
        <AnimatePresence mode="wait">

          {/* ── Login Form ── */}
          {tab === 'login' && (
            <motion.form
              key="login"
              onSubmit={handleLogin}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="px-6 py-6 flex flex-col gap-4"
            >
              <Field
                icon={<Phone size={18} />}
                label="Mobile Number"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={login.mobile}
                onChange={v => { setLogin(p => ({ ...p, mobile: v })); setLoginError(null); }}
              />

              <PasswordField
                label="Password"
                show={showPassword}
                onToggle={() => setShowPassword(p => !p)}
                value={login.password}
                onChange={v => { setLogin(p => ({ ...p, password: v })); setLoginError(null); }}
                placeholder="Enter your password"
              />

              {/* ── Inline error states ── */}
              <AnimatePresence>
                {loginError?.code === 'USER_NOT_FOUND' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 font-medium leading-snug">
                        You are a new customer. Please create an account first.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchToSignup(loginError.mobile)}
                      className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <UserPlus size={18} /> Sign Up Now
                    </button>
                  </motion.div>
                )}

                {loginError?.code === 'WRONG_PASSWORD' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 font-medium leading-snug">
                      Incorrect password. Please try again.
                    </p>
                  </motion.div>
                )}

                {loginError?.code === 'GENERIC' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 font-medium leading-snug">
                      {loginError.message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Forgot password */}
              <p className="text-center text-xs text-gray-400">
                Forgot password?{' '}
                <button
                  type="button"
                  onClick={() => window.open('https://wa.me/919876543210?text=Hi+Dwarika+Support,+I+forgot+my+password', '_blank')}
                  className="text-primary font-semibold underline underline-offset-2"
                >
                  Contact Dwarika Support
                </button>
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-1 disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
              >
                {loading ? 'Logging in…' : 'Login'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-1">
                New here?{' '}
                <button type="button" onClick={() => setTab('signup')} className="text-primary font-semibold">
                  Create an account
                </button>
              </p>
            </motion.form>
          )}

          {/* ── Signup Form ── */}
          {tab === 'signup' && (
            <motion.form
              key="signup"
              onSubmit={handleSignup}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="px-6 py-6 flex flex-col gap-4"
            >
              <SectionLabel>Personal Details</SectionLabel>

              <Field
                icon={<User size={18} />}
                label="Full Name"
                type="text"
                placeholder="Your full name"
                value={signup.name}
                onChange={v => setSignup(p => ({ ...p, name: v }))}
              />

              <Field
                icon={<Phone size={18} />}
                label="Mobile Number"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={signup.mobile}
                onChange={v => setSignup(p => ({ ...p, mobile: v }))}
              />

              <PasswordField
                label="Password"
                show={showPassword}
                onToggle={() => setShowPassword(p => !p)}
                value={signup.password}
                onChange={v => setSignup(p => ({ ...p, password: v }))}
                placeholder="Minimum 6 characters"
              />

              <PasswordField
                label="Confirm Password"
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword(p => !p)}
                value={signup.confirmPassword}
                onChange={v => setSignup(p => ({ ...p, confirmPassword: v }))}
                placeholder="Re-enter your password"
              />

              <SectionLabel>Delivery Address</SectionLabel>

              <Field
                icon={<Home size={18} />}
                label="House / Flat Number"
                type="text"
                placeholder="e.g. A-102, Green Residency"
                value={signup.houseNumber}
                onChange={v => setSignup(p => ({ ...p, houseNumber: v }))}
              />

              <Field
                icon={<MapPin size={18} />}
                label="Area / Colony"
                type="text"
                placeholder="e.g. Sector 15, Dwarka"
                value={signup.area}
                onChange={v => setSignup(p => ({ ...p, area: v }))}
              />

              <Field
                icon={<MapPin size={18} />}
                label="Landmark (optional)"
                type="text"
                placeholder="e.g. Near Metro Station"
                value={signup.landmark}
                onChange={v => setSignup(p => ({ ...p, landmark: v }))}
              />

              <Field
                icon={<Hash size={18} />}
                label="Pincode"
                type="tel"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit pincode"
                value={signup.pincode}
                onChange={v => setSignup(p => ({ ...p, pincode: v }))}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl mt-2 disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-1 pb-6">
                Already have an account?{' '}
                <button type="button" onClick={() => { setTab('login'); setLoginError(null); }} className="text-primary font-semibold">
                  Login
                </button>
              </p>
            </motion.form>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs font-bold uppercase tracking-widest text-primary/60">{children}</span>
      <div className="flex-1 h-px bg-primary/10" />
    </div>
  );
}

function Field({
  icon, label, value, onChange, ...inputProps
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
        <span className="text-gray-400 shrink-0">{icon}</span>
        <input
          {...inputProps}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
        />
      </div>
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
          onChange={e => onChange(e.target.value)}
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
