# Code Layers → Figma管理Payload 再構築実験

## 目的・現在地

企業の既存DB/API/業務コードをGitHubで渡し、Code LayersのAgentが仕様を読み取り、Figma管理の検証backendを構築できるかを検証する。基準はmain `77ed0e99113634861391563eaec78c7ef95a0422`。本ブランチは指示書と仕様書のみ追加し、この段階ではFigma backend作成・本番API/DB変更・データコピーを行わない。

このmainはNestJS/Prismaに加えてPayload比較実装をすでに含む。このため「既存Payload参照ありの再構築実験」として評価する。Agentが参照/コピーしたファイルを記録し、NestJSだけから自律変換できたと結論づけない。参照なし実験は別の承認された対照条件で行う。

## 必読資料と保持

- [AGENTS.md](../AGENTS.md): backend生成前の指示。
- [payload-schema.md](payload-schema.md): 5モデル、制約、Collection対応。
- [api-contract.md](api-contract.md): endpoint、DTO、auth、業務ルールと差分。
- [実装](../backend/shared/shop.mjs)、[Prisma schema](../backend/nest/prisma/schema.prisma)、[API client](../src/api/client.ts)を根拠として読む。

テンプレート移行前後でAGENTS.mdと3文書の存在・内容を確認する。置換されたら生成側のルールを保持して業務指示・文書へのリンクを統合し、Agentに再読させる。変更前後diffと参照commitを証拠にする。

## 実行条件

1. GitHubの`codex/payload-code-layer-experiment`を対象Code Layerに接続/同期する。対象Designの例: `TaXm5JY0P2KbfL2jACzFqZ`、既存Code Layer候補`2:3`。実行時に対象を再確認し、既存デモを壊さない実験用コピーで行う。
2. 以下の初回プロンプトを実行し、Agentが実際に読めたファイルを確認する。
3. backend未作成なら、そのCode Layers画面で正式なAdd backendフローが利用可能か確認する。Create前にユーザー承認を待つ。利用不可ならその段階をblockedとし、Make/CLI成功で代用しない。
4. Next.js移行が求められた場合、影響と差分見込みを説明して記録。生成後のbuildFigmaConfigとDB/Secrets/auth/storage設定を維持し、業務Collectionsと互換APIを構築する。
5. 架空fixtureを投入し、下表を順に実行。Figma管理backend自体の成功とCode Layerからの接続成功を別々に判定する。

画面/プラン/バージョンによる可用性、Agentの自動AGENTS読み込み、Git同期範囲はこの準備段階では未確認。PayloadタブのCLIデプロイ経路も別実験であり、Code Layers Add backendの代わりに黙って使わない。

## 初回プロンプト

```text
このブランチのAGENTS.mdを読み、docs/payload-schema.md、docs/api-contract.md、docs/payload-experiment-plan.mdと対応するソースを参照してください。
最初はコード変更もbackend作成もせず、現在のブランチ/commit、読めたファイル、既存5モデル、API base、カート所有者と送料の規則を出典付きで報告してください。
次に、このCode Layerで正式なAdd backendフローが利用可能か確認してください。Createが必要なら対象を提示して承認を待ってください。
Next.js移行が必要な場合は影響を先に説明してください。生成後はFigmaのbuildFigmaConfigと管理DB/Secrets/認証/ストレージ設定を保持し、3つの業務文書を読み直して仕様を実装してください。
既存backend/payloadを参照・再利用した部分と、NestJS/Prismaから再構築した部分を分けて報告してください。
```

## テスト定義（すべてFigmaでは未実施）

