# AdBrain – 実装ロードマップ

> 締切: 2026-04-06 23:45 PDT（残り約13日）
> 関連ドキュメント: [requirements.md](./requirements.md) | [design.md](./design.md)

---

## 1. ドキュメント・実装の依存関係

```
requirements.md           design.md               実装
(何を作るか)             (どう作るか)            (作る)
                                                  
 ┌──────────┐            ┌──────────┐            ┌──────────────┐
 │ ユーザー  │───────────▶│ Auth0    │───────────▶│ Auth0 テナント│
 │ ストーリー │            │ 統合設計  │            │ 設定 (GUI)   │
 │ #1       │            │ §2.1-2.6 │            └──────┬───────┘
 └──────────┘            └──────────┘                   │
                                                        ▼
 ┌──────────┐            ┌──────────┐            ┌──────────────┐
 │ US #1,3  │───────────▶│ Go API   │───────────▶│ /api/auth/*  │
 │ 認証・    │            │ 設計 §3  │            │ /api/connect │
 │ Token Vault│           └──────────┘            └──────┬───────┘
 └──────────┘                                           │ ← ここが動かないと
                                                        │   後続すべてブロック
 ┌──────────┐            ┌──────────┐            ┌──────▼───────┐
 │ US #4,5  │───────────▶│ Proxy    │───────────▶│ /api/proxy/* │
 │ API取得   │            │ 設計 §3  │            └──────┬───────┘
 └──────────┘            └──────────┘                   │
                                                        │
 ┌──────────┐            ┌──────────┐            ┌──────▼───────┐
 │ US #6    │───────────▶│ Agent    │───────────▶│ /api/agent/* │
 │ 最適化   │            │ 設計 §4  │            │ LangGraph.js │
 └──────────┘            └──────────┘            └──────┬───────┘
                                                        │
 ┌──────────┐            ┌──────────┐            ┌──────▼───────┐
 │ US #7,9  │───────────▶│ Frontend │───────────▶│ React UI     │
 │ #12,14,15│            │ 設計 §5  │            │ Dashboard    │
 └──────────┘            └──────────┘            └──────┬───────┘
                                                        │
 ┌──────────┐            ┌──────────┐            ┌──────▼───────┐
 │ US #8    │───────────▶│ Security │───────────▶│ Step-up Auth │
 │ Step-up  │            │ 設計 §6  │            │ 監査ログ      │
 └──────────┘            └──────────┘            └──────────────┘
```

### クリティカルパス

```
Terraform apply (Auth0 + Vercel) → Go 認証API → Token Exchange → API Proxy → Agent → UI
```

**Terraform による Auth0 テナント設定と Go 認証 API がボトルネック**。ここが動かないと Token Exchange も API Proxy もテスト不可。

---

## 2. 実装フェーズ

### Phase 0: プロジェクト初期化 + Terraform + CI/CD（Day 1）

```
前提条件: なし
成果物: dev/prod 2環境がTerraformでプロビジョニング済み、GitHub Actions CI/CDパイプライン稼働、スケルトンが dev 環境にデプロイ済み
```

| ステップ | タスク | 所要時間 | ブロッカー |
|---|---|---|---|
| 0-1 | GitHub リポジトリ作成 + `development` / `main` ブランチ + branch protection | 15min | なし |
| 0-2 | Auth0 M2M Application 手動作成（dev + prod 各テナント、Terraform 用） | 30min | なし |
| 0-3 | Terraform `main.tf` + `variables.tf` + `envs/dev.tfvars` + `envs/prod.tfvars` | 45min | 0-1 |
| 0-4 | `auth0.tf`: Client, Connection×3, Action, MFA, **Log Streams**（環境変数で dev/prod 切替） | 1h | 0-2, 0-3 |
| 0-5 | `vercel.tf`: Project, 環境変数, ドメイン（dev/prod 切替） | 30min | 0-3 |
| 0-5b | Go: Auth0 Log Streams 受信エンドポイント (`/api/webhooks/auth0-logs`) スケルトン | 30min | 0-5 |
| 0-6 | `terraform apply -var-file=envs/dev.tfvars` → dev 環境プロビジョニング | 15min | 0-4, 0-5 |
| 0-7 | `terraform apply -var-file=envs/prod.tfvars` → prod 環境プロビジョニング | 15min | 0-6 |
| 0-8 | GitHub Secrets 登録（VERCEL_TOKEN, AUTH0_DEV_*, AUTH0_PROD_*, etc.） | 15min | 0-2 |
| 0-9 | `.github/workflows/ci.yml` 作成（Go test + npm test + terraform validate） | 30min | 0-1 |
| 0-10 | `.github/workflows/deploy-dev.yml` 作成（development → Terraform dev + Vercel Preview） | 30min | 0-8, 0-9 |
| 0-11 | `.github/workflows/deploy-prod.yml` 作成（main → Terraform prod + Vercel Production） | 30min | 0-10 |
| 0-12 | React + Vite + TypeScript 初期化 + **Vercel Analytics / Speed Insights 追加** | 30min | 0-1 |
| 0-13 | Go module 初期化 (`go mod init`) + `/api` ディレクトリ + Vitest 設定 | 30min | 0-1 |
| 0-14 | shadcn/ui + Tailwind CSS セットアップ | 30min | 0-12 |
| 0-15 | vercel.json + `git push development` → CI 通過 → dev 環境自動デプロイ確認 | 15min | 0-6, 0-10〜0-14 |

