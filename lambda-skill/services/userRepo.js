import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
const ddb = new DynamoDBClient({});
const TABLE = process.env.TABLE || 'AdhanUsers';

export async function getUserSettings(userId) {
  if (!userId) return null;
  const res = await ddb.send(new GetItemCommand({
    TableName: TABLE,
    Key: { userId: { S: userId } }
  }));
  const it = res.Item || {};
  return {
    enabled: it.enabled?.BOOL ?? true,
    onboarded: it.onboarded?.BOOL ?? false,
    consentUntil: it.consentUntil?.S || null
  };
}

export async function setUserEnabled(userId, enabled) {
  if (!userId) return;
  await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { userId: { S: userId } },
    UpdateExpression: 'SET #en = :val',
    ExpressionAttributeNames: { '#en': 'enabled' },
    ExpressionAttributeValues: { ':val': { BOOL: !!enabled } }
  }));
}

export async function saveConsent(userId, { enabled=true, consentUntilISO=null, onboarded=true }) {
  if (!userId) return;
  const expr = ['SET #en = :en', '#ob = :ob'];
  const names = { '#en': 'enabled', '#ob': 'onboarded' };
  const values = { ':en': { BOOL: !!enabled }, ':ob': { BOOL: !!onboarded } };
  if (consentUntilISO) {
    expr.push('#cu = :cu');
    names['#cu'] = 'consentUntil';
    values[':cu'] = { S: consentUntilISO };
  }
  await ddb.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { userId: { S: userId } },
    UpdateExpression: expr.join(', '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  }));
}
