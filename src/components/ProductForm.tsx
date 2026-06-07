import { useEffect, useState } from 'react';
import type { Category, Product } from '../db/types';
import { UNITS } from '../db/types';

export interface ProductFormResult {
  name: string;
  categoryId: string;
  idealQuantity: number;
  unit: string;
  active: boolean;
  photoFile?: File;
  removePhoto: boolean;
}

interface ProductFormProps {
  categories: Category[];
  initial?: Product;
  onSubmit: (data: ProductFormResult) => Promise<void>;
  onCancel: () => void;
  onCreateCategory: (name: string) => Promise<string>;
}

export function ProductForm({ categories, initial, onSubmit, onCancel, onCreateCategory }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? '');
  const [newCategory, setNewCategory] = useState('');
  const [idealQuantity, setIdealQuantity] = useState(initial?.idealQuantity?.toString() ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? UNITS[0]);
  const [active, setActive] = useState(initial?.active ?? true);
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(initial?.photoUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length > 0 && categoryId === '' && !initial) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId, initial]);

  useEffect(() => {
    if (!photoFile) return;
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Informe o nome do produto.');
      return;
    }

    let finalCategoryId = categoryId;
    const trimmedNewCategory = newCategory.trim();
    if (trimmedNewCategory) {
      const existing = categories.find((c) => c.name.toLowerCase() === trimmedNewCategory.toLowerCase());
      finalCategoryId = existing ? existing.id : await onCreateCategory(trimmedNewCategory);
    }
    if (!finalCategoryId) {
      setError('Selecione ou crie uma categoria.');
      return;
    }

    const ideal = Number(idealQuantity);
    if (!idealQuantity || Number.isNaN(ideal) || ideal < 0) {
      setError('Informe uma quantidade ideal válida.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        categoryId: finalCategoryId,
        idealQuantity: ideal,
        unit,
        active,
        photoFile,
        removePhoto: !photoFile && !photoPreview,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  }

  function handleRemovePhoto() {
    setPhotoFile(undefined);
    setPhotoPreview(undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          {photoPreview ? (
            <img src={photoPreview} alt="Pré-visualização" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl text-slate-400">📷</span>
          )}
        </div>
        <div className="flex gap-2">
          <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
            Escolher foto
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
          </label>
          {photoPreview && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Nome do produto</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Casquinha de chocolate"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Ou crie uma nova categoria"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Qtd. ideal em estoque</label>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={idealQuantity}
            onChange={(e) => setIdealQuantity(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unidade</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-5 h-5 rounded accent-blue-600"
        />
        <span className="text-sm font-medium">Produto ativo</span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
