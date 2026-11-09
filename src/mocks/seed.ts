import type { Category, Product } from '../domain/models';
export const categories: Category[] = [
  { id: 'furniture', name: '家具・照明', label: 'FURNITURE' },
  { id: 'living', name: '生活雑貨', label: 'LIVING' },
  { id: 'work', name: 'ワークアイテム', label: 'WORK' },
];
export const products: Product[] = [
  { id:'prd-001', slug:'classic-accent-chair', name:'クラシック アクセントチェア', subtitle:'穏やかな時間をつくる、一脚。', category:'furniture', price:29800, stock:8, image:'chair', material:'天然木・ファブリック', dimensions:'幅 62 × 奥行 68 × 高さ 76 cm', color:'アイボリー', featured:true },
  { id:'prd-002', slug:'desk-light', name:'デスクライト', subtitle:'手元に、やさしい灯りを。', category:'furniture', price:8800, stock:12, image:'lamp', material:'アルミニウム・樹脂', dimensions:'直径 15 × 高さ 28 cm', color:'ブラック', featured:true },
  { id:'prd-003', slug:'ceramic-mug', name:'セラミック マグ', subtitle:'いつもの一杯が、少し特別に。', category:'living', price:2400, stock:25, image:'mug', material:'陶器', dimensions:'直径 8.5 × 高さ 9 cm / 320 ml', color:'サンド', featured:true },
  { id:'prd-004', slug:'wireless-headphones', name:'ワイヤレス ヘッドホン', subtitle:'自分のリズムに、集中する。', category:'work', price:16800, stock:6, image:'headphones', material:'ABS樹脂・合成皮革', dimensions:'幅 18 × 高さ 20 cm / 250 g', color:'ブラック', featured:true },
  { id:'prd-005', slug:'everyday-backpack', name:'エブリデイ バックパック', subtitle:'仕事にも、週末にも。', category:'work', price:9800, stock:10, image:'bag', material:'リサイクルポリエステル', dimensions:'幅 28 × 奥行 14 × 高さ 42 cm / 18 L', color:'チャコール', featured:false },
  { id:'prd-006', slug:'glass-flower-vase', name:'グラス フラワーベース', subtitle:'一輪から始まる、心地よい部屋。', category:'living', price:3800, stock:0, image:'vase', material:'ガラス', dimensions:'直径 12 × 高さ 22 cm', color:'クリア', featured:false },
  { id:'prd-007', slug:'wood-side-table', name:'ウッド サイドテーブル', subtitle:'手の届くところに、お気に入りを。', category:'furniture', price:12800, stock:4, image:'table', material:'天然木・塗装仕上げ', dimensions:'直径 40 × 高さ 48 cm', color:'ホワイト', featured:false },
  { id:'prd-008', slug:'desk-keyboard', name:'コンパクト キーボード', subtitle:'デスクを整えて、気持ちも軽く。', category:'work', price:7800, stock:15, image:'keyboard', material:'ABS樹脂', dimensions:'幅 29 × 奥行 12 × 高さ 2 cm', color:'ホワイト', featured:false },
].map((p, i) => ({ ...p, currency:'JPY', image:`/products/${p.image}.jpg`, imageAlt:p.name, description:`${p.subtitle} 毎日使うものだから、素材の質感と使いやすさを大切にしました。シンプルなデザインが暮らしのさまざまなシーンになじみます。`, createdAt:`2026-10-${String(20-i).padStart(2,'0')}T00:00:00Z` }));
