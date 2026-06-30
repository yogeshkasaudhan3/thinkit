import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';

export default function SignInPage() {
  const [, setLocation] = useLocation();

  const handleSignIn = () => {
    setLocation('/setup');
  };

  return (
    <motion.div 
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-white flex flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-primary pt-16 pb-12 px-6 rounded-b-[2rem] flex flex-col items-center">
        <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 relative overflow-hidden">
           {/* Fallback if logo missing */}
           <div className="absolute inset-0 bg-primary flex items-center justify-center">
             <span className="text-white font-bold text-xl">Thinkit</span>
           </div>
           <img src="/logo.png" alt="Thinkit" className="w-full h-full object-cover relative z-10" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome to Thinkit
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          India's fastest grocery delivery app. Fresh groceries delivered in minutes.
        </p>

        <div className="mt-auto mb-10 flex flex-col gap-4">
          <button 
            onClick={handleSignIn}
            className="w-full h-14 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <FcGoogle size={24} />
            <span className="font-semibold text-gray-700 text-lg">Continue with Google</span>
          </button>

          <p className="text-center text-xs text-gray-500 mt-4 px-4">
            By continuing, you agree to our <span className="underline font-medium text-primary">Terms of Service</span> & <span className="underline font-medium text-primary">Privacy Policy</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
