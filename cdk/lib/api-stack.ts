import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  webAclArn: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Lambda Authorizer関数をApiStack内で作成
    const authorizerFunction = new nodejs.NodejsFunction(this, 'Authorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../lambda/authorizer/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      bundling: {
        forceDockerBundling: false,
      },
    });

    // REST APIの作成
    this.api = new apigateway.RestApi(this, 'ZeroTrustApi', {
      restApiName: 'ZeroTrustFinancialApi',
      description: 'ゼロトラストAPIセキュリティ基盤',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        dataTraceEnabled: true,
      },
    });

    // Lambda Authorizer
    const lambdaAuthorizer = new apigateway.RequestAuthorizer(
      this,
      'LambdaAuthorizer',
      {
        handler: authorizerFunction,
        identitySources: [
          apigateway.IdentitySource.header('Authorization'),
          apigateway.IdentitySource.context('identity.sourceIp'),
        ],
        resultsCacheTtl: cdk.Duration.minutes(5),
      }
    );

    const authMethodOptions: apigateway.MethodOptions = {
      authorizer: lambdaAuthorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    };

    // /health エンドポイント（認証不要）
    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{ statusCode: '200' }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // /transactions エンドポイント
    const transactions = this.api.root.addResource('transactions');
    transactions.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{ statusCode: '200' }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
    }), {
      ...authMethodOptions,
      methodResponses: [{ statusCode: '200' }],
    });
    transactions.addMethod('POST', new apigateway.MockIntegration({
      integrationResponses: [{ statusCode: '200' }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
    }), {
      ...authMethodOptions,
      methodResponses: [{ statusCode: '200' }],
    });

    // /accounts エンドポイント
    const accounts = this.api.root.addResource('accounts');
    accounts.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{ statusCode: '200' }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: { 'application/json': '{"statusCode": 200}' },
    }), {
      ...authMethodOptions,
      methodResponses: [{ statusCode: '200' }],
    });

    // APIのURLを出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });
  }
}
