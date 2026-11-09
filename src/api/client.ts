import type { Cart, Category, Page, Product, ProductQuery } from '../domain/models';
const base=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
async function request<T>(path:string, options:RequestInit={}):Promise<T> {
  const timeout=AbortSignal.timeout(10000);
  const response=await fetch(base+path,{...options,signal:options.signal??timeout,credentials:'include',headers:{'Content-Type':'application/json',...options.headers}});
  const body=await response.json();
  if(!response.ok)throw new Error(body.errors?.[0]?.message??'読み込みに失敗しました。もう一度お試しください。');
  return body as T;
}
export const api={
  products:(query:ProductQuery)=>{const params=new URLSearchParams();Object.entries(query).forEach(([k,v])=>{if(v!==undefined&&v!=='')params.set(k,String(v));});return request<Page<Product>>(`/products?${params}`);},
  product:(id:string)=>request<Product>(`/products/${encodeURIComponent(id)}`),
  categories:()=>request<{docs:Category[]}>('/categories'),
  cart:()=>request<Cart>('/cart'),
  setQuantity:(id:string,quantity:number)=>request<Cart>(`/cart/items/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({quantity})}),
  remove:(id:string)=>request<Cart>(`/cart/items/${encodeURIComponent(id)}`,{method:'DELETE'}),
};
