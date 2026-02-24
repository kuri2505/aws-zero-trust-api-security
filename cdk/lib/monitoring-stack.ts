import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

interface MonitoringStackProps extends cdk.StackProps {
  api: apigateway.RestApi;
  alertEmail: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // SNSトピックの作成（アラート通知用）
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'ZeroTrustSecurityAlert',
      displayName: 'ゼロトラストセキュリティアラート',
    });

    // メール通知の設定
    alertTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(props.alertEmail)
    );

    // CloudTrail用S3バケット（監査ログ保存）
    const trailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `zero-trust-cloudtrail-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // ログの暗号化
      encryption: s3.BucketEncryption.S3_MANAGED,
      // ログの保持期間（金融系は長期保存が必要）
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // CloudTrailの有効化
    new cloudtrail.Trail(this, 'SecurityTrail', {
      trailName: 'ZeroTrustSecurityTrail',
      bucket: trailBucket,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: false,
      enableFileValidation: true, // ログの改ざん検知
    });

    // CloudWatchアラーム1: WAFブロック数の監視
    const wafBlockAlarm = new cloudwatch.Alarm(this, 'WafBlockAlarm', {
      alarmName: 'ZeroTrust-WAF-HighBlockRate',
      alarmDescription: 'WAFのブロック数が急増しています。DDoS攻撃の可能性があります。',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: {
          WebACL: 'FinancialApiWebAcl',
          Region: this.region,
          Rule: 'ALL',
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 100, // 5分間で100件以上ブロックされたらアラート
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // CloudWatchアラーム2: API 4XXエラー率の監視
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxAlarm', {
      alarmName: 'ZeroTrust-API-High4xxRate',
      alarmDescription: '認証エラーが急増しています。不正アクセスの可能性があります。',
      metric: props.api.metricClientError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 50, // 5分間で50件以上の4XXエラーでアラート
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // CloudWatchアラーム3: API 5XXエラー率の監視
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: 'ZeroTrust-API-High5xxRate',
      alarmDescription: 'システムエラーが急増しています。システム異常の可能性があります。',
      metric: props.api.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10, // 5分間で10件以上の5XXエラーでアラート
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // アラーム発生時にSNSに通知
    const snsAction = new cloudwatchActions.SnsAction(alertTopic);
    wafBlockAlarm.addAlarmAction(snsAction);
    api4xxAlarm.addAlarmAction(snsAction);
    api5xxAlarm.addAlarmAction(snsAction);

    // 出力
    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS Alert Topic ARN',
    });

    new cdk.CfnOutput(this, 'CloudTrailBucketName', {
      value: trailBucket.bucketName,
      description: 'CloudTrail S3 Bucket Name',
    });
  }
}
