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
    }, 2200);
    return () => clearTimeout(timer);
  }, [authStatus, setLocation]);

  return (
    <div
      className="min-h-[100dvh] w-full max-w-[390px] mx-auto flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 70% 55% at 50% 44%, #2d7a4f 0%, #1B4D2E 52%, #0f2e1b 100%)',
      }}
    >
      {/* ── Decorative grain overlay (premium texture) ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: '180px 180px',
        }}
      />

      {/* ── Background glow bloom ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 340,
          height: 340,
          background:
            'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          x: '-50%',
          y: '-58%',
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Main content ── */}
      <div className="flex flex-col items-center z-10">

        {/* Breathing ring behind the logo */}
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute rounded-3xl"
            style={{
              width: 232,
              height: 232,
              border: '1.5px solid rgba(255,215,0,0.35)',
              boxShadow: '0 0 32px 4px rgba(255,215,0,0.12)',
            }}
            animate={{
              scale: [0.96, 1.04, 0.96],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Outer accent ring — slower, offset phase */}
          <motion.div
            className="absolute rounded-3xl"
            style={{
              width: 266,
              height: 266,
              border: '1px solid rgba(255,215,0,0.12)',
            }}
            animate={{
              scale: [1.02, 0.97, 1.02],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 18, stiffness: 120 }}
            style={{
              width: 200,
              height: 200,
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow:
                '0 0 0 1.5px rgba(255,215,0,0.22), 0 8px 40px rgba(0,0,0,0.45), 0 0 60px rgba(255,215,0,0.10)',
            }}
          >
            <img
              src="/logo.png"
              alt="Thinkit by Dwarika"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Brand name */}
        <motion.h1
          className="text-white font-bold tracking-wide mt-8"
          style={{ fontSize: 26, letterSpacing: '0.02em' }}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.55, ease: 'easeOut' }}
        >
          Thinkit by Dwarika
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="font-medium mt-2"
          style={{ color: '#FFD700', fontSize: 14, letterSpacing: '0.03em' }}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.5, ease: 'easeOut' }}
        >
          Groceries Delivered In Minutes
        </motion.p>
      </div>

      {/* ── Bottom pulse indicator ── */}
      <motion.div
        className="absolute bottom-14 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        {/* Thin shimmer bar */}
        <div
          className="relative rounded-full overflow-hidden"
          style={{ width: 48, height: 3, background: 'rgba(255,215,0,0.18)' }}
        >
          <motion.div
            className="absolute inset-y-0 rounded-full"
            style={{ background: '#FFD700', width: '40%' }}
            animate={{ x: ['-100%', '280%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.3 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
