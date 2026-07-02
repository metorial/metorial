import crypto from 'crypto';
import { createAxios } from 'slates';

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

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

export let buildOAuth1Header = (
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  extraParams?: Record<string, string>
): string => {
  let nonce = generateNonce();
  let timestamp = generateTimestamp();

  let params: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: credentials.token,
    oauth_version: '1.0',
    ...extraParams
  };

  let urlObj = new URL(url);
  let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  let allParams: Record<string, string> = { ...params };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  let sortedKeys = Object.keys(allParams).sort();
  let paramString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(allParams[key]!)}`)
    .join('&');

  let signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  let signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret)}`;

  let signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  let headerParts = [
    `oauth_consumer_key="${percentEncode(params.oauth_consumer_key!)}"`,
    `oauth_nonce="${percentEncode(nonce)}"`,
    `oauth_signature="${percentEncode(signature)}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${percentEncode(timestamp)}"`,
    `oauth_token="${percentEncode(params.oauth_token!)}"`,
    `oauth_version="1.0"`
  ];

  return `OAuth ${headerParts.join(', ')}`;
};

export let buildOAuth1HeaderForRequestToken = (
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): string => {
  let nonce = generateNonce();
  let timestamp = generateTimestamp();

  let params: Record<string, string> = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  };

  let urlObj = new URL(url);
  let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  let allParams: Record<string, string> = { ...params };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  let sortedKeys = Object.keys(allParams).sort();
  let paramString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(allParams[key]!)}`)
    .join('&');

  let signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  let signingKey = `${percentEncode(consumerSecret)}&`;

  let signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  let headerParts = [
    `oauth_callback="${percentEncode(callbackUrl)}"`,
    `oauth_consumer_key="${percentEncode(consumerKey)}"`,
    `oauth_nonce="${percentEncode(nonce)}"`,
    `oauth_signature="${percentEncode(signature)}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${percentEncode(timestamp)}"`,
    `oauth_version="1.0"`
  ];

  return `OAuth ${headerParts.join(', ')}`;
};

export let buildOAuth1HeaderForAccessToken = (
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): string => {
  let nonce = generateNonce();
  let timestamp = generateTimestamp();

  let params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: requestToken,
    oauth_verifier: verifier,
    oauth_version: '1.0'
  };

  let urlObj = new URL(url);
  let baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  let allParams: Record<string, string> = { ...params };
  urlObj.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  let sortedKeys = Object.keys(allParams).sort();
  let paramString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(allParams[key]!)}`)
    .join('&');

  let signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  let signingKey = `${percentEncode(consumerSecret)}&${percentEncode(requestTokenSecret)}`;

  let signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  let headerParts = [
    `oauth_consumer_key="${percentEncode(consumerKey)}"`,
    `oauth_nonce="${percentEncode(nonce)}"`,
    `oauth_signature="${percentEncode(signature)}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${percentEncode(timestamp)}"`,
    `oauth_token="${percentEncode(requestToken)}"`,
    `oauth_verifier="${percentEncode(verifier)}"`,
    `oauth_version="1.0"`
  ];

  return `OAuth ${headerParts.join(', ')}`;
};

export let getRequestToken = async (
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): Promise<{ oauthToken: string; oauthTokenSecret: string }> => {
  let url = 'https://secure.smugmug.com/services/oauth/1.0a/getRequestToken';
  let authHeader = buildOAuth1HeaderForRequestToken(
    'POST',
    url,
    consumerKey,
    consumerSecret,
    callbackUrl
  );

  let httpClient = createAxios();
  let response = await httpClient.post(url, null, {
    headers: {
      Authorization: authHeader
    }
  });

  let params = new URLSearchParams(response.data);
  let oauthToken = params.get('oauth_token');
  let oauthTokenSecret = params.get('oauth_token_secret');

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error('Failed to obtain request token from SmugMug');
  }

  return { oauthToken, oauthTokenSecret };
};

export let getAccessToken = async (
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<{ oauthToken: string; oauthTokenSecret: string }> => {
  let url = 'https://secure.smugmug.com/services/oauth/1.0a/getAccessToken';
  let authHeader = buildOAuth1HeaderForAccessToken(
    'POST',
    url,
    consumerKey,
    consumerSecret,
    requestToken,
    requestTokenSecret,
    verifier
  );

  let httpClient = createAxios();
  let response = await httpClient.post(url, null, {
    headers: {
      Authorization: authHeader
    }
  });

  let params = new URLSearchParams(response.data);
  let oauthToken = params.get('oauth_token');
  let oauthTokenSecret = params.get('oauth_token_secret');

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error('Failed to obtain access token from SmugMug');
  }

  return { oauthToken, oauthTokenSecret };
};