**Phase 0 のゴール:** `development` ブランチへの push で CI（テスト + lint + terraform validate）→ Terraform dev apply → Vercel Preview デプロイが自動実行。`dev.adbrain.vercel.app` で React 画面（Vercel Analytics/Speed Insights 有効）が表示され `/api/health` が Go から JSON 返却。Auth0 Log Streams が Terraform で設定済み。`main` への PR マージで prod 環境にも同パイプラインが稼働。

---

### Phase 1: Auth0 認証基盤（Day 1-3）⚡ クリティカルパス

```
前提条件: Phase 0 完了
成果物: Google ログイン + Connected Accounts + Token Exchange が動作
```

| ステップ | タスク | 所要時間 | ブロッカー | 対応US |
|---|---|---|---|---|
| 1-1 | Go: Auth0 ログイン/コールバック/ログアウト実装（Google Social Login） | 4h | Phase 0 (Terraform apply 済み) | #1 |
| 1-2 | Go: セッション管理（Encrypted Cookie） | 2h | 1-1 | #1 |
| 1-3 | Go unit tests: セッション暗号化/復号、Auth0 コールバックパラメータ検証 | 2h | 1-2 | #1 |
| 1-4 | React: LoginButton（Google でログイン）+ ProtectedRoute | 2h | 1-1 | #1 |
| 1-5 | Go: Connected Accounts 接続フロー (`/api/connect/*`) | 4h | 1-2 | #1, #3 |
| 1-6 | Go: Token Exchange 実装 (`POST /oauth/token` RFC 8693) | 3h | 1-5 | #3 |
| 1-7 | Go unit tests: Token Exchange パラメータ構築、エラーハンドリング | 2h | 1-6 | #3 |
| 1-8 | Integration test: Token Exchange 実通信（Auth0 dev テナント → 外部トークン取得） | 2h | 1-6 | #3 |
| 1-9 | Integration test: Token スコープ検証（`adwords` のみ、最小権限確認） | 1h | 1-8 | #10 |
| 1-10 | `git push development` → CI 通過確認 → dev 環境で E2E 手動検証 | 1h | 1-9 | #1, #3 |

**Phase 1 のゴール:** Google でログイン → Google Ads を接続 → Token Vault からアクセストークン取得、までが dev 環境で一気通貫動作。CI で unit + integration tests がパス。

**並列化ポイント:** Auth0 テナント設定は Phase 0 の Terraform で完了済み。1-4（React ログインUI）と 1-3（Go tests）は並列可能。

---

### Phase 2: API プロキシ + エージェント（Day 3-6）

```
前提条件: Phase 1 の Token Exchange (1-6) 完了
成果物: エージェントが広告データ取得 → 最適化提案生成まで dev 環境で動作、テスト付き
```

