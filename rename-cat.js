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

    const catQuery = query(collection(db, 'categories'), where('storeId', '==', STORE_ID));
    const catSnap = await getDocs(catQuery);
    
    let updated = false;
    for (const d of catSnap.docs) {
      if (d.data().name === 'Caixa de 7 Litros' || d.data().name.toUpperCase() === 'CAIXA SORVETE') {
        console.log("Renomeando categoria " + d.data().name + " para 'CAIXA DE 7 LITROS'");
        await updateDoc(d.ref, { name: 'CAIXA DE 7 LITROS' });
        updated = true;
      }
    }

    if (updated) {
      console.log('Categoria renomeada com sucesso!');
    } else {
      console.log('Categoria "CAIXA SORVETE" não encontrada.');
    }
    
    process.exit(0);

  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

run();
