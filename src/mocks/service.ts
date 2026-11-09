import type { Cart, CartLine, Page, Product, ProductQuery } from '../domain/models';
import { products } from './seed';
export class DomainError extends Error { constructor(message:string, public status=400) { super(message); } }
export function listProducts(query: ProductQuery): Page<Product> {
  const q = (query.q ?? '').normalize('NFKC').trim().toLocaleLowerCase();
  const docs = products.filter(p => (!q || `${p.name} ${p.description} ${p.material}`.normalize('NFKC').toLocaleLowerCase().includes(q)) && (!query.category || p.category === query.category) && (query.maxPrice === undefined || p.price <= query.maxPrice) && (!query.inStock || p.stock > 0));
  docs.sort((a,b) => query.sort === 'price' ? a.price-b.price : query.sort === '-price' ? b.price-a.price : query.sort === '-createdAt' ? b.createdAt.localeCompare(a.createdAt) : Number(b.featured)-Number(a.featured));
  const limit = Math.max(1, Math.min(48, Math.floor(query.limit || 12)));
  const page = Math.max(1, Math.floor(query.page || 1));
  return { docs:docs.slice((page-1)*limit,page*limit), totalDocs:docs.length, limit, totalPages:Math.ceil(docs.length/limit), page, hasPrevPage:page>1, hasNextPage:page*limit<docs.length };
}
export function getProduct(id:string) { const product=products.find(p=>p.id===id); if(!product) throw new DomainError('商品が見つかりません。',404); return product; }
export function setQuantity(lines:CartLine[], id:string, quantity:number):CartLine[] {
  const p=getProduct(id);
  if(!Number.isInteger(quantity)||quantity<0) throw new DomainError('数量は0以上の整数で指定してください。');
  if(quantity>p.stock) throw new DomainError(`在庫は${p.stock}点です。数量を変更してください。`,409);
  return [...lines.filter(l=>l.productId!==id), ...(quantity ? [{productId:id,quantity}] : [])];
}
export function calculateCart(lines:CartLine[]):Cart {
  const items=lines.map(line=>{const product=getProduct(line.productId);return {...line, product,lineTotal:product.price*line.quantity};});
  const subtotal=items.reduce((sum,line)=>sum+line.lineTotal,0);
  const shipping=subtotal===0||subtotal>=10000?0:550;
  return {items,subtotal,shipping,total:subtotal+shipping,currency:'JPY'};
}
// Persist only stable references/quantities; prices are always recalculated by the API.
export function restoreCart(raw:string|null):CartLine[] {
  try { const value:unknown=JSON.parse(raw??'[]'); if(!Array.isArray(value)) return [];
    return value.reduce<CartLine[]>((lines,item)=>{try {if(typeof item?.productId!=='string')return lines;return setQuantity(lines,item.productId,item.quantity);}catch{return lines;}},[]);
  } catch { return []; }
}
