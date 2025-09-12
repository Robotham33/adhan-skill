import AWS from 'aws-sdk';
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.STATS_TABLE || 'AdhanStats';

export async function bumpCityStat({ cityKey, countryCode }){
  const pk = `CITY#${(cityKey||'unknown').toLowerCase()}#${countryCode||'XX'}`;
  const params = {
    TableName: TABLE,
    Key: { pk },
    UpdateExpression: 'ADD #c :one',
    ExpressionAttributeNames: { '#c':'count' },
    ExpressionAttributeValues: { ':one': 1 }
  };
  try { await ddb.update(params).promise(); }
  catch(e){ console.log('bumpCityStat error', e); }
}
