import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@mnoritake-figma/ds/styles.css';
import './styles.css';
async function start() {
  if ((import.meta.env.VITE_API_MODE ?? 'mock') === 'mock') {
    const { setupWorker }=await import('msw/browser');
    const { handlers }=await import('./mocks/handlers');
    await setupWorker(...handlers).start({onUnhandledRequest:'bypass', serviceWorker:{url:'/mockServiceWorker.js'},quiet:true});
  } else {
    // Remove only our own mock worker when switching this origin to a real API.
    const registrations=await navigator.serviceWorker?.getRegistrations();
    await Promise.all((registrations??[]).filter(r=>r.active?.scriptURL.endsWith('/mockServiceWorker.js')).map(r=>r.unregister()));
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
}
start().catch(()=>{document.getElementById('root')!.innerHTML='<main style="padding:48px"><h1>サイトを起動できませんでした</h1><p>ブラウザの設定と接続を確認して、ページを再読み込みしてください。</p></main>';});
