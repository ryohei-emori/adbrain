# AdBrain – AI Ad Campaign Optimizer

> reference: https://authorizedtoact.devpost.com/

## プロダクト概要

**AdBrain** は、Auth0 Token Vault を活用し、ユーザーの Google Ads / Meta Ads アカウントに対して AI エージェントが安全にアクセスし、キャンペーン最適化提案を生成・実行する SaaS アプリケーションである。エージェントの行動はすべてユーザーの明示的な同意のもとで行われ、高リスク操作にはステップアップ認証を要求する。

---

## 技術スタック

```
[React/TS on Vercel]
    ↓
[Go on Vercel] ← Auth0 SDK, OAuth callback, Token Vault broker, API proxy
    ↓
[LangGraph.js on Vercel (Serverless)] ← Stateless invoke, no checkpointer
    ↓
[Google Ads / Meta API via Token Vault]
```

- **フロントエンド**: React + TypeScript (Vercel)
- **バックエンド**: Go (Vercel Serverless Functions)
- **AIエージェント**: LangGraph.js + xAI Grok (Vercel Serverless, ステートレス)
- **LLM**: xAI Grok 3 Mini（$25無料クレジット、$0.10/M tokens）/ フォールバック: Google Gemini 2.5 Flash
- **認証・認可**: Auth0 (Free Tier) + Token Vault
- **外部API**: Google Ads API, Meta Marketing API

---

## GoでAuth0は書けます ✅

