import { LambdaClient } from './client';

export let createClient = (
  config: { region: string },
  auth: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }
): LambdaClient => {
  return new LambdaClient({
    region: config.region,
    credentials: {
      accessKeyId: auth.accessKeyId,
      secretAccessKey: auth.secretAccessKey,
      sessionToken: auth.sessionToken
    }
  });
};
