import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ユーザープールの作成（MFA必須）
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'ZeroTrustUserPool',
      // メールアドレスでサインイン
      signInAliases: {
        email: true,
      },
      // パスワードポリシー（金融系は厳しめに設定）
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      // MFAを必須に設定
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        otp: true,   // Google Authenticator等のTOTP
        sms: false,  // SMS認証は今回は無効
      },
      // サインアップ時にメール確認を要求
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      // アカウント削除設定（開発環境用）
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 一般ユーザーグループ
    new cognito.CfnUserPoolGroup(this, 'UsersGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Users',
      description: '一般ユーザーグループ',
    });

    // 管理者グループ
    new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Admins',
      description: '管理者グループ',
    });

    // アプリクライアントの作成
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'ZeroTrustClient',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      // トークンの有効期限（金融系は短めに設定）
      accessTokenValidity: cdk.Duration.minutes(30),
      idTokenValidity: cdk.Duration.minutes(30),
      refreshTokenValidity: cdk.Duration.days(1),
    });

    // 出力
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
