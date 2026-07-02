import crypto from 'crypto';

export let verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  let expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expectedSignature;
};
