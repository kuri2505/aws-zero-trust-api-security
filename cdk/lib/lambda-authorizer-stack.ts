import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class LambdaAuthorizerStack extends cdk.Stack {
  public readonly authorizer: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Authorizer関数の作成
    this.authorizer = new nodejs.NodejsFunction(this, 'Authorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../lambda/authorizer/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      bundling: {
        forceDockerBundling: false,
      },
      environment: {
        NODE_ENV: 'production',
      },
    });

    // Lambda関数のARNを出力
    new cdk.CfnOutput(this, 'AuthorizerArn', {
      value: this.authorizer.functionArn,
      description: 'Lambda Authorizer ARN',
    });
  }
}
