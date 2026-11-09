import { describe,it,expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../src/mocks/handlers';
import { listProducts, setQuantity, calculateCart, restoreCart } from '../src/mocks/service';
const server=setupServer(...handlers);
beforeAll(()=>server.listen({onUnhandledRequest:'error'}));afterAll(()=>server.close());
describe('catalog contract',()=>{
  it('combines category, price, availability and search',()=>{const result=listProducts({category:'living',maxPrice:5000,inStock:true,q:'マグ'});expect(result.docs.map(p=>p.id)).toEqual(['prd-003']);});
  it('treats regex punctuation as literal search and returns zero',()=>{expect(listProducts({q:'['}).totalDocs).toBe(0);});
  it('sorts prices ascending and paginates',()=>{const result=listProducts({sort:'price',limit:2,page:2});expect(result.docs.map(p=>p.price)).toEqual([7800,8800]);expect(result.totalDocs).toBe(8);expect(result.hasNextPage).toBe(true);});
  it('normalizes whitespace and returns empty for unknown category',()=>{expect(listProducts({q:'  マグ  '}).totalDocs).toBe(1);expect(listProducts({category:'missing'}).totalDocs).toBe(0);});
});
describe('cart rules',()=>{
  it('uses product prices and free shipping at 10000 yen',()=>{expect(calculateCart([{productId:'prd-003',quantity:1}]).total).toBe(2950);expect(calculateCart([{productId:'prd-003',quantity:5}]).shipping).toBe(0);expect(calculateCart([]).total).toBe(0);});
  it('replaces quantity without duplicate lines and removes zero',()=>{const lines=setQuantity([{productId:'prd-003',quantity:1}],'prd-003',2);expect(lines).toEqual([{productId:'prd-003',quantity:2}]);expect(setQuantity(lines,'prd-003',0)).toEqual([]);});
  it.each([-1,1.5,NaN,Infinity,26])('rejects invalid/overstock quantity %s',quantity=>{expect(()=>setQuantity([],'prd-003',quantity)).toThrow();});
  it('rejects sold out and unknown products',()=>{expect(()=>setQuantity([],'prd-006',1)).toThrow();expect(()=>setQuantity([],'invalid',1)).toThrow();});
  it('recovers from corrupt persisted carts',()=>{expect(restoreCart('{bad')).toEqual([]);expect(restoreCart('{}')).toEqual([]);expect(restoreCart('[{"productId":"missing","quantity":2},{"productId":"prd-003","quantity":2}]')).toEqual([{productId:'prd-003',quantity:2}]);});
});
describe('HTTP API',()=>{
  it('serves the list response and 404 error envelope',async()=>{const list=await fetch('http://localhost/api/products?q=マグ').then(r=>r.json());expect(list.totalDocs).toBe(1);const result=await fetch('http://localhost/api/products/not-found');expect(result.status).toBe(404);expect((await result.json()).errors[0].message).toContain('見つかりません');});
  it('returns conflict on overstock; prices never come from the request',async()=>{const response=await fetch('http://localhost/api/cart/items/prd-001',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({quantity:9,price:1})});expect(response.status).toBe(409);const good=await fetch('http://localhost/api/cart/items/prd-001',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({quantity:1,price:1})});expect((await good.json()).subtotal).toBe(29800);});
});
