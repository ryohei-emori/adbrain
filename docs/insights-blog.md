# Blog Post: Insight Value Submission
# "Building Secure AI Agents with Auth0 Token Vault: Patterns for the Real World"

> DevPost Bonus Blog Post Prize: $250 × 6 winners
> Judging: quality, relevance to the Auth0 community, completeness
> Minimum: 250 words | Target: 1,200–1,500 words
> Publish: Dev.to or Hashnode (public URL required)

---

## メタ情報

| 項目 | 値 |
|---|---|
| **タイトル** | Building Secure AI Agents with Auth0 Token Vault: Patterns for the Real World |
| **サブタイトル** | From token isolation to LLM cost control — lessons from building AdBrain |
| **対象読者** | Auth0 を使う開発者、AI Agent を構築する開発者、OAuth2 セキュリティに関心のある開発者 |
| **公開先** | Dev.to（Auth0 タグ、AI タグ、OAuth タグ） |
| **著者** | (TBD) |

---

## 構成アウトライン

### 1. Introduction（~150 words）

**フック:** AI エージェントに外部 API アクセスを与えるとき、最も難しい問題は「何ができるか」ではなく「何を許可するか」。

- AI Agent が OAuth2 トークンで外部 API を叩く時代が来ている
- だが、トークン管理・スコープ制御・ユーザー同意を正しく実装するのは困難
- Auth0 Token Vault はこの問題を根本的に解決する
- この記事では AdBrain（AI 広告最適化エージェント）の構築から得た **3 つのパターン** を共有する

### 2. Pattern 1: Agent-Proxy-Vault アーキテクチャ（~300 words）

**問題:** LLM エージェントに直接 OAuth トークンを渡すと、プロンプトインジェクション等でトークンが漏洩するリスク。

**パターン:**

```
Agent (LangGraph.js)
    ↓ Tool Call (no token)
Proxy (Go Backend)
    ↓ Token Exchange (RFC 8693)
Auth0 Token Vault
    ↓ External Provider Token
Google Ads / Meta API
```

**解説ポイント:**
- エージェントは「何のデータが欲しいか」だけを指定し、トークンに触れない
- Go Proxy が Token Vault から必要なトークンを都度取得（短寿命）
- 3 層の境界線: Browser → Server → Token Vault
- このパターンは **任意の OAuth2 API** に適用可能（広告以外にも）

**コードサンプル:** Token Exchange の Go 実装（5-10 行の簡潔な例）

### 3. Pattern 2: Progressive Consent for Agents（~300 words）

**問題:** 初回ログインで全権限を要求すると、離脱率が上がる。かつ、過剰なスコープはセキュリティリスク。

**パターン:**
1. ログイン時は `email + profile` のみ（Google Social Connection）
2. ユーザーが明示的に「Google Ads を接続」→ Token Vault に `adwords` スコープ追加
3. 高リスク操作時に Step-up Auth（MFA）

**解説ポイント:**
- Auth0 の Connection を 2 種類に分離: Authentication 用 vs Connected Accounts 用
- `purpose: authentication` vs `purpose: connected_accounts` の設計判断
- ユーザーが「今何を許可しているか」を常に理解できるスコープ可視化
- Auth0 Actions で `acr_values` ベースの Step-up を条件付き適用

**コードサンプル:** Auth0 Post Login Action の Step-up MFA コード（既に design.md にある 10 行程度）

### 4. Pattern 3: Observability for Token-Based Agent Systems（~300 words）

**問題:** AI エージェントが外部 API をどのくらい、どの頻度で、どのコストで叩いているか可視化されていない。本番運用で障害に気づけない。

**パターン:**
- **Auth0 Log Streams** → Token Exchange の成功/失敗率、MFA イベントをリアルタイム監視
- **Go 構造化ログ** → `request_id` で Token Exchange → 外部 API 呼出までトレース可能
- **LLM 使用量トラッキング** → Vercel KV に日次集計、$25 クレジット枯渇アラート

**解説ポイント:**
- Auth0 のビルトイン Log Streams を Terraform で設定（HCL コード例）
- 「production-aware」な AI Agent 開発とは何か
- LLM コスト制御の重要性（特にハッカソン後のスケーリング時）
- Vercel Analytics と組み合わせた軽量 Observability スタック

**コードサンプル:** LLM Usage Tracker の TypeScript 実装（10 行程度）

### 5. Lessons Learned & Pain Points（~200 words）

Auth0 コミュニティへのフィードバック（Insight Value を高める重要セクション）。

- **Token Vault + Custom OAuth2 Connection**: Meta (Facebook) は Token Vault のネイティブプロバイダではないため、Custom OAuth2 Connection として設定した。ドキュメントが限られていた点、`token_endpoint` の設定で注意した点。
- **Step-up Auth の実装パターン**: `acr_values` ベースのMFA 要求は強力だが、React SPA + サーバーサイドの連携で手順が多い。SDK レベルでのサポートがあると嬉しい。
- **Token Exchange のエラーハンドリング**: Refresh Token 失効時のユーザー通知フローをどう設計したか。Silent failure は UX を大きく損なう。
- **Terraform for Auth0**: `auth0_connection` の `purpose` フィールド（`authentication` vs `connected_accounts`）がドキュメント上で見つけにくかった。

### 6. Conclusion（~100 words）

- これらの 3 パターンは AdBrain に限らず、**OAuth2 API にアクセスする任意の AI Agent** に適用可能
- Auth0 Token Vault は AI Agent 時代の「identity layer」として非常に有望
- Open Source のサンプルリポジトリへのリンク
- 「あなたの Agent にもこのパターンを適用してみてください」

---

## 審査訴求マッピング

| ブログ審査基準 | 対応セクション |
|---|---|
| **Quality** | 3 つの具体的パターン + コードサンプル + アーキテクチャ図 |
| **Relevance to Auth0 community** | Token Vault, Connected Accounts, Actions, Log Streams — すべて Auth0 機能 |
| **Completeness** | 問題定義 → パターン → コード → 教訓 → 結論の完全な流れ |

## DevPost Judging Criteria への貢献

| 審査基準 | ブログでの訴求 |
|---|---|
| **Insight Value** | 直接対応。3 パターン + Pain Points が「agent authorization の進化に有用な知見」 |
| **Technical Execution** | コードサンプルとアーキテクチャ図で実装品質を補強 |
| **Security Model** | Pattern 1 & 2 が Token 隔離 + Progressive Consent を解説 |

---

## 執筆スケジュール

| タイミング | タスク |
|---|---|
| Phase 2 完了後（Day 6） | Pattern 1 (Agent-Proxy-Vault) のコードサンプルが実装済み → 執筆開始 |
| Phase 4 完了後（Day 9） | Pattern 2 (Step-up Auth) + Pattern 3 (Observability) の実装完了 → 残りを執筆 |
| Day 12 | Pain Points + Conclusion + 推敲 → Dev.to に公開 |

---

## 参考リソース（記事内リンク候補）

- [Auth0 Token Vault Documentation](https://auth0.com/features/token-vault)
- [RFC 8693: OAuth 2.0 Token Exchange](https://datatracker.ietf.org/doc/html/rfc8693)
- [Auth0 Actions Documentation](https://auth0.com/docs/customize/actions)
- [Auth0 Log Streams](https://auth0.com/docs/customize/log-streams)
- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [Auth0 Terraform Provider](https://registry.terraform.io/providers/auth0/auth0/latest/docs)
- AdBrain GitHub Repository (TBD)
