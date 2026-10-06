import { createHmac, randomBytes } from 'node:crypto';
import { account, credential, requireValue } from './contracts';
export interface OAuth1Credentials {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}
export const percentEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
export function buildOAuth1Header(
  method: string,
  value: string,
  credentials: OAuth1Credentials
) {
  for (const key of [
    credentials.consumerKey,
    credentials.consumerSecret,
    credentials.tokenId,
    credentials.tokenSecret
  ])
    credential(key);
  const bound = account(credentials.accountId);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    requireValue(false, 'A valid original NetSuite request URL is required for signing.');
  }
  requireValue(
    url.origin === `https://${bound.host}.suitetalk.api.netsuite.com` &&
      url.pathname.startsWith('/services/rest/') &&
      !url.username &&
      !url.password &&
      !url.hash,
    'TBA signing is restricted to the original account REST origin.'
  );
  const params = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.tokenId,
    oauth_version: '1.0'
  };
  const pairs = [...Object.entries(params), ...url.searchParams.entries()]
    .map(([k, v]) => [percentEncode(k), percentEncode(v)] as const)
    .sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
    );
  const normalized = pairs.map(([k, v]) => `${k}=${v}`).join('&'),
    base = `${method.toUpperCase()}&${percentEncode(`${url.origin}${url.pathname}`)}&${percentEncode(normalized)}`;
  const signature = createHmac(
    'sha256',
    `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret)}`
  )
    .update(base)
    .digest('base64');
  return `OAuth ${[['realm', bound.realm], ...Object.entries(params), ['oauth_signature', signature]].map(([k, v]) => `${k}="${percentEncode(String(v))}"`).join(', ')}`;
}
