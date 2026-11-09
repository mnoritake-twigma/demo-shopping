import { useEffect, useState } from 'react';
import { Button } from '@mnoritake-figma/ds';
import { IconShoppingBag, IconTruck, IconBox, IconCheckCircle } from '@mnoritake-figma/ds/icons';
import { CartProvider, useCart } from './features/cart/CartProvider';
import { CartPage } from './features/cart/CartPage';
import { Catalog } from './features/catalog/Catalog';
import { ProductDetail } from './features/catalog/ProductDetail';
function Store(){
  const [route,setRoute]=useState(location.hash||'#/');
  const {cart}=useCart();
  useEffect(()=>{const change=()=>{if(location.hash==='#collection')return;setRoute(location.hash||'#/');window.scrollTo(0,0);};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  const count=cart.items.reduce((sum,l)=>sum+l.quantity,0);
  const detail=route.match(/^#\/products\/([^/?]+)$/);
  return <><a className="skip-link" href="#main">本文にスキップ</a><div className="announcement">暮らしを整える、小さなきっかけ。<span>¥10,000以上で送料無料</span></div><header className="site-header"><a className="wordmark" href="#/" aria-label="PULSE STORE ホーム">PULSE<span>STORE</span><i aria-hidden="true">®</i></a><nav aria-label="メインナビゲーション"><a href="#/" aria-current={!detail&&route!=='#/cart'?'page':undefined}>すべてのアイテム</a><span className="nav-description">日常を、心地よく。</span></nav><Button variant="subtle" href="#/cart" aria-label={`カート ${count}点`}><IconShoppingBag size="24"/><span className="cart-label">カート</span><span className="cart-count">{count}</span></Button></header><main id="main">{route==='#/cart'?<CartPage/>:detail?<ProductDetail id={detail[1]}/>:route==='#/'||route==='#collection'||route==='#main'?<Catalog/>:<section className="empty-state"><h1>ページが見つかりません</h1><Button href="#/">商品一覧に戻る</Button></section>}</main><section className="service-strip" aria-label="ストアサービス"><div><IconTruck/><span><strong>¥10,000以上で送料無料</strong><small>全国一律の配送料 ¥550</small></span></div><div><IconBox/><span><strong>暮らしに寄り添うセレクト</strong><small>素材と使い心地を大切に</small></span></div><div><IconCheckCircle/><span><strong>長く使える、シンプルなもの</strong><small>毎日の定番をお届けします</small></span></div></section><footer><a className="wordmark" href="#/">PULSE<span>STORE</span></a><p>暮らしに、ちょうどいいもの。</p><small>© 2026 PULSE STORE · DEMO STORE</small></footer></>;
}
export default function App(){return <CartProvider><Store/></CartProvider>;}
