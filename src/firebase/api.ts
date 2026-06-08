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
import type { Category, CountEntry, Order, OrderItem, OrderItemStatus, Product } from '../db/types';

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

export async function createCategory(name: string): Promise<string> {
  await authReady;
  const ref = await addDoc(collection(firestore, 'categories'), { name } satisfies Omit<Category, 'id'>);
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

export async function upsertCount(productId: string, quantity: number): Promise<void> {
  await authReady;
  const now = Date.now();
  const q = query(collection(firestore, 'counts'), where('productId', '==', productId));
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
  await addDoc(collection(firestore, 'counts'), { productId, quantity, countedAt: now } satisfies Omit<CountEntry, 'id'>);
}

export async function getLatestCounts(): Promise<Map<string, { quantity: number; countedAt: number }>> {
  await authReady;
  const snapshot = await getDocs(collection(firestore, 'counts'));
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

export async function getLatestCountTimestamp(): Promise<number | null> {
  await authReady;
  const q = query(collection(firestore, 'counts'), orderBy('countedAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return (snapshot.docs[0].data() as Omit<CountEntry, 'id'>).countedAt;
}

// ---- Orders ----

export async function getOrCreateTodayOrder(): Promise<string> {
  await authReady;
  const now = Date.now();
  const q = query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as Omit<Order, 'id'>;
    if (isSameDay(data.createdAt, now)) return docSnap.id;
  }
  const ref = await addDoc(collection(firestore, 'orders'), { createdAt: now } satisfies Omit<Order, 'id'>);
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

export async function deleteTodayOrderAndCounts(): Promise<void> {
  await authReady;
  const now = Date.now();

  const countsSnap = await getDocs(collection(firestore, 'counts'));
  const countsToDelete = countsSnap.docs.filter((docSnap) => isSameDay((docSnap.data() as Omit<CountEntry, 'id'>).countedAt, now));
  for (const docSnap of countsToDelete) {
    await deleteDoc(docSnap.ref);
  }

  const ordersSnap = await getDocs(query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'), limit(1)));
  if (!ordersSnap.empty) {
    const orderDoc = ordersSnap.docs[0];
    if (isSameDay((orderDoc.data() as Omit<Order, 'id'>).createdAt, now)) {
      const orderId = orderDoc.id;
      const itemsSnap = await getDocs(query(collection(firestore, 'orderItems'), where('orderId', '==', orderId)));
      for (const item of itemsSnap.docs) {
        await deleteDoc(item.ref);
      }
      await deleteDoc(orderDoc.ref);
    }
  }
}