| ステップ | タスク | 所要時間 | ブロッカー | 対応US |
|---|---|---|---|---|
| 2-1 | Go: Google Ads API プロキシ (`/api/proxy/google-ads`) | 4h | 1-6 | #5 |
| 2-2 | Go: Meta Marketing API プロキシ (`/api/proxy/meta-ads`) | 4h | 1-6 | #4 |
| 2-2b | Go: **構造化ログミドルウェア**（request_id, token_exchange_ms, external_api_ms） | 2h | 2-1 | - |
| 2-3 | Go unit tests: プロキシの入力検証、レート制限ハンドリング、エラー応答 | 2h | 2-1, 2-2 | #4, #5 |
| 2-4 | Vercel KV セットアップ + Proposal/AuditLog データモデル | 2h | Phase 0 | #6 |
| 2-5 | LangGraph.js: ツール定義 (fetch_google_ads, fetch_meta_ads) | 3h | 2-1, 2-2 | #4, #5 |
| 2-6 | LangGraph.js: グラフ定義 (fetch → analyze → optimize → format) | 4h | 2-5 | #6 |
| 2-7 | LangGraph.js: xAI Grok (ChatXAI) 統合 + フォールバック設定 | 2h | 2-6 | #6 |
| 2-7b | **LLM 使用量トラッキング**（Vercel KV に日次集計、コスト計算） | 1.5h | 2-4, 2-7 | - |
| 2-8 | Vitest: LangGraph.js ツールスキーマ検証、モック応答でグラフ完走テスト | 2h | 2-7 | #6 |
| 2-9 | Go: `/api/agent/invoke` エンドポイント | 2h | 2-6 | #6 |
| 2-10 | Go: 提案 CRUD (`/api/proposals/*`) + リスクスコア算出 | 3h | 2-4, 2-9 | #6, #9 |
| 2-11 | Go unit tests: `assessRisk()` 閾値テスト、提案 CRUD | 1h | 2-10 | #6, #9 |
| 2-12 | `git push development` → CI 通過 → dev 環境で invoke E2E 検証 | 1h | 2-11 | #6 |

**Phase 2 のゴール:** dev 環境で `/api/agent/invoke` → データ取得 → 提案生成 → KV 保存が動作。全リクエストに request_id 付き構造化ログ出力。LLM 使用量が KV に集計され `/api/observability/llm-usage` で取得可能。CI で Go + TS の unit tests がすべてパス。

**並列化ポイント:** 2-1 と 2-2 は独立で並列可能。2-4 は Phase 0 後すぐ着手可能（Phase 1 と並列）。

---

### Phase 3: フロントエンド UI（Day 5-8）

```
前提条件: Phase 1 (認証UI) + Phase 2 (提案API) の主要部分完了
成果物: ダッシュボード + 提案カード + 権限管理が画面で操作可能、コンポーネントテスト付き
```

| ステップ | タスク | 所要時間 | ブロッカー | 対応US |
|---|---|---|---|---|
| 3-1 | AppShell: サイドバー + ヘッダー + レスポンシブレイアウト | 3h | Phase 0 (shadcn) | #15 |
| 3-2 | オンボーディングウィザード (3ステップ) | 4h | 1-5 | #12 |
| 3-3 | Connections ページ: ConnectionCard + ConnectButton + RevokeDialog | 3h | 1-5 | #2 |
| 3-4 | ScopeVisualizer: 付与スコープの視覚表示 | 2h | 3-3 | #2, #12 |
| 3-5 | ダッシュボード: MetricCard (Spend/CTR/CPA/ROAS) + **LLM Usage カード** | 3h | 2-1, 2-2, 2-7b | #7 |
| 3-6 | ダッシュボード: PerformanceChart + PlatformComparison | 4h | 3-5 | #7 |
| 3-7 | ProposalCard + ProposalList + RiskBadge | 4h | 2-10 | #9, #14 |
| 3-8 | ApproveButton + RejectButton + 承認フロー統合 | 3h | 3-7 | #9 |
| 3-9 | Vitest: ProposalCard, RiskBadge, ScopeVisualizer のコンポーネントテスト | 2h | 3-4, 3-7 | - |
| 3-10 | モバイルレスポンシブ調整 | 2h | 3-1〜3-8 | #15 |

**Phase 3 のゴール:** 全画面が操作可能。ダッシュボードでデータ閲覧 → 提案確認 → 承認/却下の UX フロー完成。コンポーネントテストが CI でパス。

**並列化ポイント:** 3-1（レイアウト）は Phase 0 直後から着手可能。3-2/3-3 は Phase 1 の API が動けば統合可能。3-5/3-6 は Phase 2 の Proxy が動けば統合可能。

---

### Phase 4: セキュリティ強化（Day 7-9）

```
前提条件: Phase 1 (認証) + Phase 3 (UI) 完了
成果物: Step-up Auth + 監査ログが dev 環境で完全動作、Integration test でカバー
```

