import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { getLatestCounts } from '../firebase/api';
import { useStore } from '../contexts/StoreContext';
import { ProductPhoto } from '../components/ProductPhoto';
import type { Category, Product } from '../db/types';

interface CriticalItem {
  id: string;
  name: string;
  unit: string;
  categoryName: string;
  photoUrl?: string;
  idealQuantity: number;
  countedQuantity: number;
  percentage: number;
}

function percentageColor(pct: number) {
  if (pct <= 25) return 'bg-red-500';
  if (pct <= 50) return 'bg-orange-500';
  if (pct <= 75) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

export function CriticalProductsPage() {
  const { activeStore } = useStore();
  const products = useCollection<Product>('products');
  const categories = useCollection<Category>('categories');
  const [latestCounts, setLatestCounts] = useState<Map<string, { quantity: number; countedAt: number }>>(new Map());

  useEffect(() => {
    let cancelled = false;
    getLatestCounts(activeStore).then((m) => {
      if (!cancelled) setLatestCounts(m);
    });
    return () => {
      cancelled = true;
    };
  }, [activeStore]);

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const criticalItems: CriticalItem[] = useMemo(() => {
    if (!products) return [];
    const items: CriticalItem[] = [];
    for (const p of products) {
      if (p.idealQuantity <= 0) continue;
      const counted = latestCounts.get(p.id);
      if (!counted) continue;
      const percentage = (counted.quantity / p.idealQuantity) * 100;
      if (percentage >= 100) continue;
      items.push({
        id: p.id,
        name: p.name,
        unit: p.unit,
        categoryName: categoryById.get(p.categoryId) ?? 'Sem categoria',
        photoUrl: p.photoUrl,
        idealQuantity: p.idealQuantity,
        countedQuantity: counted.quantity,
        percentage,
      });
    }
    return items.sort((a, b) => a.percentage - b.percentage);
  }, [products, latestCounts, categoryById]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Produtos Críticos</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Itens ordenados pelo menor percentual de estoque em relação ao ideal
        </p>
      </div>

      {criticalItems.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          Nenhum produto crítico no momento. Conte os produtos para ver esta lista atualizada.
        </p>
      )}

      <div className="space-y-3">
        {criticalItems.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3"
          >
            <ProductPhoto photoUrl={item.photoUrl} name={item.name} className="w-16 h-16 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{item.name}</p>
                <span className="text-sm font-bold shrink-0">{Math.round(item.percentage)}%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.categoryName}</p>
              <div className="mt-1.5 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${percentageColor(item.percentage)}`}
                  style={{ width: `${Math.max(item.percentage, 3)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {item.countedQuantity} de {item.idealQuantity} {item.unit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