公式の `go-auth0` SDK（`github.com/auth0/go-auth0`）が存在し、**AuthenticationクライアントとManagement APIクライアントの両方**をカバーします。Token VaultのAccess Token Exchangeは`POST /oauth/token`へのREST呼び出しで実装できるため、GoのネイティブHTTPクライアントで完結します。OAuth callbackもAuth0の公式GoクイックスタートにGin使用例があり実績十分です。 [auth0](https://auth0.com/docs/quickstart/webapp/golang)

---

## LangGraph.jsのCheckpointは不要にできます

Checkpointは**マルチターン会話でエージェント状態を永続化するため**のものです。今回のユースケース（「このキャンペーンデータを最適化して」→ 1回の返答）は**ステートレスな単一invocation**で設計できるため、`compile()`時にcheckpointerを省略可能です。LangGraph.js v0.2はVercelのEdge runtimeで動作確認済み。ステートレスrunでは`thread_id`不要で、サーバーレスと相性が良い。 [support.langchain](https://support.langchain.com/articles/1242226068-how-do-i-configure-checkpointing-in-langgraph)

**結論：ステートレス設計でVercelにまとめられます。**

---

## 審査基準マッピング

| 審査基準 | 重み | 対応するユーザーストーリー |
|---|---|---|
| **Security Model** | 最重要 | #1, #3, #8, #10, #11, #13 |
| **User Control** | 最重要 | #2, #9, #12, #14 |
| **Technical Execution** | 重要 | #3, #4, #5, #6 |
| **Design** | 重要 | #7, #12, #14, #15 |
| **Potential Impact** | 重要 | #6, #16 |
| **Insight Value** | ボーナス | #17 |

---

## ユーザーストーリー

### 認証・認可 (Security Model)

| # | ユーザーストーリー | 機能領域 | 対応コンポーネント | 審査基準 | 難易度 | MVP |
|---|---|---|---|---|---|---|
| 1 | ユーザーとして Auth0 でログインし、Google Ads / Meta アカウントを Connected Accounts で OAuth 連携できる | 認証・認可 | Go + Auth0 SDK + Token Vault Connected Accounts | Security Model | 中 | ✅ |
| 3 | エージェントとして Token Vault の Access Token Exchange 経由で Google Ads API のアクセストークンを安全に取得できる（トークンがフロントエンドに露出しない） | Token Vault | Go (`POST /oauth/token` RFC 8693) | Security Model | 中 | ✅ |
| 8 | エージェントが高リスクアクション（予算50%超変更、キャンペーン停止等）を検出した場合、Step-up認証（MFA）をユーザーに要求し、承認後のみ実行する | Step-up Auth | Auth0 Actions + `acr_values` + Go | Security Model | 高 | ✅ |
| 10 | Token Vault のトークンスコープが最小権限原則に従い設定されている（Google: `adwords` 単一スコープ、Meta: `ads_management` + `ads_read`） | セキュリティ設計 | Auth0 Connected Accounts 設定 | Security Model | 低 | ✅ |
| 11 | エージェントの全API呼び出しが監査ログに記録され、ユーザーが「いつ、何を、どのスコープで」実行されたかを確認できる | 監査ログ | Go + React UI | Security Model, Insight Value | 中 | ✅ |

### ユーザーコントロール (User Control)

| # | ユーザーストーリー | 機能領域 | 対応コンポーネント | 審査基準 | 難易度 | MVP |
|---|---|---|---|---|---|---|
| 2 | ユーザーとして自分が付与した外部 API 権限の一覧（プロバイダ名、スコープ、接続日時）を確認し、いつでも取り消しできる | 権限管理UI | React + Go + Auth0 Management API | User Control | 中 | ✅ |
| 9 | ユーザーとしてエージェントの最適化提案をカード形式で確認し、個別に承認・却下でき、承認時のみ API に反映される（Human-in-the-Loop） | 承認フロー | React + Go + LangGraph.js | User Control | 高 | ✅ |
| 12 | ユーザーとして初回ログイン後、ステップバイステップのオンボーディングウィザードで広告アカウントを接続し、エージェントに付与するスコープを視覚的に選択できる | オンボーディング | React UI | User Control, Design | 中 | ✅ |

### APIプロキシ・データ取得 (Technical Execution)

| # | ユーザーストーリー | 機能領域 | 対応コンポーネント | 審査基準 | 難易度 | MVP |
|---|---|---|---|---|---|---|
| 4 | エージェントとして Meta Marketing API のキャンペーンデータ（CTR、CPC、インプレッション、コンバージョン）を取得できる | APIプロキシ | Go proxy + LangGraph.js tool | Technical Execution | 中 | ✅ |
| 5 | エージェントとして Google Ads API のキャンペーン予算・入札・パフォーマンスデータを取得できる | APIプロキシ | Go proxy + LangGraph.js tool | Technical Execution | 中 | ✅ |
| 13 | Go プロキシがトークンリフレッシュ失敗時にユーザーへ再認証を促す通知を送り、サイレントな権限喪失を防止する | エラーハンドリング | Go + React notification | Technical Execution, Security Model | 中 | ✅ |

### エージェントロジック (Potential Impact)

| # | ユーザーストーリー | 機能領域 | 対応コンポーネント | 審査基準 | 難易度 | MVP |
|---|---|---|---|---|---|---|
| 6 | エージェントとしてクロスプラットフォーム（Google Ads + Meta）のキャンペーンデータを統合分析し、予算配分・入札戦略の最適化提案を生成できる | Agent Logic | LangGraph.js graph | Potential Impact | 高 | ✅ |

### フロントエンド・UX (Design)

| # | ユーザーストーリー | 機能領域 | 対応コンポーネント | 審査基準 | 難易度 | MVP |
|---|---|---|---|---|---|---|
| 7 | ユーザーとしてダッシュボードで Google Ads / Meta のキャンペーンパフォーマンスを統合ビューで確認でき、エージェントの提案がインラインで表示される | ダッシュボード | React UI (Charts) | Design | 中 | ✅ |
| 14 | ユーザーとしてエージェントの提案理由（「Meta の CPC が Google より 30% 高いため予算シフトを推奨」等）が自然言語で説明され、意思決定の根拠を理解できる | 説明可能AI | LangGraph.js + React | Design, User Control | 中 | ✅ |
| 15 | ユーザーとしてモバイルでもレスポンシブにダッシュボードを操作でき、承認アクションをワンタップで実行できる | モバイルUX | React (Responsive) | Design | 低 | ✅ |

### 将来拡張・ボーナス

| # | ユーザーストーリー | 機能領域 | 対応コンポーネント | 審査基準 | 難易度 | MVP |
|---|---|---|---|---|---|---|
| 16 | ユーザーとして TikTok Ads も OAuth 連携して最適化提案に含められる | APIプロキシ拡張 | Go + LangGraph.js | Potential Impact | 高 | ❌ |
| 17 | 開発者向けブログポスト（250語以上）で Token Vault 設計パターンを解説 | ドキュメント | テキスト | Insight Value | 低 | ❌（ボーナス$250） |

---

## MVPスコープ

**#1〜#15** に絞れば、**Go + LangGraph.js on Vercel + Auth0 フリーティア**で技術的に完遂可能。

審査基準の最重要2軸を直接押さえる設計：
- **Security Model**: Token Vault によるトークン隔離、最小権限スコープ、Step-up認証、監査ログ (#1, #3, #8, #10, #11, #13)
- **User Control**: 権限管理UI、Human-in-the-Loop承認、オンボーディングウィザード、説明可能AI (#2, #9, #12, #14)

---

## 技術的制約・注意事項

| 項目 | 制約 | 対策 |
|---|---|---|
| Meta/Facebook は Token Vault ネイティブプロバイダでない | Custom OAuth2 Connection で Connected Accounts に登録 | Auth0 の Generic OAuth2 統合で `ads_management` スコープを設定 |
| Google Ads API は `adwords` 単一スコープ | 細粒度スコープ制御不可 | Go プロキシ層でエンドポイント単位のアクセス制御を実装 |
| CIBA（非同期認可）は Enterprise Plan 必須 | Free Tier では利用不可 | Step-up Auth（MFA Actions）で代替。十分な審査評価が得られる |
| Vercel Serverless のタイムアウト（Hobby: 10s, Pro: 60s） | LLM呼び出し + 外部API で超過リスク | ストリーミングレスポンス + 分割invocation で対処 |
| Meta App Review が `ads_management` Advanced Access に必要 | ハッカソンデモでは自アカウントのStandard Accessで十分 | デモ用テストアカウントで運用 |
