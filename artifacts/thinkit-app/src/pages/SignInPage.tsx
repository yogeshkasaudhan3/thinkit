import { motion } from 'framer-motion';

export default function SignInPage() {
  const handleGoogleSignIn = () => {
    // Redirect browser to backend OAuth initiation endpoint
    window.location.href = '/api/auth/google';
  };

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-white flex flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      {/* Green header with logo */}
      <div className="bg-primary pt-16 pb-12 px-6 rounded-b-[2rem] flex flex-col items-center">
        <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
          <img
            src="/logo.png"
            alt="Thinkit"
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-8 flex flex-col">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome to Thinkit
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          India's fastest grocery delivery app. Fresh groceries delivered in minutes.
        </p>

        <div className="mt-auto mb-10 flex flex-col gap-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
            data-testid="google-signin-btn"
          >
            {/* Google SVG */}
            <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span className="font-semibold text-gray-700 text-lg">Continue with Google</span>
          </button>

          <p className="text-center text-xs text-gray-500 mt-4 px-4">
            By continuing, you agree to our{' '}
            <span className="underline font-medium text-primary">Terms of Service</span>
            {' '}&{' '}
            <span className="underline font-medium text-primary">Privacy Policy</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
