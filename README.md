# AWS Zero Trust API Security for Financial Systems

金融システムを想定したゼロトラストAPIセキュリティ基盤をAWS CDK（TypeScript）で構築したポートフォリオプロジェクトです。

## 🏗️ アーキテクチャ
```
外部リクエスト
    ↓
AWS Shield Standard（DDoS防御）
    ↓
AWS WAF（不正リクエストブロック）
    ↓
API Gateway（エンドポイント管理・スロットリング）
    ↓
Lambda Authorizer（IP・時間帯チェック）
    ↓
バックエンドAPI
    ↓
CloudTrail・CloudWatch・SNS（監視・通知）
```

## 🔒 セキュリティ機能

### AWS WAF
- AWSマネージドルール（XSS・SQLインジェクション防御）
- レートベースルール（5分間1,000リクエスト超でブロック）
- IPブラックリスト管理

### Cognito（MFA必須）
- パスワードポリシー（12文字以上・大文字・数字・記号必須）
- TOTP多要素認証（Google Authenticator等）
- アクセストークン有効期限30分（金融系基準）

### Lambda Authorizer
- 取引時間外アクセスの拒否（平日9時〜18時のみ許可）
- IPホワイトリストによるアクセス制御
- カスタム認証ロジックの実装

### API Gateway
- スロットリング設定（1秒100リクエスト・瞬間200リクエスト）
- Cognitoとの統合
- CORSの設定

### 監視・通知
- CloudTrail（全APIアクセスの監査ログ・365日保存・改ざん検知）
- CloudWatchアラーム（WAFブロック数・4XXエラー・5XXエラー）
- SNS（セキュリティアラートのメール通知）

## 🛠️ 使用技術

| カテゴリ | 技術 |
|---------|------|
| IaC | AWS CDK（TypeScript） |
| 認証 | Amazon Cognito（MFA） |
| WAF | AWS WAF v2 |
| API | Amazon API Gateway |
| 認可 | AWS Lambda Authorizer |
| 監視 | CloudWatch・CloudTrail・SNS |
| DDoS対策 | AWS Shield Standard |

## 📁 プロジェクト構成
```
aws-zero-trust-api-security/
├── lambda/
│   └── authorizer/
│       └── index.ts         # Lambda Authorizerロジック
└── cdk/
    └── lib/
        ├── waf-stack.ts         # WAFルール定義
        ├── cognito-stack.ts     # Cognito・MFA設定
        ├── api-stack.ts         # API Gateway・Lambda Authorizer
        └── monitoring-stack.ts  # CloudTrail・CloudWatch・SNS
```

## 🚀 デプロイ手順
```bash
# 依存パッケージのインストール
cd cdk
npm install

# CDKブートストラップ（初回のみ）
cdk bootstrap

# 全スタックをデプロイ
cdk deploy --all

# スタックの削除
cdk destroy --all
```

## ✅ 動作確認
```bash
# 死活監視（認証不要）
curl https://YOUR_API_URL/prod/health

# 認証なしでアクセス → 401 Unauthorized
curl https://YOUR_API_URL/prod/transactions

# 取引時間外アクセス → 403 Forbidden
# （Lambda Authorizerが拒否）
```

## 🔑 ゼロトラストの設計原則

本プロジェクトでは以下のゼロトラスト原則を実装しています。

- **何も信頼しない** → 全リクエストをLambda Authorizerで検証
- **最小権限** → IAMロールで必要最低限の権限のみ付与
- **常に検証** → IP・時間帯・トークンを毎回チェック
- **監査証跡** → CloudTrailで全アクセスを記録

## 📌 金融規制との関連

| 規制・基準 | 対応内容 |
|-----------|---------|
| FISC安全対策基準 | 多要素認証・アクセスログ保存 |
| PCI DSS | 暗号化通信・アクセス制御・監査ログ |
| 不正アクセス禁止法 | WAFによる不正リクエストブロック |

## 🛡️ 防御できる攻撃一覧

### AWS Shield Standard

