#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WafStack } from '../lib/waf-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { ApiStack } from '../lib/api-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// 1. WAFスタック
const wafStack = new WafStack(app, 'WafStack', { env });

// 2. Cognitoスタック
new CognitoStack(app, 'CognitoStack', { env });

// 3. APIスタック（Lambda AuthorizerをApiStack内に統合）
const apiStack = new ApiStack(app, 'ApiStack', {
  env,
  webAclArn: wafStack.webAclArn,
});

// 4. 監視スタック
new MonitoringStack(app, 'MonitoringStack', {
  env,
  api: apiStack.api,
  alertEmail: 'your-email@example.com',
});
