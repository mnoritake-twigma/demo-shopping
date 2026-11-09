import { useEffect, useState } from 'react';
import { Button, CheckboxField, InputField, SelectField, SelectItem } from 'primitives';
import { IconArrowRight, IconSliders } from 'icons';
import { api } from '../../api/client';
import type { Category, Page, Product, ProductQuery } from '../../domain/models';
import { ProductCard } from './ProductCard';
export function Catalog(){
  const [q,setQ]=useState(''),[category,setCategory]=useState(''),[maxPrice,setMaxPrice]=useState('all'),[inStock,setInStock]=useState(false),[sort,setSort]=useState<ProductQuery['sort']>('featured');
  const [data,setData]=useState<Page<Product>|null>(null),[categories,setCategories]=useState<Category[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let current=true;setLoading(true);setError('');const timer=setTimeout(()=>{
    Promise.all([api.products({q,category,maxPrice:maxPrice==='all'?undefined:Number(maxPrice),inStock,sort}),api.categories()]).then(([result,cats])=>{if(current){setData(result);setCategories(cats.docs);}}).catch(()=>{if(current)setError('商品を読み込めませんでした。接続を確認して、もう一度お試しください。');}).finally(()=>{if(current)setLoading(false);});
  },180);return()=>{current=false;clearTimeout(timer);};},[q,category,maxPrice,inStock,sort,attempt]);
  function reset(){setQ('');setCategory('');setMaxPrice('all');setInStock(false);setSort('featured');}
  const filtered=q||category||maxPrice!=='all'||inStock;
  return <>
    <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow">EVERYDAY, A LITTLE BETTER.</p><h1 id="hero-title">暮らしに、<br/>ちょうどいいもの。</h1><p className="hero-description">使うたびに、心地よい。<br/>あなたの毎日に寄り添う、家具と生活雑貨。</p><Button href="#collection" onPress={()=>document.getElementById('collection')?.scrollIntoView({behavior:'smooth'})}>アイテムを見つける<IconArrowRight size="20"/></Button><p className="hero-note">THE EVERYDAY COLLECTION — 2026</p></div><div className="hero-photo"><img src="/products/hero.jpg" alt="木の家具と柔らかな光に包まれたリビング"/><div className="hero-caption"><span>Less, but better.</span><span>01 / EVERYDAY LIVING</span></div></div></section>
    <section id="collection" className="collection" aria-labelledby="collection-title"><div className="collection-heading"><div><p className="eyebrow">THE COLLECTION</p><h2 id="collection-title">毎日を整える、もの選び。</h2></div><p className="text-muted text-sm">長く使いたくなるものを、ひとつずつ。</p></div>
      <div className="catalog-layout"><aside className="filters" aria-label="商品フィルター"><div className="filter-title"><IconSliders size="20"/><h3>絞り込み</h3></div><InputField label="商品を検索" aria-label="商品を検索" placeholder="商品名・キーワード" value={q} onChange={setQ}/><div className="category-filter"><h4>カテゴリー</h4><Button variant={category===''?'neutral':'subtle'} aria-pressed={category===''} onPress={()=>setCategory('')}>すべてのアイテム</Button>{categories.map(c=><Button key={c.id} variant={category===c.id?'neutral':'subtle'} aria-pressed={category===c.id} onPress={()=>setCategory(c.id)}>{c.name}</Button>)}</div><SelectField label="価格帯" selectedKey={maxPrice} onSelectionChange={key=>setMaxPrice(String(key))}><SelectItem id="all">すべての価格</SelectItem><SelectItem id="5000">¥5,000 以下</SelectItem><SelectItem id="10000">¥10,000 以下</SelectItem><SelectItem id="20000">¥20,000 以下</SelectItem></SelectField><CheckboxField label="在庫ありのみ" isSelected={inStock} onChange={setInStock}/>{filtered&&<Button variant="subtle" onPress={reset}>条件をクリア</Button>}<p className="filter-note">何気ない日常に、<br/>小さな心地よさを。</p></aside>
      <div className="catalog-results"><div className="results-toolbar"><p role="status" aria-live="polite">{loading?'読み込み中…':<><strong>{data?.totalDocs??0}</strong> アイテム</>}</p><SelectField aria-label="並び順" selectedKey={sort} onSelectionChange={key=>setSort(key as ProductQuery['sort'])}><SelectItem id="featured">おすすめ順</SelectItem><SelectItem id="price">価格が低い順</SelectItem><SelectItem id="-price">価格が高い順</SelectItem><SelectItem id="-createdAt">新着順</SelectItem></SelectField></div>
        {error?<div className="empty-state" role="alert"><h3>読み込みに失敗しました</h3><p>{error}</p><Button onPress={()=>setAttempt(v=>v+1)}>再試行</Button></div>:loading?<div className="product-grid" aria-busy="true">{Array.from({length:6},(_,i)=><div className="skeleton" key={i}/>)}</div>:data?.docs.length?<div className="product-grid">{data.docs.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-state"><h3>該当する商品がありません</h3><p>検索キーワードや絞り込み条件を変えてお試しください。</p><Button variant="neutral" onPress={reset}>すべての商品を見る</Button></div>}
        {!loading&&!error&&!!data?.docs.length&&<p className="results-end">全 {data.totalDocs} アイテムを表示しています</p>}
      </div></div>
    </section>
  </>;
}