| 攻撃の種類 | 具体的な内容 | 防御方法 |
|-----------|------------|---------|
| SYN Flood | 大量のTCP接続要求でサーバーをダウンさせる | 異常なSYNパケットを自動検知・遮断 |
| UDP Flood | 大量のUDPパケットで帯域を枯渇させる | 異常トラフィックを自動フィルタリング |
| Reflection攻撃 | DNSサーバー等を踏み台にトラフィックを増幅させる | 増幅されたトラフィックを自動遮断 |

### AWS WAF

| 攻撃の種類 | 具体的な内容 | 対応ルール |
|-----------|------------|---------|
| SQLインジェクション | DBを不正操作する文字列をAPIに送り込む | AWSManagedRulesSQLiRuleSet |
| XSS | 悪意のあるJavaScriptをAPIに送り込む | AWSManagedRulesCommonRuleSet |
| パストラバーサル | サーバーのファイルに不正アクセスする | AWSManagedRulesCommonRuleSet |
| DDoS（アプリ層） | 大量HTTPリクエストでAPIをダウンさせる | レートベースルール（5分間1,000超でブロック） |
| 特定IPからの攻撃 | 不審なIPからの継続的な攻撃 | IPブラックリストルール |

### Lambda Authorizer

| 攻撃・リスクの種類 | 具体的な内容 | 防御方法 |
|-----------------|------------|---------|
| 時間外不正アクセス | 深夜・休日に管理者を装ってAPIにアクセス | 平日9〜18時以外のアクセスを拒否 |
| 不審なIPからのアクセス | 海外や不審なIPからの不正アクセス試行 | IPホワイトリスト以外を拒否 |
| トークンなしアクセス | 認証を経由せずAPIを直接叩く | Authorizationヘッダーなしのリクエストを拒否 |

### API Gateway（スロットリング）

| 攻撃・リスクの種類 | 具体的な内容 | 防御方法 |
|-----------------|------------|---------|
| APIへの過負荷攻撃 | 大量リクエストでAPIをダウンさせる | 1秒100リクエスト超を自動遮断 |
| バースト攻撃 | 瞬間的に大量リクエストを送りつける | 瞬間200リクエスト超を自動遮断 |

### Cognito（MFA）

| 攻撃・リスクの種類 | 具体的な内容 | 防御方法 |
|-----------------|------------|---------|
| パスワードクラッキング | ブルートフォース攻撃でパスワードを解析 | 12文字以上・記号必須で解析を困難にする |
| パスワードリスト攻撃 | 流出したパスワードリストで不正ログイン | MFAでパスワードだけでは侵入不可にする |
| フィッシング | 偽サイトでパスワードを盗む | MFAがあるためパスワードだけでは侵入不可 |
| セッションハイジャック | JWTトークンを盗んで悪用する | トークン有効期限30分で被害を限定 |

### CloudTrail・CloudWatch・SNS

| リスクの種類 | 具体的な内容 | 対応方法 |
|------------|------------|---------|
| 内部不正 | 内部の人間がこっそりデータを操作する | 全操作を監査ログに記録・改ざん検知 |
| 攻撃の見逃し | WAFをすり抜けた攻撃に気づかない | 4XXエラー急増をアラートで即時通知 |
| インシデント調査 | 攻撃後に原因を調査できない | CloudTrailのログで攻撃経路を追跡 |

## 🏰 多層防御（Defense in Depth）

今回の構成は金融セキュリティの基本原則である多層防御を実装しています。1つの層を突破されても次の層が防御するため、単一の防御策に頼るより格段に安全性が高まります。
```
層1: Shield Standard → ネットワーク層のDDoS攻撃を防ぐ
層2: WAF             → アプリ層の不正リクエストを防ぐ
層3: API Gateway     → 過負荷攻撃を防ぐ
層4: Lambda Authorizer → 不審なアクセスパターンを防ぐ
層5: Cognito（MFA）  → 不正ログインを防ぐ
層6: 監視・通知      → すり抜けた攻撃を検知・通知する
```
