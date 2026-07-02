// OAuth 1.0a helper functions for Evernote
import { axios } from 'slates';

// Generate a random nonce
export let generateNonce = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Percent-encode as per RFC 3986
export let percentEncode = (str: string): string => {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
};

// Create the OAuth signature base string
let createSignatureBaseString = (
  method: string,
  url: string,
  params: Record<string, string>
): string => {
  // Sort parameters alphabetically by key
  let sortedKeys = Object.keys(params).sort();
  let paramString = sortedKeys
    .map(k => `${percentEncode(k)}=${percentEncode(params[k]!)}`)
    .join('&');
  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
};

// HMAC-SHA1 signing using Web Crypto API
let hmacSha1 = async (key: string, data: string): Promise<string> => {
  let enc = new TextEncoder();
  let keyData = enc.encode(key);
  let msgData = enc.encode(data);

  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  let signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  let bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
};

// Sign an OAuth request
export let signOAuthRequest = async (
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): Promise<string> => {
  let baseString = createSignatureBaseString(method, url, params);
  let signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return hmacSha1(signingKey, baseString);
};

// Parse URL-encoded response body
export let parseOAuthResponse = (body: string): Record<string, string> => {
  let params: Record<string, string> = {};
  let pairs = body.split('&');
  for (let pair of pairs) {
    let idx = pair.indexOf('=');
    if (idx >= 0) {
      params[decodeURIComponent(pair.substring(0, idx))] = decodeURIComponent(
        pair.substring(idx + 1)
      );
    }
  }
  return params;
};

// Get the base URL for Evernote (sandbox vs production)
export let getBaseUrl = (sandbox: boolean): string => {
  return sandbox ? 'https://sandbox.evernote.com' : 'https://www.evernote.com';
};

// Request a temporary OAuth token
export let requestToken = async (
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): Promise<{ oauthToken: string; oauthTokenSecret: string }> => {
  let oauthUrl = `${baseUrl}/oauth`;
  let timestamp = Math.floor(Date.now() / 1000).toString();
  let nonce = generateNonce();

  let params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_callback: callbackUrl,
    oauth_version: '1.0'
  };

  let signature = await signOAuthRequest('GET', oauthUrl, params, consumerSecret);
  params.oauth_signature = signature;

  let queryString = Object.entries(params)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&');

  let response = await axios.get(`${oauthUrl}?${queryString}`, {
    responseType: 'text'
  });

  let parsed = parseOAuthResponse(response.data);
  return {
    oauthToken: parsed.oauth_token || '',
    oauthTokenSecret: parsed.oauth_token_secret || ''
  };
};

// Exchange the verifier for an access token
export let exchangeToken = async (
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string
): Promise<{
  oauthToken: string;
  noteStoreUrl: string;
  webApiUrlPrefix: string;
  userId: string;
  shardId: string;
  expires: string;
}> => {
  let oauthUrl = `${baseUrl}/oauth`;
  let timestamp = Math.floor(Date.now() / 1000).toString();
  let nonce = generateNonce();

  let params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: oauthToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_verifier: oauthVerifier,
    oauth_version: '1.0'
  };

  let signature = await signOAuthRequest(
    'GET',
    oauthUrl,
    params,
    consumerSecret,
    oauthTokenSecret
  );
  params.oauth_signature = signature;

  let queryString = Object.entries(params)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&');

  let response = await axios.get(`${oauthUrl}?${queryString}`, {
    responseType: 'text'
  });

  let parsed = parseOAuthResponse(response.data);
  return {
    oauthToken: parsed.oauth_token || '',
    noteStoreUrl: parsed.edam_noteStoreUrl || '',
    webApiUrlPrefix: parsed.edam_webApiUrlPrefix || '',
    userId: parsed.edam_userId || '',
    shardId: parsed.edam_shard || '',
    expires: parsed.edam_expires || ''
  };
};
