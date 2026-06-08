import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyATEZW_ALNBv92F-A9hbFwnFWpJDR69V9g",
  authDomain: "pedidos-sorveteria-1e33d.firebaseapp.com",
  projectId: "pedidos-sorveteria-1e33d",
  messagingSenderId: "306306991395",
  appId: "1:306306991395:web:0e9b53d0ba03e76970f896",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    console.log("Tentando login com guriturvo@gmail.com ...");
    const cred = await signInWithEmailAndPassword(auth, "guriturvo@gmail.com", "123456");
    console.log("Login OK! UID:", cred.user.uid);
    process.exit(0);
  } catch (err) {
    console.error("Erro no login:", err.code, "-", err.message);
    process.exit(1);
  }
}

run();
