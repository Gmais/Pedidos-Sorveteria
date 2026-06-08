import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
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

async function run() {
  await signInAnonymously(auth);
  
  const catsSnap = await getDocs(collection(db, 'categories'));
  let targetCat = null;
  catsSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.name.toLowerCase().includes('sorvete')) {
      targetCat = { id: docSnap.id, name: data.name };
    }
  });

  if (!targetCat) {
    console.log('Categoria sorvetes não encontrada.');
    process.exit(0);
  }

  console.log(`Encontrada categoria: ${targetCat.name} (${targetCat.id}). Deletando produtos associados...`);
  
  const prodQuery = query(collection(db, 'products'), where('categoryId', '==', targetCat.id));
  const prodSnap = await getDocs(prodQuery);
  
  for (const p of prodSnap.docs) {
    console.log(`Deletando produto: ${p.data().name}`);
    await deleteDoc(p.ref);
  }

  console.log('Deletando a categoria...');
  await deleteDoc(doc(db, 'categories', targetCat.id));
  console.log('Feito!');
  process.exit(0);
}

run().catch(console.error);
