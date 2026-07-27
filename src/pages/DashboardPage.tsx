import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { getLatestCounts, createLocation, updateLocation, deleteLocation } from '../firebase/api';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import type { Category, Location, Product } from '../db/types';

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
  const locations = useCollection<Location>('locations');
  const { activeStore } = useStore();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';

  const [latestCounts, setLatestCounts] = useState<Map<string, { quantity: number; countedAt: number }>>(new Map());
  const [lastCountAt, setLastCountAt] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>(undefined);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<Location | undefined>(undefined);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    getLatestCounts(activeStore, tenantId).then((counts) => {
      if (cancelled) return;
      setLatestCounts(counts);
      let mostRecent: number | null = null;
      counts.forEach((value) => {
        if (mostRecent === null || value.countedAt > mostRecent) mostRecent = value.countedAt;
      });
      setLastCountAt(mostRecent);
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
      setNewLocationName('');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar local.');
    } finally {
      setSavingLocation(false);
    }
  }

  function startEditLocation(location: Location) {
    setEditingLocation(location);
    setEditingName(location.name);
  }

  async function handleSaveEditLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLocation || !editingName.trim()) return;
    setSavingEdit(true);
    try {
      await updateLocation(editingLocation.id, editingName.trim());
      setEditingLocation(undefined);
    } catch (err) {
      console.error(err);
      alert('Erro ao renomear local.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteLocation() {
    if (!deletingLocation) return;
    setDeletingBusy(true);
    try {
      await deleteLocation(deletingLocation.id);
      setDeletingLocation(undefined);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir local.');
    } finally {
      setDeletingBusy(false);
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
            <p className="text-sm text-blue-100">Crie, edite ou remova locais de contagem</p>
          </div>
          <span className="text-3xl">📍</span>
        </button>
      </div>

      <Modal open={locationModalOpen} onClose={() => setLocationModalOpen(false)} title="Locais">
        {sortedLocations.length > 0 && (
          <div className="mb-4 space-y-1.5 max-h-56 overflow-y-auto">
            {sortedLocations.map((l) => (
              <div key={l.id}>
                {editingLocation?.id === l.id ? (
                  <form onSubmit={handleSaveEditLocation} className="flex gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!editingName.trim() || savingEdit}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLocation(undefined)}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium truncate">{l.name}</span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEditLocation(l)}
                        className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeletingLocation(l)}
                        className="text-xs font-medium px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCreateLocation} className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Novo local</label>
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Freezer 1"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLocationModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Fechar
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

      <Modal open={!!deletingLocation} onClose={() => setDeletingLocation(undefined)} title="Excluir local">
        <p className="mb-4">
          Tem certeza que deseja excluir <strong>{deletingLocation?.name}</strong>? Produtos atribuídos a este local
          ficarão sem local definido. Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeletingLocation(undefined)}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteLocation}
            disabled={deletingBusy}
            className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
          >
            {deletingBusy ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
