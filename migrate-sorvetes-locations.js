import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Hardcoded config just for migration
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
const TENANT_ID = 'guri_padrao';

// Backfills product.locationId for the Sorvetes store from the old category -> location
// grouping (Location.categoryIds), which was accurate for this store. Only touches products
// that don't already have a locationId, and skips categories that map to more than one
// location (ambiguous - left for manual assignment).
async function run() {
  await signInAnonymously(auth);

  const locationsSnap = await getDocs(
    query(collection(db, 'locations'), where('storeId', '==', STORE_ID), where('tenantId', '==', TENANT_ID))
  );

  const categoryToLocations = new Map();
  locationsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    (data.categoryIds || []).forEach((categoryId) => {
      if (!categoryToLocations.has(categoryId)) categoryToLocations.set(categoryId, []);
      categoryToLocations.get(categoryId).push(docSnap.id);
    });
  });

  const categoryToLocation = new Map();
  const ambiguousCategoryIds = [];
  for (const [categoryId, locationIds] of categoryToLocations.entries()) {
    if (locationIds.length === 1) {
      categoryToLocation.set(categoryId, locationIds[0]);
    } else {
      ambiguousCategoryIds.push(categoryId);
    }
  }

  console.log(`Locations: ${locationsSnap.size}`);
  console.log(`Categories with a single mapped location: ${categoryToLocation.size}`);
  console.log(`Ambiguous categories (skipped): ${ambiguousCategoryIds.length}`);

  const productsSnap = await getDocs(
    query(collection(db, 'products'), where('storeId', '==', STORE_ID), where('tenantId', '==', TENANT_ID))
  );

  let batch = writeBatch(db);
  let opsInBatch = 0;
  let updated = 0;
  let skippedAlreadySet = 0;
  let skippedNoMapping = 0;

  for (const docSnap of productsSnap.docs) {
    const data = docSnap.data();
    if (data.locationId) {
      skippedAlreadySet++;
      continue;
    }
    const locationId = categoryToLocation.get(data.categoryId);
    if (!locationId) {
      skippedNoMapping++;
      continue;
    }
    batch.update(doc(db, 'products', docSnap.id), { locationId });
    opsInBatch++;
    updated++;
    if (opsInBatch >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) await batch.commit();

  console.log(`Products updated: ${updated}`);
  console.log(`Products skipped (already had locationId): ${skippedAlreadySet}`);
  console.log(`Products skipped (no unambiguous location mapping): ${skippedNoMapping}`);
  console.log('Done.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
