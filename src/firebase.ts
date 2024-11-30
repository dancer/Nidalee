import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

setAnalyticsCollectionEnabled(analytics, true);

const logAnalyticsEvent = (eventName: string, params?: object) => {
  logEvent(analytics, eventName, params);
};

export const logInstallation = () => {
  logAnalyticsEvent('app_installation');
};

export const logAppOpen = () => {
  logAnalyticsEvent('app_open');
};

export const logGameLaunch = (gameType: string) => {
  logAnalyticsEvent('game_launch', {
    game_type: gameType
  });
};

export const logAccountAdd = () => {
  logAnalyticsEvent('account_add');
};

export default analytics; 