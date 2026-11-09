# 品質検証結果

実施日: 2026-11-09。ローカルのNode.js 20.20.2、Chromium（Playwright管理）で検証。

| 項目 | 結果 |
| --- | --- |
| TypeScript + Vite本番ビルド | 成功 |
| 単体・HTTP契約テスト | 15件成功 |
| ブラウザ操作 | 5シナリオ × PC／スマートフォン = 10件成功 |
| axe自動アクセシビリティ検査 | 一覧・詳細・空カート・商品入りカートで対象ルールの違反0 |
| レスポンシブ | 1440px・390pxで横スクロールなし、スクリーンショット確認済み |
| npmパッケージ移行 | 同梱ソースを削除し、配布tarball経由でビルド・25テスト成功 |
| npm依存監査 | 0 vulnerabilities（インストール時に検出した検証ツールの問題はVitest 4.1.12へ更新して解消） |

## 検証した内容

- キーワード検索、記号入力、カテゴリー・在庫・価格フィルター、条件クリア、価格順
- 商品詳細、在庫切れの追加禁止、不明ID、一覧へ戻る／ブラウザ履歴
- 追加・増減・削除、送料と合計、リロード後のカート保持
- 不正数量・在庫超過・商品不明・破損保存データの処理
- HTTPの404／409応答、クライアント送信価格を採用しない計算
- remoteモードで商品APIの503→再試行成功、およびカート409時の未変更状態
- 一覧・詳細・空カートの未処理JavaScript例外なし

## 修正した点

- DSのsecondary textを二次背景にそのまま置くと4.22:1だったため、該当箇所は元DSの強いテキストトークンへ変更。
- 並び順Selectが結果件数を圧迫しないよう、サイト側で幅を制限。
- React 18の画像属性警告を解消。
- 実APIモードのテストでAPI以外のソース通信を誤って差し替えないよう、テスト対象を `/api/` の実URLに限定。

## 検証範囲の限界

実Payload環境／Figma Code Layers／Makeへの接続、Code Connectの再公開、認証・複数ユーザー・決済は未検証。モバイルはChromiumのiPhoneサイズエミュレーションであり、実機Safari検証ではない。axeの自動検査はアクセシビリティ全体の適合保証ではない。写真は仮の商品イメージ。

[PC画面](desktop.png) / [スマートフォン画面](mobile.png)

## npm配布への切り替え

`@mnoritake-figma/ds@0.1.0` の配布物をインストールして再検証。DS自身でも公開exports・287アイコン・Reactサーバーレンダリング・元トークンとの一致を検証済み。配布対象はJS／型／CSS・README・MIT LICENSEで、認証情報やデモデータは含まない。

DSリポジトリのGitHub Actionsでも npm package checks と Validate PULSE Code Connect が成功。初回公開対象は `@mnoritake-figma/ds@0.1.0`、検証済みtarballのSHA-1は `8e507de6b5c0a6ebc472a790217429f6ad0c7a9b`。

公開npmレジストリで同じSHA-1を確認し、ECサイトは `@mnoritake-figma/ds` をバージョン `0.1.0` に固定。package-lock.jsonもregistry.npmjs.orgの配布URLへ更新済み。
