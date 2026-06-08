import { useMemo, useState } from 'react';
import { deleteField } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import { addProduct, createCategory, deleteProduct, updateProduct } from '../firebase/api';
import { uploadProductPhoto } from '../cloudinary/api';
import { useStore } from '../contexts/StoreContext';
import type { Category, Product } from '../db/types';
import { ProductPhoto } from '../components/ProductPhoto';
import { Modal } from '../components/Modal';
import { ProductForm, type ProductFormResult } from '../components/ProductForm';

export function ProductsPage() {
  const { activeStore } = useStore();
  const products = useCollection<Product>('products');
  const categories = useCollection<Category>('categories');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of filtered) {
      const catName = categoryById.get(p.categoryId) ?? 'Sem categoria';
      if (!groups.has(catName)) groups.set(catName, []);
      groups.get(catName)!.push(p);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, categoryById]);

  function openAdd() {
    setEditing(undefined);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSubmit(data: ProductFormResult) {
    setSaveError(null);
    try {
      let photoUrl = editing?.photoUrl;
      let clearPhoto = false;

      if (data.photoFile) {
        photoUrl = await uploadProductPhoto(data.photoFile);
      } else if (data.removePhoto) {
        photoUrl = undefined;
        clearPhoto = true;
      }

      const base = {
        name: data.name,
        categoryId: data.categoryId,
        idealQuantity: data.idealQuantity,
        unit: data.unit,
        active: data.active,
        storeId: activeStore,
      };

      if (editing) {
        await updateProduct(editing.id, {
          ...base,
          ...(photoUrl ? { photoUrl } : {}),
          ...(clearPhoto ? { photoUrl: deleteField() } : {}),
        });
      } else {
        await addProduct({ ...base, ...(photoUrl ? { photoUrl } : {}) });
      }
      setModalOpen(false);
      setEditing(undefined);
    } catch (err) {
      console.error(err);
      setSaveError('Não foi possível salvar o produto. Tente novamente.');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteProduct(deleting);
    setDeleting(undefined);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Produtos</h2>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Adicionar
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome..."
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todas as categorias</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          {products?.length === 0 ? 'Nenhum produto cadastrado ainda. Toque em "Adicionar" para começar.' : 'Nenhum produto encontrado.'}
        </p>
      )}

      <div className="space-y-6">
        {grouped.map(([categoryName, items]) => (
          <section key={categoryName}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              {categoryName} <span className="font-normal">({items.length})</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="text-left bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  <div className="relative">
                    <ProductPhoto photoUrl={p.photoUrl} name={p.name} className="w-full aspect-square" />
                    {!p.active && (
                      <span className="absolute top-2 left-2 text-xs font-semibold bg-slate-800/80 text-white px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ideal: {p.idealQuantity} {p.unit}
                    </p>
                  </div>
                  <div className="px-2.5 pb-2.5 flex gap-2">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(p);
                      }}
                      className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      Editar
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(p);
                      }}
                      className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                    >
                      Excluir
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar produto' : 'Novo produto'}>
        {saveError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        <ProductForm
          categories={categories ?? []}
          initial={editing}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onCreateCategory={(name) => createCategory(name, activeStore)}
        />
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(undefined)} title="Excluir produto">
        <p className="mb-4">
          Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleting(undefined)}
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
