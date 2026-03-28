# AdBrain – デモ動画ストーリーボード

> 制約: 3 分以内（審査員は 3 分以降視聴の義務なし）
> 形式: YouTube / Vimeo にアップロード、DevPost に URL 提出
> 撮影環境: production URL (https://adbrain.vercel.app) を使用
> デバイス: Desktop (Chrome) + Mobile (iPhone Safari / PWA) の両方を見せる

---

## 構成方針

**3 分で 6 つの審査基準すべてにタッチする。**

| 時間配分 | セクション | 主要訴求 | 審査基準 |
|---|---|---|---|
| 0:00–0:15 | Hook + Product Intro | 問題提起 → AdBrain の価値 | — |
| 0:15–0:50 | Security: Login + Connect + Token Vault | トークン隔離 + Progressive Consent | Security Model |
| 0:50–1:20 | User Control: Scope 可視化 + 提案確認 | スコープ確認 + Human-in-the-Loop | User Control |
| 1:20–1:55 | Agent in Action: 分析 + 提案 + Step-up | AI 分析 → MFA 承認 → 実行 | Technical Execution |
| 1:55–2:25 | Design: Dashboard + Mobile + Audit | UX 品質 + レスポンシブ + 監査 | Design |
| 2:25–2:50 | Impact + Observability | 拡張性 + production-aware | Potential Impact |
| 2:50–3:00 | Closing + Insight Value | アーキテクチャ + ブログ言及 | Insight Value |

---

## 詳細ストーリーボード

### 0:00–0:15 — Hook + Product Intro

**映像:** ランディングページ全体 → ゆっくりスクロール

**ナレーション:**
> "AI agents are powerful — but giving them access to your ad accounts is risky. AdBrain solves this. It's an AI ad optimizer that uses Auth0 Token Vault to ensure your tokens never leave a secure boundary, and every action requires your explicit approval."

**ポイント:**
- 最初の 10 秒で「何を作ったか」「何が特別か」を伝える
- Token Vault を最初の文で言及する

---

### 0:15–0:50 — Security Model（35 秒）

**映像シーケンス:**

1. **[0:15]** 「Sign in with Google」ボタンをクリック
2. **[0:18]** Auth0 Universal Login → Google OAuth consent 画面
   - ナレーション: "Login only requests email and profile — no ad account access yet."
   - **画面で scope が `email, profile` のみであることを見せる**
3. **[0:25]** ログイン完了 → オンボーディング画面
4. **[0:28]** 「Connect Google Ads」ボタンをクリック
   - ナレーション: "Ad account access is separate — granted explicitly through Auth0 Connected Accounts."
   - **OAuth consent で `adwords` scope が表示される瞬間を見せる**
5. **[0:35]** 接続完了 → ScopeVisualizer で権限が可視化されている
   - ナレーション: "Users can see exactly what permissions they've granted, in human-readable language — not raw OAuth scopes."
6. **[0:45]** Meta Ads も接続（早送り可）

**訴求:** Progressive Consent、最小権限、トークン隔離

---

### 0:50–1:20 — User Control（30 秒）

**映像シーケンス:**

1. **[0:50]** Connections ページ → 接続済みカードの表示
   - Token status: ● Healthy、Last used: 2 min ago
   - ナレーション: "Users have full visibility into their connections — including token health and last usage."
2. **[0:58]** 「Disconnect」ボタンをホバー → RevokeDialog が表示
   - ナレーション: "Before revoking, users see exactly what will happen — pending proposals will be deleted, the agent will lose access."
   - **影響範囲の事前説明を強調**
3. **[1:05]** Proposals ページに移動 → 提案カードリスト
   - 🟡 MEDIUM: Budget shift 提案の詳細表示
   - ナレーション: "Every optimization proposal shows the reasoning, expected impact, and risk level. Nothing happens without approval."
4. **[1:15]** 提案の「Approve」ボタンを押す → 成功トースト

**訴求:** 権限可視化、影響範囲の事前説明、Human-in-the-Loop

---

### 1:20–1:55 — Technical Execution: Agent + Step-up Auth（35 秒）

**映像シーケンス:**

1. **[1:20]** Dashboard で「Analyze Campaigns」ボタン（or 自動実行）
   - ナレーション: "The AI agent fetches campaign data through our Go proxy. Tokens are exchanged via RFC 8693 — the agent itself never sees them."
2. **[1:28]** エージェントが分析中の表示（ストリーミング or ローディング）
   - ナレーション: "LangGraph.js orchestrates the analysis across Google Ads and Meta, comparing performance metrics cross-platform."
3. **[1:35]** 新しい提案が生成される → 🔴 HIGH リスク提案
   - 「Pause Summer Sale campaign」— ROAS < 1.0
   - ナレーション: "This is a high-risk action — pausing a campaign. Watch what happens."
4. **[1:40]** 「Approve (MFA)」ボタンをクリック
   - Auth0 MFA チャレンジ画面が表示される
   - ナレーション: "Step-up authentication kicks in. The user must verify with MFA before any high-risk action is executed."
5. **[1:48]** TOTP コード入力 → 承認完了 → 提案ステータスが「Executed」に変更
   - ナレーション: "Verified. The change is now applied to Google Ads through Token Vault."

**訴求:** Token Exchange (RFC 8693)、Step-up Auth、Agent アーキテクチャ

---

### 1:55–2:25 — Design（30 秒）

**映像シーケンス:**

1. **[1:55]** Desktop ダッシュボードの全体ビュー
   - KPI カード + パフォーマンスチャート + 提案リスト
   - ナレーション: "The dashboard gives a unified view across platforms — Google and Meta side by side."
2. **[2:03]** **画面をモバイルに切り替え**（iPhone の画面録画 or DevTools モバイルビュー）
   - PWA としてインストールされた AdBrain を開く
   - ボトムナビゲーション、2×2 グリッドの KPI カード
   - ナレーション: "AdBrain is a PWA — installable on any phone. The entire approval flow works on mobile with one-tap actions."
3. **[2:13]** モバイルで提案を承認する操作
4. **[2:18]** Audit Log ページに移動（Desktop に戻る）
   - タイムライン表示: Token Exchange、API Call、Step-up Auth の履歴
   - ナレーション: "Every action is recorded in an audit timeline — token exchanges, API calls, MFA verifications. Full transparency."

**訴求:** モダン UI、レスポンシブ / PWA、フロントエンド + バックエンドの Balance、監査ログ

---

### 2:25–2:50 — Potential Impact + Observability（25 秒）

**映像シーケンス:**

1. **[2:25]** Connections ページの TikTok Ads「Coming Soon」カードを見せる
   - ナレーション: "The architecture is provider-agnostic. Adding TikTok Ads is just adding a new Auth0 Connection — the agent, proxy, and Token Vault patterns stay the same."
2. **[2:33]** Settings → LLM Usage カードを見せる
   - 使用量、コスト、クレジット残高のリアルタイム表示
   - ナレーション: "We built observability into the system. LLM costs are tracked in real-time, and Auth0 Log Streams monitor every token exchange."
3. **[2:42]** （可能であれば）Vercel Analytics のダッシュボードをチラ見せ
   - ナレーション: "This isn't a hackathon prototype — it's production-aware. Terraform manages all infrastructure, GitHub Actions handles CI/CD, and every commit is tested."

**訴求:** 拡張可能アーキテクチャ、production-aware、Observability

---

### 2:50–3:00 — Closing（10 秒）

**映像:** アーキテクチャ図（design.md §1 のもの）を全画面表示

**ナレーション:**
> "AdBrain: AI-powered ad optimization with enterprise-grade security. Built with Auth0 Token Vault, Go, LangGraph.js, and React — all on Vercel. Check out our blog post for the full architecture patterns. Thank you."

**画面にオーバーレイ:**
```
AdBrain
https://adbrain.vercel.app
Blog: [Dev.to URL]
GitHub: [repo URL]
```

---

## 撮影テクニカルノート

### 撮影ツール
- **Screen recording:** OBS Studio or macOS Screen Recording
- **Mobile recording:** iPhone Screen Recording → AirDrop → 編集
- **編集:** iMovie or DaVinci Resolve（カット + テロップ程度）

### 準備チェックリスト

- [ ] Production 環境 (https://adbrain.vercel.app) が安定稼働
- [ ] テスト用 Google Ads / Meta Ads アカウントにデータあり
- [ ] 🟡 MEDIUM + 🔴 HIGH の提案が両方表示されている状態
- [ ] MFA (TOTP) が設定済みで、6 桁コードを即入力可能
- [ ] ブラウザのブックマークバー・通知をオフ（画面をクリーンに）
- [ ] iPhone に PWA インストール済み
- [ ] Vercel Analytics に少量のデータあり
- [ ] LLM Usage カードにデータあり

### リハーサル

- [ ] 通しリハーサル 3 回以上
- [ ] 各セクションのタイムを計測、3 分以内に収まるか確認
- [ ] ナレーションの台本を事前に録音してタイミング確認
- [ ] モバイル ↔ Desktop の画面切替がスムーズか確認

---

## 審査基準 × 時間配分マトリクス

| 審査基準 | 触れるタイミング | 合計秒数 | 十分か |
|---|---|---|---|
| Security Model | 0:15–0:50 | 35s | ✅ Progressive Consent + Token Vault + 最小権限 |
| User Control | 0:50–1:20 | 30s | ✅ スコープ可視化 + Revoke 影響 + HitL |
| Technical Execution | 1:20–1:55 + 2:25–2:50 | 60s | ✅ Token Exchange + Step-up + Observability + IaC |
| Design | 1:55–2:25 | 30s | ✅ Desktop + Mobile/PWA + Audit Log |
| Potential Impact | 2:25–2:35 | 10s | ⚠ 短いが TikTok 拡張で十分 |
| Insight Value | 2:50–3:00 | 10s | ⚠ ブログ URL 言及 + アーキテクチャ図 |

**最も重い基準 (Security Model, User Control) に最も時間を割いている。**
