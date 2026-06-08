import { useMemo, useState } from 'react';
import { deleteField } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import { addProduct, createCategory, deleteProduct, updateProduct, toggleProductFavorite } from '../firebase/api';
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
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

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

  async function handleToggleFavorite(e: React.MouseEvent, p: Product) {
    e.stopPropagation();
    try {
      await toggleProductFavorite(p.id, !p.favorite);
    } catch (err) {
      console.error(err);
      alert('Erro ao favoritar produto.');
    }
  }

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

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim(), activeStore);
      setCategoryModalOpen(false);
      setNewCategoryName('');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar categoria.');
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
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
          >
            <option value="all">Todas as categorias</option>
            <option value="favorites">Favoritos ⭐</option>
            {sortedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setCategoryModalOpen(true)}
            title="Nova categoria"
            className="flex items-center justify-center px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            +
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome..."
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
                <div
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="text-left bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full relative"
                >
                  <div className="relative">
                    <ProductPhoto photoUrl={p.photoUrl} name={p.name} className="w-full aspect-square" />
                    {!p.active && (
                      <span className="absolute top-2 left-2 text-xs font-semibold bg-slate-800/80 text-white px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                    <button
                      onClick={(e) => handleToggleFavorite(e, p)}
                      className={`absolute top-2 right-2 p-1.5 rounded-full bg-slate-800/50 hover:bg-slate-800/80 transition-colors ${
                        p.favorite ? 'text-yellow-400' : 'text-slate-300'
                      }`}
                      title={p.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={p.favorite ? "currentColor" : "none"}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="p-2.5 flex-1">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ideal: {p.idealQuantity} {p.unit}
                    </p>
                  </div>
                  <div className="px-2.5 pb-2.5 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(p);
                      }}
                      className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(p);
                      }}
                      className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar produto' : 'Novo produto'}>
        {saveError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        <ProductForm
          categories={sortedCategories}
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

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Nova categoria">
        <form onSubmit={handleCreateCategory}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nome da categoria</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Picolés"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              Criar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
