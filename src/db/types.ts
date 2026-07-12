export type StoreId = 'sorvetes' | 'distribuidora' | 'mercado';

export interface Category {
  id: string;
  name: string;
  storeId: StoreId;
  tenantId: string;
}

export interface Freezer {
  id: string;
  name: string;
  categoryIds: string[];
  storeId: StoreId;
  tenantId: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  idealQuantity: number;
  unit: string;
  active: boolean;
  photoUrl?: string;
  storeId: StoreId;
  favorite?: boolean;
  tenantId: string;
}

export interface CountEntry {
  id: string;
  productId: string;
  quantity: number;
  countedAt: number;
  storeId: StoreId;
  tenantId: string;
}

export type OrderItemStatus = 'pending' | 'ordered';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  categoryName: string;
  idealQuantity: number;
  countedQuantity: number;
  quantityToOrder: number;
  status: OrderItemStatus;
  storeId: StoreId;
  tenantId: string;
}

export interface Order {
  id: string;
  createdAt: number;
  storeId: StoreId;
  tenantId: string;
}

export const UNITS = [
  'unidade',
  'caixa',
  'pacote',
  'kg',
  'litro',
  'fardo',
  'pote',
  'saco',
] as const;
