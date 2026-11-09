# デザインシステム調査・再利用記録

調査日: 2026-11-09

出典: https://github.com/mnoritake-twigma/mnoritake-ds
固定コミット: `957761d94b42e9b2b8887e357b12d6e23518efba`

## 構成

- `src/ui/primitives`: Button、InputField、SelectField、CheckboxField、Tag、Accordion、Dialog等。
- `src/ui/icons`: 287個のSVGアイコン。
- `src/ui/layout`: Flex、Sectionなど。
- `src/ui/compositions`: ヘッダー、カード等。上流のデータ層に結合している。
- `src/theme.css`: カラー、余白、角丸、タイポグラフィ、シャドウのCSS変数。ライト／ダーク対応。
- `src/data`: 商品・認証・価格のサンプルservice/provider/hooks。商品providerにお気に入り機能を含む。
- `src/stories`: Storybookでの使い方。
- `src/figma`: Code Connect。READMEによると97コンポーネント／compositionと1,722アイコン接続。
- `scripts/tokens`: Figma出力の生成スクリプト。元SDSの入力が残っており、今回は実行しない。

## 取り込み方

npm公開用のexportsを備えたライブラリではなく `private: true` のViteアプリのため、Git依存としてinstallする代わりに必要なUIソースを `src/vendor/mnoritake-ds` に同梱。初回起動にGitHubトークンは不要。

Button、InputField、SelectField／SelectItem、CheckboxField、Tag、Accordion／AccordionItem、アイコンを**元のまま**利用。CSS、関連UI utilities／hooks／layout／imagesと型宣言も同梱し、MIT LICENSEを保持。バレルimportの依存解決のため未使用primitivesも含む。Tree shakingで未使用JSを除去するが、共通CSSは広めに含まれる。

`docs/vendor-manifest.json` が同梱ファイルのSHA-256一覧。`npm run check:vendor` で改変を検出できる。Vite・TypeScriptのalias (`primitives`, `icons`, `utils`, `layout`, `hooks`, `images`) と `allowImportingTsExtensions` を上流に合わせた。`index.d.ts` はCSS変数の型拡張に必要。

## そのまま利用しなかった点

| 対象 | 理由と対応 |
| --- | --- |
| アプリ／examples | DS紹介用画面なので、新たにEC専用画面を組み立てた |
| compositions/ProductInfoCard | 上流Product型・pricing型への結合があり、今回の画像、在庫、詳細リンクを含む商品カードは独自compositionにした |
| ProductsProvider／service | お気に入り、サンプル認証等を持つため不採用。API越しの独立したデータ層に置換 |
| Search | 制御値と内部状態が二重化し、クリアの同期に注意が必要。元コードを改変せずInputFieldを検索に利用 |
| Code Connect設定 | 接続先は元DSのFigmaファイル。ECリポジトリからの再公開はしていない |
| PULSEの緑・ダーク配色 | READMEが「CSSはSDS baselineでPULSEトークンと未同期」と明記。未取得の色を推測して上書きせず、実装済みCSSを使用 |

## サイト側の追加スタイル

Tailwind 3（preflight無効）とEC専用CSSを併用。既存のButton等の部品CSSを壊さず、サイト固有のレスポンシブなレイアウトを追加している。色はDSのsemantic tokenを使用。画面固有の見出しサイズ・カード密度・余白はアプリ側の追加規則であり、PULSEに存在するトークンと同一という意味ではない。

二次背景上のsecondary textはコントラスト4.22:1だったため、hero・注文概要の補助文だけ、既存の強いtext tokenを選択。元DSのファイルは変更していない。これはGuidelinesで説明できる実装上の判断。

## 再利用例

```tsx
import { Button, InputField } from 'primitives';
import { IconShoppingBag } from 'icons';
<Button onPress={addToCart}><IconShoppingBag />カートに追加</Button>
<InputField label="商品を検索" value={query} onChange={setQuery} />
```

上流の追加更新はコミット固定を更新し、vendorを入れ替え、manifestを再生成して差分とテストを確認する。トークン同期やCode Connect再公開は別作業。