| ステップ | タスク | 所要時間 | ブロッカー | 対応US |
|---|---|---|---|---|
| 4-1 | Go: Step-up 検証 (`acr` クレーム検証) ※ Action/MFA は Terraform 済み | 3h | 1-2 | #8 |
| 4-2 | React: StepUpDialog (MFA モーダル) | 3h | 4-1, 3-8 | #8 |
| 4-3 | Go: 監査ログ記録ミドルウェア | 3h | 2-4 | #11 |
| 4-4 | React: AuditTimeline + AuditEntry | 3h | 4-3 | #11 |
| 4-5 | Go: トークンリフレッシュ失敗ハンドリング | 2h | 2-1, 2-2 | #13 |
| 4-6 | React: 再接続通知トースト | 1h | 4-5, 3-3 | #13 |
| 4-7 | Go: 承認済み提案の API 反映 (`/api/proposals/:id/execute`) | 3h | 4-1, 2-10 | #9 |
| 4-8 | Go unit tests: `acr` クレーム検証、監査ログフォーマット | 2h | 4-1, 4-3 | #8, #11 |
| 4-9 | Integration test: Step-up Auth フロー（dev テナント、MFA なしで承認不可確認） | 2h | 4-1 | #8 |
| 4-10 | E2E test (dev): ハッピーパス + Step-up + 権限取消 + トークン失効 | 3h | 4-7 | ALL |
| 4-11 | `git push development` → CI 全テスト通過確認 | 30min | 4-10 | - |

**Phase 4 のゴール:** dev 環境で HIGH リスク提案の承認に MFA が要求され、全操作が監査ログに記録される。Integration test で Token Vault + Step-up Auth の品質を担保。

---

### Phase 5: Production デプロイ・仕上げ（Day 9-12）

```
前提条件: Phase 1-4 完了、development ブランチで全テスト通過
成果物: production 環境にデプロイ済みプロダクト + 提出物一式
```

| ステップ | タスク | 所要時間 | ブロッカー | 対応US |
|---|---|---|---|---|
| 5-1 | UI ポリッシュ（アニメーション、ローディング状態、空状態） | 3h | Phase 3 | #7, #15 |
| 5-2 | デモ用テストデータ・モックデータ準備 | 2h | Phase 2 | - |
| 5-3 | **PR: `development` → `main`** 作成、CI 全テスト通過を確認 | 1h | 5-1, 5-2 | - |
| 5-4 | **PR マージ → GitHub Actions: Terraform prod apply + Vercel Production 自動デプロイ** | 自動 | 5-3 | - |
| 5-5 | Production 環境で E2E スモークテスト（ログイン → 接続 → 提案 → MFA承認） | 2h | 5-4 | ALL |
| 5-6 | README.md 作成（セットアップ手順、アーキテクチャ図） | 2h | - | - |
| 5-7 | デモ動画撮影（3分以内、**production URL を使用**） | 3h | 5-5 | - |
| 5-8 | ブログポスト執筆（Token Vault 設計パターン、250語+） | 3h | - | #17 |
| 5-9 | DevPost 提出フォーム記入 + 動画アップロード | 1h | 5-7, 5-8 | - |

---

## 3. タイムライン（ガントチャート風）

```
Day   1    2    3    4    5    6    7    8    9    10   11   12   13
      ├────┤
      Phase 0 (初期化 + Terraform + CI/CD)
      ├─────────────────┤
      Phase 1 (Auth0 認証 + Tests) ⚡ クリティカル
                  ├─────────────────┤
                  Phase 2 (Proxy + Agent + Tests)
                        ├─────────────────────┤
                        Phase 3 (Frontend UI + Tests)
                                    ├──────────────────┤
                                    Phase 4 (Security + Integration Tests)
                                                  ├────────────────┤
                                                  Phase 5 (dev→prod + 提出)
                                                       ↑
                                                  development → main PR マージ
                                                  → Production 自動デプロイ
```

### 並列作業マトリクス

