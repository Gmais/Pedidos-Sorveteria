import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { addOrderItem, getLatestCounts, getOrCreateTodayOrder, setOrderItemStatus, deleteTodayOrderAndCounts } from '../firebase/api';
import { ProductPhoto } from '../components/ProductPhoto';
import { exportOrderToPdf, exportOrderToExcel, shareOnWhatsApp } from '../utils/exportOrder';
import type { Category, OrderItem, Product } from '../db/types';

interface PendingItem {
  product: Product;
  categoryName: string;
  countedQuantity: number;
  quantityToOrder: number;
  orderItem?: OrderItem;
}

export function OrderPage() {
  const products = useCollection<Product>('products');
  const categories = useCollection<Category>('categories');
  const orderItems = useCollection<OrderItem>('orderItems');

  const [latestCounts, setLatestCounts] = useState<Map<string, { quantity: number; countedAt: number }>>(new Map());
  const [exporting, setExporting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLatestCounts().then((m) => {
      if (!cancelled) setLatestCounts(m);
    });
    return () => {
      cancelled = true;
    };
  }, [orderItems]);

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const pendingItems: PendingItem[] = useMemo(() => {
    if (!products) return [];
    const items: PendingItem[] = [];
    for (const product of products) {
      const counted = latestCounts.get(product.id);
      if (!counted) continue;
      if (counted.quantity >= product.idealQuantity) continue;

      const quantityToOrder = product.idealQuantity - counted.quantity;
      const matchingOrderItem = orderItems
        ?.filter((oi) => oi.productId === product.id && oi.countedQuantity === counted.quantity)
        .sort((a, b) => b.id.localeCompare(a.id))[0];

      items.push({
        product,
        categoryName: categoryById.get(product.categoryId) ?? 'Sem categoria',
        countedQuantity: counted.quantity,
        quantityToOrder,
        orderItem: matchingOrderItem,
      });
    }
    return items.sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [products, latestCounts, orderItems, categoryById]);

  const itemsToExport: OrderItem[] = useMemo(
    () =>
      pendingItems.map((item) => ({
        id: item.orderItem?.id ?? '',
        orderId: item.orderItem?.orderId ?? '',
        productId: item.product.id,
        productName: item.product.name,
        categoryName: item.categoryName,
        idealQuantity: item.product.idealQuantity,
        countedQuantity: item.countedQuantity,
        quantityToOrder: item.quantityToOrder,
        status: item.orderItem?.status ?? 'pending',
      })),
    [pendingItems]
  );

  async function toggleOrdered(item: PendingItem) {
    setToggling(item.product.id);
    try {
      if (item.orderItem) {
        await setOrderItemStatus(item.orderItem.id, item.orderItem.status === 'ordered' ? 'pending' : 'ordered');
        return;
      }
      const orderId = await getOrCreateTodayOrder();
      await addOrderItem({
        orderId,
        productId: item.product.id,
        productName: item.product.name,
        categoryName: item.categoryName,
        idealQuantity: item.product.idealQuantity,
        countedQuantity: item.countedQuantity,
        quantityToOrder: item.quantityToOrder,
        status: 'ordered',
      });
    } finally {
      setToggling(null);
    }
  }

  async function handleExportPdf() {
    setExporting('pdf');
    try {
      await exportOrderToPdf(itemsToExport);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportExcel() {
    setExporting('excel');
    try {
      await exportOrderToExcel(itemsToExport);
    } finally {
      setExporting(null);
    }
  }

  function handleShareWhatsApp() {
    shareOnWhatsApp(itemsToExport);
  }

  async function handleDeleteOrder() {
    if (!window.confirm('Tem certeza que deseja apagar o pedido e ZERAR todas as contagens feitas hoje? Esta ação não pode ser desfeita e a lista ficará vazia.')) {
      return;
    }
    setDeleting(true);
    try {
      await deleteTodayOrderAndCounts();
      setLatestCounts(new Map());
      const m = await getLatestCounts();
      setLatestCounts(m);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir pedido');
    } finally {
      setDeleting(false);
    }
  }

  const hasItems = pendingItems.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Pedido de Reposição</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{pendingItems.length} ite(ns)</span>
      </div>

      {hasItems && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
          >
            📄 {exporting === 'pdf' ? 'Gerando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
          >
            📊 {exporting === 'excel' ? 'Gerando...' : 'Exportar Excel'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 flex items-center gap-2"
          >
            💬 Compartilhar no WhatsApp
          </button>
          <button
            onClick={handleDeleteOrder}
            disabled={deleting}
            className="px-4 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60 flex items-center gap-2 ml-auto"
          >
            🗑️ {deleting ? 'Excluindo...' : 'Excluir pedido'}
          </button>
        </div>
      )}

      {!hasItems && (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12">
          Nenhum item precisa de reposição no momento. Os produtos contados estão com estoque igual ou acima do ideal,
          ou ainda não foram contados.
        </p>
      )}

      <div className="space-y-3">
        {pendingItems.map((item) => {
          const ordered = item.orderItem?.status === 'ordered';
          return (
            <div
              key={item.product.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border p-3 flex items-center gap-3 ${
                ordered ? 'border-emerald-300 dark:border-emerald-700 opacity-70' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <ProductPhoto photoUrl={item.product.photoUrl} name={item.product.name} className="w-16 h-16 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.categoryName}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                  <span>Ideal: {item.product.idealQuantity} {item.product.unit}</span>
                  <span>Atual: {item.countedQuantity} {item.product.unit}</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Pedir: {item.quantityToOrder} {item.product.unit}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleOrdered(item)}
                disabled={toggling === item.product.id}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60 ${
                  ordered
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {ordered ? '✓ Pedido feito' : 'Marcar como pedido'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
