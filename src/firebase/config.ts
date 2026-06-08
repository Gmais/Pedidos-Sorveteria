import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyATEZW_ALNBv92F-A9hbFwnFWpJDR69V9g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pedidos-sorveteria-1e33d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pedidos-sorveteria-1e33d",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "306306991395",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:306306991395:web:0e9b53d0ba03e76970f896",
};

export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);

let readyResolve: () => void;
export const authReady = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    readyResolve();
  } else {
    signInAnonymously(auth).catch((err) => console.error('Falha ao autenticar anonimamente', err));
  }
});
