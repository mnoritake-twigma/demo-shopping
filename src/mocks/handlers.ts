import { http, HttpResponse, delay } from 'msw';
import type { CartLine, ProductQuery } from '../domain/models';
import { categories } from './seed';
import { calculateCart, DomainError, getProduct, listProducts, restoreCart, setQuantity } from './service';
const storageKey='pulse-store.cart.v1';
let memory:CartLine[]=[];
const read=()=> { try{return restoreCart(localStorage.getItem(storageKey));}catch{return memory;} };
const write=(lines:CartLine[])=>{memory=lines;try{localStorage.setItem(storageKey,JSON.stringify(lines));}catch{/* Session-only fallback when storage is unavailable. */}};
const failure=(error:unknown)=>HttpResponse.json({errors:[{message:error instanceof Error?error.message:'処理に失敗しました。'}]}, {status:error instanceof DomainError?error.status:500});
export const handlers=[
  http.get('*/api/categories',async()=>{await delay(120);return HttpResponse.json({docs:categories});}),
  http.get('*/api/products',async({request})=>{await delay(180);const q=new URL(request.url).searchParams;return HttpResponse.json(listProducts({q:q.get('q')??'',category:q.get('category')??'',maxPrice:q.has('maxPrice')?Number(q.get('maxPrice')):undefined,inStock:q.get('inStock')==='true',sort:(q.get('sort')??'featured') as ProductQuery['sort'],page:Number(q.get('page')??1),limit:Number(q.get('limit')??12)}));}),
  http.get('*/api/products/:id',async({params})=>{await delay(150);try{return HttpResponse.json(getProduct(String(params.id)));}catch(e){return failure(e);}}),
  http.get('*/api/cart',()=>HttpResponse.json(calculateCart(read()))),
  http.put('*/api/cart/items/:id',async({params,request})=>{await delay(150);try{const body=await request.json() as {quantity:number};const lines=setQuantity(read(),String(params.id),body.quantity);write(lines);return HttpResponse.json(calculateCart(lines));}catch(e){return failure(e);}}),
  http.delete('*/api/cart/items/:id',({params})=>{const lines=read().filter(l=>l.productId!==params.id);write(lines);return HttpResponse.json(calculateCart(lines));}),
];
