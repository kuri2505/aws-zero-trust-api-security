import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

export class WafStack extends cdk.Stack {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IPブラックリスト（不審なIPを登録するセット）
    const ipBlackList = new wafv2.CfnIPSet(this, 'IpBlackList', {
      name: 'FinancialApiIpBlackList',
      scope: 'REGIONAL',
      ipAddressVersion: 'IPV4',
      addresses: [], // 運用時に不審なIPを追加する
    });

    // WAF WebACLの作成
    const webAcl = new wafv2.CfnWebACL(this, 'FinancialApiWebAcl', {
      name: 'FinancialApiWebAcl',
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'FinancialApiWebAcl',
        sampledRequestsEnabled: true,
      },
      rules: [
        // ルール1: AWSマネージドルール（共通の攻撃を防ぐ）
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        // ルール2: SQLインジェクション防御
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLiRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        // ルール3: レートベースルール（5分間に1,000リクエスト超でブロック）
        {
          name: 'RateLimitRule',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 1000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
        },
        // ルール4: IPブラックリスト
        {
          name: 'IpBlackListRule',
          priority: 4,
          action: { block: {} },
          statement: {
            ipSetReferenceStatement: {
              arn: ipBlackList.attrArn,
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'IpBlackListRule',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    this.webAclArn = webAcl.attrArn;

    // WAFのARNを出力
    new cdk.CfnOutput(this, 'WebAclArn', {
      value: webAcl.attrArn,
      description: 'WAF WebACL ARN',
    });
  }
}
