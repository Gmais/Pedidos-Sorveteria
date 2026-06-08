import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { getLatestCounts, getLatestCountTimestamp } from '../firebase/api';
import { useStore } from '../contexts/StoreContext';
import type { Category, Product } from '../db/types';

function StatCard({ label, value, icon, to }: { label: string; value: string | number; icon: string; to?: string }) {
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 h-full hover:shadow-md transition-shadow">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export function DashboardPage() {
  const products = useCollection<Product>('products');
  const categories = useCollection<Category>('categories');
  const { activeStore } = useStore();

  const [latestCounts, setLatestCounts] = useState<Map<string, { quantity: number; countedAt: number }>>(new Map());
  const [lastCountAt, setLastCountAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLatestCounts(activeStore), getLatestCountTimestamp(activeStore)]).then(([counts, ts]) => {
      if (cancelled) return;
      setLatestCounts(counts);
      setLastCountAt(ts);
    });
    return () => {
      cancelled = true;
    };
  }, [products, activeStore]);

  const belowIdeal = useMemo(() => {
    if (!products) return 0;
    let total = 0;
    for (const p of products) {
      const counted = latestCounts.get(p.id);
      if (counted && counted.quantity < p.idealQuantity) total += 1;
    }
    return total;
  }, [products, latestCounts]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Painel</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral do seu estoque</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Produtos cadastrados" value={products?.length ?? 0} icon="📦" to="/produtos" />
        <StatCard label="Categorias" value={categories?.length ?? 0} icon="🏷️" to="/produtos" />
        <StatCard label="Abaixo do ideal" value={belowIdeal} icon="⚠️" to="/criticos" />
        <StatCard
          label="Última contagem"
          value={lastCountAt ? new Date(lastCountAt).toLocaleDateString('pt-BR') : '—'}
          icon="🕒"
          to="/contagem"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          to="/contagem"
          className="bg-blue-600 text-white rounded-xl p-5 flex items-center justify-between hover:bg-blue-700 transition-colors"
        >
          <div>
            <p className="font-semibold text-lg">Iniciar contagem</p>
            <p className="text-sm text-blue-100">Conte os produtos do seu estoque</p>
          </div>
          <span className="text-3xl">🔢</span>
        </Link>
        <Link
          to="/pedido"
          className="bg-emerald-600 text-white rounded-xl p-5 flex items-center justify-between hover:bg-emerald-700 transition-colors"
        >
          <div>
            <p className="font-semibold text-lg">Ver pedido de reposição</p>
            <p className="text-sm text-emerald-100">Veja o que precisa repor</p>
          </div>
          <span className="text-3xl">📋</span>
        </Link>
      </div>
    </div>
  );
}