| 日 | 作業者A (Backend + Infra) | 作業者B (Frontend) | 備考 |
|---|---|---|---|
| 1 | Phase 0: Terraform + CI/CD workflows + Go init | Phase 0: React + shadcn/ui + Vitest init | 全 push は `development` ブランチへ |
| 2 | 1-1〜1-6 (Go 認証 + Token Exchange) | 1-4 (LoginButton) + 3-1 (AppShell) | Auth0 設定は Terraform 完了済み |
| 3 | 1-7〜1-10 (Unit + Integration tests) + 2-1, 2-2 (Proxy) | 3-2, 3-3 (オンボーディング, 接続UI) | Phase 1 完了 → CI 通過確認 |
| 4 | 2-2b (構造化ログ) + 2-5〜2-7 (LangGraph.js + Grok) + 2-7b (LLM tracker) | 3-4 (ScopeVisualizer) | |
| 5 | 2-9〜2-12 (Invoke + Proposals + tests) | 3-5, 3-6 (ダッシュボード + LLM Usage) | |
| 6 | Phase 2 CI 全テスト通過確認 | 3-7, 3-8 (提案カード, 承認UI) | Phase 2 完了 |
| 7 | 4-1〜4-3 (Step-up Auth + 監査ログ) | 3-9, 3-10 (コンポーネントtest, モバイル) | Phase 3 ほぼ完了 |
| 8 | 4-5〜4-8 (エラー処理 + unit tests) | 4-2, 4-4 (MFA UI, 監査ログUI) | |
| 9 | 4-9〜4-11 (Integration/E2E tests + CI 通過) | 4-6 (通知トースト) | Phase 4 完了 |
| 10 | 5-1, 5-2 (UI ポリッシュ, テストデータ) | 5-1 続き | development ブランチ最終調整 |
| 11 | **5-3 PR: development → main** + 5-4 自動デプロイ | 5-5 prod スモークテスト | **Production デプロイ** |
| 12 | 5-8 (ブログポスト) | 5-7 (デモ動画撮影 @ prod URL) | |
| 13 | 5-9 (DevPost 提出) | レビュー | **締切日** |

---

## 4. リスクバッファ

| リスクイベント | 影響日数 | バッファ戦略 |
|---|---|---|
| Google Ads Developer Token 審査遅延 | +2日 | Day 3 からモックデータで並行開発。デモもモック対応可 |
| Meta Custom OAuth2 の Token Vault 格納失敗 | +1日 | Day 2 で早期検証（Phase 1）。失敗時は Google Ads のみで MVP |
| Vercel タイムアウト（10s Hobby） | +0.5日 | Day 5 で判明。即 Pro プラン移行（$20/月） |
| xAI Grok API 障害 | +0日 | Gemini フォールバックが自動発動（design.md §4.0） |
| Step-up Auth の Auth0 Action 不具合 | +1日 | Day 7 で検証。失敗時はクライアント側で confirm ダイアログ代替 |
| CI テストが dev テナントの Rate Limit に抵触 | +0.5日 | Integration test を手動トリガーに変更 or テスト頻度を削減 |
| Terraform state 破損 | +0.5日 | Terraform Cloud（無料枠）で state をリモート管理。`terraform import` で復旧 |

---

## 5. 成果物チェックリスト

### DevPost 提出必須

- [ ] 動作するアプリケーション URL (`https://adbrain.vercel.app`)
- [ ] デモ動画（3分以内、YouTube/Vimeo）
- [ ] Token Vault を使用していることの証明
- [ ] DevPost 提出フォーム記入

### 審査加点項目

- [ ] Security Model: Progressive Consent + Token Vault 隔離 + Step-up MFA + 監査ログ
- [ ] User Control: 権限管理UI + Human-in-the-Loop + オンボーディング + 説明可能AI
- [ ] Technical Execution: Token Exchange (RFC 8693) + Terraform IaC + CI/CD + テストカバレッジ + **Observability（Auth0 Log Streams + 構造化ログ + LLM コスト監視）**
- [ ] Design: レスポンシブ + モダンUI + リスク可視化
- [ ] Potential Impact: クロスプラットフォーム最適化
- [ ] Insight Value: ブログポスト（$250 ボーナス）— **Agent 運用 Observability パターン（トークン監視 + LLM コスト制御）を文書化**

### CI/CD・テスト

- [ ] GitHub Actions: ci.yml / deploy-dev.yml / deploy-prod.yml
- [ ] Go unit tests: セッション、Token Exchange、リスク算出、acr 検証、監査ログ
- [ ] Vitest: LangGraph.js ツール検証、React コンポーネント
- [ ] Integration tests: Token Exchange 実通信、スコープ最小権限検証、Step-up Auth
- [ ] E2E: ハッピーパス、Step-up、権限取消、トークン失効
- [ ] Observability: Auth0 Log Streams (Terraform)、構造化ログ、LLM Usage KV 集計、Vercel Analytics
- [ ] `development` → `main` PR マージで production 自動デプロイ

### ドキュメント

- [x] requirements.md – ユーザーストーリー・審査基準マッピング
- [x] design.md – システム設計・Auth0統合・セキュリティ設計・UX（全画面ワイヤーフレーム + 4 状態 + PWA）
- [x] roadmap.md – 実装計画・依存関係・タイムライン
- [x] insights-blog.md – ブログポスト構成アウトライン（3 パターン + Pain Points）
- [x] demo.md – デモ動画ストーリーボード（3 分 × 6 審査基準対応）
- [ ] README.md – セットアップ手順・アーキテクチャ概要
