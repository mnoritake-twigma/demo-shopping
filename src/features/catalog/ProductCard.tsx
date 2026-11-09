import { Tag } from 'primitives';
import { IconArrowUpRight } from 'icons';
import type { Product } from '../../domain/models';
import { yen } from '../../domain/models';
export function ProductCard({product:p}:{product:Product}){
  return <article className="product-card">
    <a href={`#/products/${p.id}`} className="product-link" aria-label={`${p.name}の詳細を見る`}>
      <div className="product-image"><img src={p.image} alt={p.imageAlt} loading="lazy" width="600" height="600"/>{p.stock===0?<span className="product-badge"><Tag variant="secondary">SOLD OUT</Tag></span>:p.featured?<span className="product-badge"><Tag variant="secondary">定番アイテム</Tag></span>:null}<span className="product-arrow"><IconArrowUpRight size="20"/></span></div>
      <div className="product-copy"><p className="product-subtitle">{p.subtitle}</p><h3>{p.name}</h3><p className="product-price">{yen(p.price)}<span>税込</span></p><p className="product-color">{p.color}</p></div>
    </a>
  </article>;
}
