import type { CapacitorConfig } from '@capacitor/cli';

// This file only configures the native Android/iOS shell that loads the
// existing Thinkit web build. It does not affect the Vite dev/build/serve
// scripts, routing, APIs, or any app behavior — the web app is unchanged.
const config: CapacitorConfig = {
  appId: 'com.dwarika.thinkit',
  appName: 'Thinkit',
  // Points at the same production build output already produced by
  // `pnpm --filter @workspace/thinkit-app run build` (vite.config.ts outDir).
  webDir: 'dist/public',
};

export default config;
