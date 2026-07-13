import { createRoot } from 'react-dom/client';

import App from './App';
import { configureNativeApiBaseUrl } from './lib/nativeApiConfig';

import './index.css';

// No-op on web; on native (Capacitor/Android) this points the shared API
// client at an absolute backend URL instead of relative "/api/..." paths.
configureNativeApiBaseUrl();

createRoot(document.getElementById('root')!).render(<App />);
