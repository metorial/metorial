import { DynamoDBClient } from './client';

export let createClient = (
  config: { region: string },
  auth: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): DynamoDBClient => {
  return new DynamoDBClient({
    region: config.region,
    accessKeyId: auth.accessKeyId,
    secretAccessKey: auth.secretAccessKey,
    sessionToken: auth.sessionToken
  });
};
