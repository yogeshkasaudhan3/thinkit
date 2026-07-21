import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

/* ─── Staggered dot loader (Blinkit-style) ─── */
function DotLoader() {
  return (
    <div className="flex items-center gap-[7px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{ width: 7, height: 7, background: '#FFD700', display: 'block' }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.18,
          }}
        />
      ))}
    </div>
  );
}

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { authStatus } = useApp();

  useEffect(() => {
    if (authStatus === 'loading') return;
    const timer = setTimeout(() => {
      setLocation(authStatus === 'authenticated' ? '/home' : '/signin');
    }, 2600);
    return () => clearTimeout(timer);
  }, [authStatus, setLocation]);

  return (
    <div
      className="min-h-[100dvh] w-full max-w-[480px] mx-auto flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        /* Dark #0B5D3B base — slightly lighter bloom at centre */
        background:
          'radial-gradient(ellipse 72% 52% at 50% 46%, #0e7042 0%, #0B5D3B 50%, #063d28 100%)',
      }}
    >
      {/* ── Subtle noise grain ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.035,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '180px 180px',
        }}
      />

      {/* ── Radial gold bloom behind logo ── */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 360,
          height: 360,
          background: 'radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 68%)',
          top: '50%',
          left: '50%',
          x: '-50%',
          y: '-58%',
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Main content ── */}
      <div className="flex flex-col items-center z-10">

        {/* Logo — no border box, no ring; clean drop-shadow only */}
        <motion.div
          initial={{ opacity: 0, scale: 0.78 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.1,
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1], /* custom spring curve */
          }}
          style={{
            width: 260,
            height: 260,
            borderRadius: 32,
            overflow: 'hidden',
            /* Glow shadow, no hard border */
            boxShadow:
              '0 16px 56px rgba(0,0,0,0.55), 0 0 48px rgba(255,215,0,0.10)',
          }}
        >
          {/* Subtle breathing on the logo itself */}
          <motion.img
            src="/logo.png"
            alt="Thinkit"
            className="w-full h-full object-cover"
            draggable={false}
            animate={{ scale: [1, 1.025, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />
        </motion.div>

        {/* Brand name */}
        <motion.h1
          className="text-white font-bold mt-7"
          style={{ fontSize: 28, letterSpacing: '0.01em' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.42, duration: 0.5, ease: 'easeOut' }}
        >
          Thinkit by Dwarika
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="font-semibold mt-[6px]"
          style={{
            color: '#FFD700',
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.62, duration: 0.46, ease: 'easeOut' }}
        >
          Get It In Minutes
        </motion.p>
      </div>

      {/* ── Bottom dot loader ── */}
      <motion.div
        className="absolute bottom-14 flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
      >
        <DotLoader />
      </motion.div>
    </div>
  );
}
