import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('catalog, search, filters, sorting and empty state',async({page})=>{
  await page.goto('/');await expect(page.locator('.product-card')).toHaveCount(8);
  await page.getByRole('textbox',{name:'商品を検索'}).fill('マグ');await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('textbox',{name:'商品を検索'}).fill('[');await expect(page.getByText('該当する商品がありません')).toBeVisible();
  await page.getByRole('button',{name:'すべての商品を見る'}).click();await expect(page.locator('.product-card')).toHaveCount(8);
  await page.getByRole('button',{name:'生活雑貨',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByText('在庫ありのみ',{exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button',{name:'条件をクリア'}).click();await expect(page.locator('.product-card')).toHaveCount(8);
  await page.getByRole('button',{name:'価格帯'}).click();await page.getByRole('option',{name:'¥5,000 以下'}).click();await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('button',{name:'条件をクリア'}).click();await expect(page.locator('.product-card')).toHaveCount(8);
  await page.getByRole('button',{name:'並び順'}).click();await page.getByRole('option',{name:'価格が低い順'}).click();await expect(page.locator('.product-card').first()).toContainText('セラミック マグ');
});
test('details, cart quantity, shipping, persistence and removal',async({page})=>{
  await page.goto('/#/products/prd-003');await expect(page.getByRole('heading',{name:'セラミック マグ',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'カートに追加',exact:true}).click();await expect(page.getByText('カートに追加しました。')).toBeVisible();
  await page.getByRole('link',{name:'カート 1点'}).click();await expect(page.locator('.order-total')).toContainText('￥2,950');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:'セラミック マグを1点増やす'}).click();await expect(page.locator('.order-total')).toContainText('￥5,350');
  await page.reload();await expect(page.locator('.order-total')).toContainText('￥5,350');
  await page.getByRole('button',{name:'セラミック マグを1点減らす'}).click();await expect(page.locator('.order-total')).toContainText('￥2,950');
  await page.getByRole('button',{name:'セラミック マグを削除'}).click();await expect(page.getByRole('heading',{name:'カートは空です'})).toBeVisible();
});
test('sold out, 404, and history',async({page})=>{
  await page.goto('/#/products/prd-006');await expect(page.getByRole('button',{name:'在庫切れ',exact:true})).toBeDisabled();
  await page.getByRole('link',{name:'商品一覧に戻る'}).click();await expect(page.locator('.product-card')).toHaveCount(8);await page.goBack();await expect(page.getByRole('heading',{name:'グラス フラワーベース'})).toBeVisible();
  await page.goto('/#/products/missing');await expect(page.getByRole('heading',{name:'商品が見つかりません。'})).toBeVisible();
});
test('accessible catalog, detail, cart and responsive layout',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const path of ['/','/#/products/prd-001','/#/cart']){
    await page.goto(path);await page.waitForTimeout(900);
    if(path==='/')await expect(page.locator('.product-card')).toHaveCount(8);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
  await page.goto('/');await expect(page.locator('.product-card')).toHaveCount(8);await page.screenshot({path:`docs/${testInfo.project.name}.png`,fullPage:true});
});

test('remote API error and retry, cart failure preserves state',async({page})=>{
  const { products, categories }=await import('../../src/mocks/seed');
  const empty={items:[],subtotal:0,shipping:0,total:0,currency:'JPY'};
  let fail=true;
  await page.route('http://127.0.0.1:5174/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/cart')return route.fulfill({json:empty});
    if(url.pathname.startsWith('/api/cart/items/'))return route.fulfill({status:409,json:{errors:[{message:'在庫が変更されました。再試行してください。'}]}});
    if(url.pathname==='/api/categories')return route.fulfill({json:{docs:categories}});
    if(url.pathname==='/api/products/prd-003')return route.fulfill({json:products[2]});
    if(fail)return route.fulfill({status:503,json:{errors:[{message:'Service unavailable'}]}});
    return route.fulfill({json:{docs:products,totalDocs:8,page:1,limit:12,totalPages:1,hasPrevPage:false,hasNextPage:false}});
  });
  await page.goto('http://127.0.0.1:5174/');
  await expect(page.getByRole('heading',{name:'読み込みに失敗しました'})).toBeVisible();fail=false;
  await page.getByRole('button',{name:'再試行'}).click();await expect(page.locator('.product-card')).toHaveCount(8);
  await page.getByRole('link',{name:'セラミック マグの詳細を見る'}).click();await page.getByRole('button',{name:'カートに追加',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('在庫が変更されました');await expect(page.getByRole('link',{name:'カート 0点'})).toBeVisible();
});
