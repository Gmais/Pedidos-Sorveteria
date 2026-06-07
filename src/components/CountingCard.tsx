import { ProductPhoto } from './ProductPhoto';
import type { Product } from '../db/types';

interface CountingCardProps {
  product: Product;
  quantity: number | null;
  onChange: (quantity: number | null) => void;
}

export function CountingCard({ product, quantity, onChange }: CountingCardProps) {
  function handlePhotoTap() {
    onChange(quantity === null ? 0 : quantity + 1);
  }

  function handleDecrement() {
    if (quantity === null) return;
    onChange(quantity > 0 ? quantity - 1 : 0);
  }

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num) && num >= 0) {
      onChange(num);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      <button
        onClick={handlePhotoTap}
        className="block w-full active:opacity-80 transition-opacity"
        aria-label={`Tocar para contar ${product.name}`}
      >
        <ProductPhoto photoUrl={product.photoUrl} name={product.name} className="w-full aspect-square" />
      </button>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="font-medium text-sm leading-tight line-clamp-2">{product.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Unidade: {product.unit}</p>
        <div className="mt-auto flex items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={quantity === null}
            aria-label="Diminuir quantidade"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={quantity ?? ''}
            onChange={handleManualChange}
            placeholder="—"
            className="w-full text-center text-lg font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
