export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  idealQuantity: number;
  unit: string;
  active: boolean;
  photoUrl?: string;
}

export interface CountEntry {
  id: string;
  productId: string;
  quantity: number;
  countedAt: number;
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
}

export interface Order {
  id: string;
  createdAt: number;
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
