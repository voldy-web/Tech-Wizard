import Constants from 'expo-constants';

// The ONE place the backend address is defined.
//
// Set EXPO_PUBLIC_API_URL (in mobile/.env) to your computer's LAN IP, e.g. http://192.168.1.50:8080.
//   - "localhost" only works in a simulator / the web build. On a real phone running Expo Go,
//     "localhost" is the PHONE itself, so the app could never reach the backend.
// If the variable is not set we fall back to the machine that is serving the Metro bundler
// (its LAN IP is already in Expo's host URI), then to localhost.
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.50:8081"
  const host = hostUri ? hostUri.split(':')[0] : '';
  // A tunnel hostname (…exp.direct) only forwards the Expo bundle, never port 8080, so don't guess from it.
  if (host && !/exp\.direct|ngrok/i.test(host)) return `http://${host}:8080`;
  return 'http://localhost:8080';
}

export const API_URL = resolveApiUrl();
// Render's free plan puts the server to sleep when idle; the first request can take ~30-60s to wake it.
export const REQUEST_TIMEOUT_MS = 45000;
// Shared secret the hosted backend expects in the X-API-Key header (backend env API_KEY). Empty for local dev.
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';
export const CURRENCY = 'GH₵';

// Set EXPO_PUBLIC_USE_MOCK=true to run the whole UI against built-in fake data (no backend needed).
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