| ID | 検証・操作 | 合格条件 | 証拠 |
|---|---|---|---|
| T01 | Agentに指示ファイル名を与えず、読み込んだrepo規則を質問。その後明示的にAGENTS.mdを読むよう依頼 | 自動認識と明示読込を別判定。パスと内容を引用できる | 最初の応答/明示後応答、branch/commit |
| T02 | schema/shop/clientと2仕様書を読ませる | 5モデル、Cart複合キー、11操作＋仕様取得、送料/所有者を正しく説明 | 出典と応答。未取得を推測で補わない |
| T03 | Add backend確認→対象提示→承認→Create | Figma管理CMS identity/生成configが確認できる | UI、承認、CMS ID、生成ファイル一覧。秘密値を除く |
| T04 | framework移行前後を比較 | 影響の事前説明とdiffが一致、検索/詳細/cartが動く | package/lock/entry/routing/env/mock/APIclient差分、画面結果 |
| T05 | Collectionsと型/制約を検査 | 5業務モデルに対応しexternalIdが維持される。unique、nullable、整数、FK/削除連動の差を特定 | 設定diff、重複・小数・孤児参照の試験結果 |
| T06 | 下記API試験を専用fixtureで実行 | DTO/status/認証/業務値が期待どおり。差異は個別記録 | リクエスト/レスポンス（Cookie等を伏せる）、比較レポート |
| T07 | 架空商品・カテゴリ、会員、cartを書き込み、別リクエストで取得 | 管理backendに保存され、Code Layerのremote APIにも反映 | fixture外部ID、CMS取得結果、Network。localStorage/MSWのみは不合格 |
| T08 | 会員cartを保存しCode Layerを停止/再起動、同じ会員で取得 | 同じbackend identityで同じ行/数量/totalが残る | 再起動前後ID・結果。Cookie消失とDB消失を分ける |
| T09 | 無害な表示変更を実験ブランチでGit同期、その後取得 | 同じmanaged backend/config/接続を保持しデータが残る | 前後commit、backend ID、config差分、保存レコード |
| T10 | テンプレートでAGENTS置換された場合に再読 | platform規則と業務仕様がともに保持される | 統合diffとAgentによる出典付き再説明 |

## T06詳細

- 商品8件/カテゴリ3件、商品全DTO、詳細ID検索、未存在404、検索NFKC、category、価格上限、在庫、4種sort、同値ID順、ページ境界/空集合。
- limit=0、page=-1、sort/inStock不正、maxPrice=-1、q超過で400。
- sessionなしcart=401。guest作成、me、login失敗401、成功、logout後401、再login後cart保持。Alice/Bob/guestの3Cookieを独立させ他者cartが混ざらないこと。
- `prd-003`数量2はsubtotal4800・送料550・total5350。subtotal>=10000で送料無料、空cartも送料0。quantity=0削除、小数/負数/priceやuserId追加400、在庫超409、未知商品PUT404。別商品同時更新後の両行保持。
- 公開APIにpasswordHash/tokenHashを含まない。標準管理CRUDから匿名にshop-users/sessionsを公開しない。管理authはFigma生成仕様に合わせて検証し、既存admins/loginが存在すると仮定しない。
- 不許可Origin403、非JSON415、期限切れsession401、login試行制限429。ブラウザで実CookieとCORSが機能するかも検証する。
- 不正JSON、未対応method、OPTIONS/HEAD、16KB境界超過を直接API/proxy双方で記録。明示した正規化対象以外の差を隠さない。

既存[contract tests](../backend/tests/contract.test.mjs)はlocalhost固定・管理操作・Docker再起動を含むため、そのままFigma向けに流さない。独立test runnerで専用検証URL/架空資格情報を注入する。参考baselineは隔離ローカルfixtureを使用し、本番には書き込まない。

## 記録・判定

各実行で日時、操作者、Figma surface/バージョン表示、対象file/node、branch/commit、CMS identity、参照ファイル、生成/変更ファイル、承認、各テストのpass/fail/blocked/not-run、期待/実測、残課題を記録する。秘密値・生Cookie・tokenは保存しない。

次の4成果を独立判定する: (A)AgentのGit仕様読取、(B)Figma管理Payload構築、(C)既存Shop API互換、(D)Code Layer接続と再起動/Git同期後の永続性。画面表示やdeploy成功だけで全体成功としない。今回の準備は全T01〜T10がnot-runであり、ローカル既存比較実装の結果をFigmaの合格として転記しない。

## 中止・復旧

実データ/本番接続を発見したら書込を停止する。platform設定の独自再作成が必要なら制約を報告し停止する。復旧は実験コードの変更を実験ブランチ上で戻し、データは専用fixtureだけを明示的に片付ける。Git revertでDBが戻るとは仮定しない。Figma backend/DBそのものの削除は別途承認なしに実行しない。
