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
