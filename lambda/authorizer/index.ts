import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

// IPホワイトリスト（許可するIPアドレス）
const IP_WHITELIST: string[] = [
  '0.0.0.0/0', // 開発環境用：全IP許可（本番では特定IPに絞る）
];

// 取引時間（平日9時〜18時）
const BUSINESS_HOURS = {
  start: 9,
  end: 18,
};

// ポリシードキュメントを生成する関数
const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
};

// IPアドレスがホワイトリストに含まれるか確認
const isIpAllowed = (ip: string): boolean => {
  // 開発環境では全IP許可
  if (IP_WHITELIST.includes('0.0.0.0/0')) return true;
  return IP_WHITELIST.includes(ip);
};

// 取引時間内かどうか確認（平日9時〜18時）
const isBusinessHours = (): boolean => {
  const now = new Date();
  // 日本時間に変換（UTC+9）
  const jstHour = (now.getUTCHours() + 9) % 24;
  const dayOfWeek = now.getUTCDay();

  // 土日は取引時間外
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // 平日9時〜18時のみ許可
  return jstHour >= BUSINESS_HOURS.start && jstHour < BUSINESS_HOURS.end;
};

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Authorizer event:', JSON.stringify(event));

  const sourceIp = event.requestContext?.identity?.sourceIp || '';
  const methodArn = event.methodArn;

  // チェック1: IPホワイトリスト確認
  if (!isIpAllowed(sourceIp)) {
    console.log(`Blocked IP: ${sourceIp}`);
    return generatePolicy('user', 'Deny', methodArn, {
      reason: 'IP_NOT_ALLOWED',
    });
  }

  // チェック2: 取引時間外チェック
  if (!isBusinessHours()) {
    console.log('Blocked: Outside business hours');
    return generatePolicy('user', 'Deny', methodArn, {
      reason: 'OUTSIDE_BUSINESS_HOURS',
    });
  }

  // 全チェック通過 → アクセス許可
  console.log(`Allowed IP: ${sourceIp}`);
  return generatePolicy('user', 'Allow', methodArn, {
    sourceIp,
    timestamp: new Date().toISOString(),
  });
};
