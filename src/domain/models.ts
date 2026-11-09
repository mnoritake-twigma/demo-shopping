export type Category = { id: string; name: string; label: string };
export type Product = {
  id: string; slug: string; name: string; subtitle: string; description: string;
  category: string; price: number; currency: 'JPY'; stock: number;
  image: string; imageAlt: string; material: string; dimensions: string;
  color: string; featured: boolean; createdAt: string;
};
export type ProductQuery = { q?: string; category?: string; maxPrice?: number; inStock?: boolean; sort?: 'featured' | 'price' | '-price' | '-createdAt'; page?: number; limit?: number };
export type Page<T> = { docs: T[]; totalDocs: number; limit: number; totalPages: number; page: number; hasPrevPage: boolean; hasNextPage: boolean };
export type CartLine = { productId: string; quantity: number };
export type Cart = { items: (CartLine & { product: Product; lineTotal: number })[]; subtotal: number; shipping: number; total: number; currency: 'JPY' };
export const yen = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
