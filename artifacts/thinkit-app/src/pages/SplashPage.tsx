import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { authStatus } = useApp();

  useEffect(() => {
    if (authStatus === 'loading') return;

    const timer = setTimeout(() => {
      setLocation(authStatus === 'authenticated' ? '/home' : '/signin');
    }, 2000);

    return () => clearTimeout(timer);
  }, [authStatus, setLocation]);

  return (
    <motion.div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto bg-primary flex flex-col items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 15 }}
      >
        <div className="w-44 h-44 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3 overflow-hidden">
          <img src="/logo.png" alt="Thinkit" className="w-full h-full object-contain" />
        </div>

        <motion.p
          className="text-secondary font-medium text-lg mt-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Get It In Minutes
        </motion.p>
      </motion.div>

      {/* Animated loading dots */}
      <div className="absolute bottom-16 flex gap-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-secondary rounded-full"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
