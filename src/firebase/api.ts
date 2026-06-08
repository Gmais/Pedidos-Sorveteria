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
import type { CountEntry, Order, OrderItem, OrderItemStatus, Product, StoreId } from '../db/types';

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

export async function createCategory(name: string, storeId: StoreId, tenantId: string): Promise<string> {
  await authReady;
  const ref = await addDoc(collection(firestore, 'categories'), { name, storeId, tenantId });
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

export async function upsertCount(storeId: StoreId, productId: string, quantity: number, tenantId: string): Promise<void> {
  await authReady;
  const now = Date.now();
  const q = query(
    collection(firestore, 'counts'),
    where('storeId', '==', storeId),
    where('productId', '==', productId),
    where('tenantId', '==', tenantId)
  );
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
  await addDoc(collection(firestore, 'counts'), { storeId, productId, quantity, countedAt: now, tenantId });
}

export async function getLatestCounts(storeId: StoreId, tenantId?: string): Promise<Map<string, { quantity: number; countedAt: number }>> {
  await authReady;
  const constraints: ReturnType<typeof where>[] = [where('storeId', '==', storeId)];
  if (tenantId) constraints.push(where('tenantId', '==', tenantId));
  const q = query(collection(firestore, 'counts'), ...constraints);
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

export async function getLatestCountTimestamp(storeId: StoreId, tenantId?: string): Promise<number | null> {
  await authReady;
  const q = tenantId
    ? query(collection(firestore, 'counts'), where('storeId', '==', storeId), where('tenantId', '==', tenantId), orderBy('countedAt', 'desc'), limit(1))
    : query(collection(firestore, 'counts'), where('storeId', '==', storeId), orderBy('countedAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return (snapshot.docs[0].data() as Omit<CountEntry, 'id'>).countedAt;
}

export async function toggleProductFavorite(productId: string, favorite: boolean): Promise<void> {
  await authReady;
  await updateDoc(doc(firestore, 'products', productId), { favorite });
}

// ---- Orders ----

export async function getOrCreateTodayOrder(storeId: StoreId, tenantId: string): Promise<string> {
  await authReady;
  const now = Date.now();
  const q = query(
    collection(firestore, 'orders'),
    where('storeId', '==', storeId),
    where('tenantId', '==', tenantId)
  );
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const sortedDocs = snapshot.docs.sort((a, b) => {
      const dataA = a.data() as Omit<Order, 'id'>;
      const dataB = b.data() as Omit<Order, 'id'>;
      return dataB.createdAt - dataA.createdAt;
    });
    
    const docSnap = sortedDocs[0];
    const data = docSnap.data() as Omit<Order, 'id'>;
    if (isSameDay(data.createdAt, now)) return docSnap.id;
  }
  
  const ref = await addDoc(collection(firestore, 'orders'), { createdAt: now, storeId, tenantId });
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

export async function deleteCountForProduct(storeId: StoreId, productId: string, tenantId?: string): Promise<void> {
  await authReady;
  const now = Date.now();
  const constraints: ReturnType<typeof where>[] = [
    where('storeId', '==', storeId),
    where('productId', '==', productId),
  ];
  if (tenantId) constraints.push(where('tenantId', '==', tenantId));
  const q = query(collection(firestore, 'counts'), ...constraints);
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
