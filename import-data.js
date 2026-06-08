import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
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
  const data = JSON.parse(fs.readFileSync('./dados_loja.json', 'utf8'));
  
  for (const cat of data.categorias) {
    if (!cat.nome) continue;
    // Check if category exists
    const catQuery = query(collection(db, 'categories'), where('name', '==', cat.nome));
    const catSnap = await getDocs(catQuery);
    let categoryId;
    if (catSnap.empty) {
      console.log('Criando categoria:', cat.nome);
      const catRef = await addDoc(collection(db, 'categories'), { name: cat.nome });
      categoryId = catRef.id;
    } else {
      categoryId = catSnap.docs[0].id;
      console.log('Categoria já existe:', cat.nome);
    }
    
    for (const prod of cat.produtos) {
      if (!prod.nome) continue;
      // Check if product exists
      const prodQuery = query(collection(db, 'products'), where('name', '==', prod.nome));
      const prodSnap = await getDocs(prodQuery);
      if (prodSnap.empty) {
        console.log('Criando produto:', prod.nome);
        await addDoc(collection(db, 'products'), {
          categoryId,
          name: prod.nome,
          idealQuantity: 10,
          unit: 'un'
        });
      } else {
        // console.log('Produto já existe:', prod.nome);
      }
    }
  }
  console.log('Importação concluída!');
  process.exit(0);
}

run().catch(console.error);
