import { Platform } from 'react-native';

// Live Render.com Cloud Backend for Anti-Music
export const CLOUD_BACKEND_URL = 'https://anti-music.onrender.com';
export const LOCAL_BACKEND_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.19.227.173:8000';

/**
 * Returns the active backend URL.
 * Defaults to the production cloud Render URL so the app functions everywhere.
 */
export const getBackendUrl = () => {
  return CLOUD_BACKEND_URL;
};
