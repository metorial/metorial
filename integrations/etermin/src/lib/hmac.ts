import crypto from 'crypto';

export let generateAuthHeaders = (
  publicKey: string,
  privateKey: string
): Record<string, string> => {
  let salt = crypto.randomUUID();
  let hmac = crypto.createHmac('sha256', privateKey);
  hmac.update(salt);
  let signature = hmac.digest('base64');

  return {
    publickey: publicKey,
    salt: salt,
    signature: signature
  };
};
