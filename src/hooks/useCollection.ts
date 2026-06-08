import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestore, authReady } from '../firebase/config';
import { useStore } from '../contexts/StoreContext';

export function useCollection<T extends { id: string }>(collectionName: string): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const { activeStore } = useStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    authReady.then(() => {
      if (cancelled) return;
      const q = query(
        collection(firestore, collectionName),
        where('storeId', '==', activeStore)
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T);
          setData(items);
        },
        (error) => console.error(`Erro ao ler coleção "${collectionName}"`, error)
      );
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [collectionName, activeStore]);

  return data;
}
