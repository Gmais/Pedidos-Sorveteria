import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentReference,
  type FieldValue,
} from 'firebase/firestore';
import { firestore, authReady } from './config';
import type { Category, CountEntry, Order, OrderItem, OrderItemStatus, Product, StoreId } from '../db/types';

function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const dbb = new Date(b);
  return (
    da.getFullYear() === dbb.getFullYear() &&
    da.getMonth() === dbb.getMonth() &&
    da.getDate() === dbb.getDate()
  );
}

// ---- Categories ----

export async function createCategory(name: string, storeId: StoreId): Promise<string> {
  await authReady;
  const ref = await addDoc(collection(firestore, 'categories'), { name, storeId } satisfies Omit<Category, 'id'>);
  return ref.id;
}

// ---- Products ----

export async function addProduct(data: Omit<Product, 'id'>): Promise<string> {
  await authReady;
  const ref = await addDoc(collection(firestore, 'products'), data);
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'photoUrl'>> & { photoUrl?: string | FieldValue }
): Promise<void> {
  await authReady;
  await updateDoc(doc(firestore, 'products', id), data);
}

export async function deleteProduct(product: Product): Promise<void> {
  await authReady;
  await deleteDoc(doc(firestore, 'products', product.id));
}

// ---- Counts ----

export async function upsertCount(storeId: StoreId, productId: string, quantity: number): Promise<void> {
  await authReady;
  const now = Date.now();
  const q = query(collection(firestore, 'counts'), where('storeId', '==', storeId), where('productId', '==', productId));
  const snapshot = await getDocs(q);

  const entries: { ref: DocumentReference; countedAt: number }[] = snapshot.docs.map((docSnap) => ({
    ref: docSnap.ref,
    countedAt: (docSnap.data() as Omit<CountEntry, 'id'>).countedAt,
  }));
  const latest = entries.reduce<{ ref: DocumentReference; countedAt: number } | null>(
    (acc, entry) => (!acc || entry.countedAt > acc.countedAt ? entry : acc),
    null
  );

  if (latest && isSameDay(latest.countedAt, now)) {
    await updateDoc(latest.ref, { quantity, countedAt: now });
    return;
  }
  await addDoc(collection(firestore, 'counts'), { storeId, productId, quantity, countedAt: now } satisfies Omit<CountEntry, 'id'>);
}

export async function getLatestCounts(storeId: StoreId): Promise<Map<string, { quantity: number; countedAt: number }>> {
  await authReady;
  const q = query(collection(firestore, 'counts'), where('storeId', '==', storeId));
  const snapshot = await getDocs(q);
  const map = new Map<string, { quantity: number; countedAt: number }>();
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Omit<CountEntry, 'id'>;
    const current = map.get(data.productId);
    if (!current || data.countedAt > current.countedAt) {
      map.set(data.productId, { quantity: data.quantity, countedAt: data.countedAt });
    }
  });
  return map;
}

export async function getLatestCountTimestamp(storeId: StoreId): Promise<number | null> {
  await authReady;
  const q = query(collection(firestore, 'counts'), where('storeId', '==', storeId), orderBy('countedAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return (snapshot.docs[0].data() as Omit<CountEntry, 'id'>).countedAt;
}

// ---- Orders ----

export async function getOrCreateTodayOrder(storeId: StoreId): Promise<string> {
  await authReady;
  const now = Date.now();
  const q = query(collection(firestore, 'orders'), where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as Omit<Order, 'id'>;
    if (isSameDay(data.createdAt, now)) return docSnap.id;
  }
  const ref = await addDoc(collection(firestore, 'orders'), { createdAt: now, storeId } satisfies Omit<Order, 'id'>);
  return ref.id;
}

export async function addOrderItem(data: Omit<OrderItem, 'id'>): Promise<string> {
  await authReady;
  const ref = await addDoc(collection(firestore, 'orderItems'), data);
  return ref.id;
}

export async function setOrderItemStatus(id: string, status: OrderItemStatus): Promise<void> {
  await authReady;
  await updateDoc(doc(firestore, 'orderItems', id), { status });
}

export async function deleteCountForProduct(storeId: StoreId, productId: string): Promise<void> {
  await authReady;
  const now = Date.now();
  const q = query(collection(firestore, 'counts'), where('storeId', '==', storeId), where('productId', '==', productId));
  const snapshot = await getDocs(q);
  
  const entries = snapshot.docs.map(docSnap => ({
    ref: docSnap.ref,
    countedAt: (docSnap.data() as CountEntry).countedAt,
  }));
  
  const latest = entries.reduce<{ ref: DocumentReference; countedAt: number } | null>(
    (acc, entry) => (!acc || entry.countedAt > acc.countedAt ? entry : acc),
    null
  );

  if (latest && isSameDay(latest.countedAt, now)) {
    await deleteDoc(latest.ref);
  }
}
