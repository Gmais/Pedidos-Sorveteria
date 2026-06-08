import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
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

const TENANT_ID = 'guri_padrao';

async function migrateCollection(collectionName) {
  console.log("Migrating " + collectionName + "...");
  const snapshot = await getDocs(collection(db, collectionName));
  let count = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data.tenantId) {
      await updateDoc(docSnap.ref, { tenantId: TENANT_ID });
      count++;
    }
  }
  console.log("Updated " + count + " documents in " + collectionName + ".");
}

async function run() {
  try {
    await signInAnonymously(auth);
    
    // Create tenant doc
    await setDoc(doc(db, 'tenants', TENANT_ID), {
      name: 'Sorvetes Guri',
      createdAt: new Date().toISOString()
    });

    await migrateCollection('categories');
    await migrateCollection('products');
    await migrateCollection('counts');
    await migrateCollection('orders');
    await migrateCollection('orderItems');
    
    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
