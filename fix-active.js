import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyATEZW_ALNBv92F-A9hbFwnFWpJDR69V9g",
  authDomain: "pedidos-sorveteria-1e33d.firebaseapp.com",
  projectId: "pedidos-sorveteria-1e33d",
  messagingSenderId: "306306991395",
  appId: "1:306306991395:web:0e9b53d0ba03e76970f896",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const STORE_ID = 'sorvetes';

async function run() {
  try {
    await signInAnonymously(auth);

    const prodQuery = query(collection(db, 'products'), where('storeId', '==', STORE_ID));
    const prodSnap = await getDocs(prodQuery);
    
    let count = 0;
    for (const d of prodSnap.docs) {
      if (d.data().active === undefined) {
        await updateDoc(d.ref, { active: true });
        count++;
      }
    }

    console.log("Atualizados " + count + " produtos da loja " + STORE_ID + " para active: true");
    process.exit(0);

  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

run();
