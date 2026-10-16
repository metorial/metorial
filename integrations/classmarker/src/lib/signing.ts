import { createHash } from 'node:crypto';

export let generateAuthParams = (apiKey: string, apiSecret: string) => {
  let timestamp = Math.floor(Date.now() / 1000);
  let signature = createHash('sha256')
    .update(apiKey + apiSecret + timestamp)
    .digest('hex');
  return { api_key: apiKey, signature, timestamp };
};
