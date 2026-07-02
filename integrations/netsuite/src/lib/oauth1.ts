import crypto from 'crypto';

export interface OAuth1Credentials {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

let percentEncode = (str: string): string => {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
};

let generateNonce = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

let generateTimestamp = (): string => {
  return Math.floor(Date.now() / 1000).toString();
};

export let buildOAuth1Header = (
  method: string,
  url: string,
  credentials: OAuth1Credentials
): string => {
  let nonce = generateNonce();
  let timestamp = generateTimestamp();

  let params: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_token: credentials.tokenId,
    oauth_version: '1.0'
  };

  // Parse URL to separate base URL from query params
  let urlObj = new URL(url);
  let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  // Include query params in signature base
  let allParams: Record<string, string> = { ...params };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  // Sort parameters alphabetically
  let sortedKeys = Object.keys(allParams).sort();
  let paramString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(allParams[key]!)}`)
    .join('&');

  // Build signature base string
  let signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  // Build signing key
  let signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret)}`;

  // Compute HMAC-SHA256 signature
  let signature = crypto
    .createHmac('sha256', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  // Build the Authorization header
  let realm = credentials.accountId;
  let headerParts = [
    `realm="${percentEncode(realm)}"`,
    `oauth_consumer_key="${percentEncode(params.oauth_consumer_key!)}"`,
    `oauth_token="${percentEncode(params.oauth_token!)}"`,
    `oauth_nonce="${percentEncode(nonce)}"`,
    `oauth_timestamp="${percentEncode(timestamp)}"`,
    `oauth_signature_method="${percentEncode('HMAC-SHA256')}"`,
    `oauth_version="${percentEncode('1.0')}"`,
    `oauth_signature="${percentEncode(signature)}"`
  ];

  return `OAuth ${headerParts.join(', ')}`;
};
