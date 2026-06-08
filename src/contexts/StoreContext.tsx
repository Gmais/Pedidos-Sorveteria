import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { StoreId } from '../db/types';

interface StoreContextType {
  activeStore: StoreId;
  setActiveStore: (store: StoreId) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORE_STORAGE_KEY = 'pedidos-sorveteria-store';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activeStore, setActiveStoreState] = useState<StoreId>(() => {
    const stored = localStorage.getItem(STORE_STORAGE_KEY);
    if (stored === 'sorvetes' || stored === 'distribuidora' || stored === 'mercado') {
      return stored;
    }
    return 'distribuidora';
  });

  const setActiveStore = (store: StoreId) => {
    setActiveStoreState(store);
    localStorage.setItem(STORE_STORAGE_KEY, store);
  };

  return (
    <StoreContext.Provider value={{ activeStore, setActiveStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
