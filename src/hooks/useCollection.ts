import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore, authReady } from '../firebase/config';

export function useCollection<T extends { id: string }>(collectionName: string): T[] | undefined {
  const [data, setData] = useState<T[] | undefined>(undefined);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    authReady.then(() => {
      if (cancelled) return;
      unsubscribe = onSnapshot(
        collection(firestore, collectionName),
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
  }, [collectionName]);

  return data;
}
