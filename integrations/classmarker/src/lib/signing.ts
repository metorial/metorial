import { createHash, createHmac } from 'crypto';

export let generateAuthParams = (
  apiKey: string,
  apiSecret: string
): {
  api_key: string;
  signature: string;
  timestamp: number;
} => {
  let timestamp = Math.floor(Date.now() / 1000);
  let signatureInput = apiKey + apiSecret + timestamp;
  let signature = createHash('sha256').update(signatureInput).digest('hex').toLowerCase();

  return {
    api_key: apiKey,
    signature,
    timestamp
  };
};

export let verifyWebhookSignature = (
  payload: string,
  secret: string,
  receivedSignature: string
): boolean => {
  let computed = createHmac('sha256', secret).update(payload).digest('base64');
  return computed === receivedSignature;
};
