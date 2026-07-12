import { useEffect, useMemo, useRef, useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { getLatestCounts, upsertCount, deleteCountForProduct, startNewCount } from '../firebase/api';
import { CountingCard } from '../components/CountingCard';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import type { Category, Product } from '../db/types';

const SAVE_DEBOUNCE_MS = 500;

export function CountingPage() {
  const { activeStore } = useStore();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const allProducts = useCollection<Product>('products');
  const categories = useCollection<Category>('categories');
  const products = useMemo(() => allProducts?.filter((p) => p.active), [allProducts]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [counts, setCounts] = useState<Map<string, number | null>>(new Map());
  const [lastCountedAt, setLastCountedAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [startingNew, setStartingNew] = useState(false);

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!activeStore) return;
    let cancelled = false;
    getLatestCounts(activeStore, tenantId).then((latest) => {
      if (cancelled) return;
      const initial = new Map<string, number | null>();
      let mostRecent: number | null = null;
      latest.forEach((value, productId) => {
        initial.set(productId, value.quantity);
        if (mostRecent === null || value.countedAt > mostRecent) mostRecent = value.countedAt;
      });
      setCounts(initial);
      setLastCountedAt(mostRecent);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((t) => clearTimeout(t));
    };
  }, []);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = 
        categoryFilter === 'all' 
          ? true 
          : categoryFilter === 'favorites'
            ? p.favorite
            : p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, search, categoryFilter]);

  const totalCounted = useMemo(() => {
    let total = 0;
    counts.forEach((v) => {
      if (v !== null) total += 1;
    });
    return total;
  }, [counts]);

  function handleChange(productId: string, quantity: number | null) {
    setCounts((prev) => {
      const next = new Map(prev);
      next.set(productId, quantity);
      return next;
    });

    const existingTimer = timers.current.get(productId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      if (quantity === null) {
        await deleteCountForProduct(activeStore, productId, tenantId);
      } else {
        await upsertCount(activeStore, productId, quantity, tenantId);
      }
      setLastCountedAt(Date.now());
      timers.current.delete(productId);
    }, SAVE_DEBOUNCE_MS);
    timers.current.set(productId, timer);
  }

  async function handleNewCount() {
    if (!window.confirm('Isso vai zerar a contagem de todos os produtos e iniciar um novo pedido. Deseja continuar?')) {
      return;
    }
    setStartingNew(true);
    try {
      await startNewCount(activeStore, tenantId);
      setCounts(new Map());
      setLastCountedAt(null);
    } finally {
      setStartingNew(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total contados</p>
            <p className="text-2xl font-bold">{totalCounted}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Última contagem</p>
            <p className="text-sm font-medium mt-1">
              {lastCountedAt ? new Date(lastCountedAt).toLocaleString('pt-BR') : 'Nenhuma contagem ainda'}
            </p>
          </div>
        </div>
        <button
          onClick={handleNewCount}
          disabled={startingNew}
          className="px-4 py-2.5 rounded-lg bg-guri-blue text-white text-sm font-medium hover:bg-guri-blue-hover transition-colors disabled:opacity-60 shrink-0"
        >
          {startingNew ? 'Reiniciando...' : 'Nova Contagem'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as categorias</option>
            <option value="favorites">Favoritos ⭐</option>
            {sortedCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome..."
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loaded && filtered.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          {products?.length === 0 ? 'Nenhum produto ativo cadastrado.' : 'Nenhum produto encontrado.'}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((p) => (
          <CountingCard
            key={p.id}
            product={p}
            quantity={counts.get(p.id) ?? null}
            onChange={(q) => handleChange(p.id, q)}
          />
        ))}
      </div>

      <p className="text-xs text-center text-slate-400 dark:text-slate-500">
        Toque na foto para somar (0, 1, 2...). Use o botão "−" ou digite o valor manualmente. A contagem é salva automaticamente.
      </p>
    </div>
  );
}
