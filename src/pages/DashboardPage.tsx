import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { getLatestCounts, getLatestCountTimestamp, createLocation } from '../firebase/api';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
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
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';

  const [latestCounts, setLatestCounts] = useState<Map<string, { quantity: number; countedAt: number }>>(new Map());
  const [lastCountAt, setLastCountAt] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    Promise.all([getLatestCounts(activeStore, tenantId), getLatestCountTimestamp(activeStore, tenantId)]).then(([counts, ts]) => {
      if (cancelled) return;
      setLatestCounts(counts);
      setLastCountAt(ts);
    });
    return () => {
      cancelled = true;
    };
  }, [products, activeStore, tenantId]);

  async function handleCreateLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    setSavingLocation(true);
    try {
      await createLocation(newLocationName.trim(), [], activeStore, tenantId);
      setLocationModalOpen(false);
      setNewLocationName('');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar local.');
    } finally {
      setSavingLocation(false);
    }
  }

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

      <div className="grid sm:grid-cols-3 gap-3">
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
        <button
          onClick={() => setLocationModalOpen(true)}
          className="bg-guri-blue text-white rounded-xl p-5 flex items-center justify-between hover:bg-guri-blue-hover transition-colors text-left"
        >
          <div>
            <p className="font-semibold text-lg">Cadastrar local</p>
            <p className="text-sm text-blue-100">Crie um novo local de contagem</p>
          </div>
          <span className="text-3xl">📍</span>
        </button>
      </div>

      <Modal open={locationModalOpen} onClose={() => setLocationModalOpen(false)} title="Novo local">
        <form onSubmit={handleCreateLocation}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nome do local</label>
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Freezer 1"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLocationModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newLocationName.trim() || savingLocation}
              className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {savingLocation ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
