import crypto from 'node:crypto';
import { createApiServiceError, createAxios } from 'slates';
import { smugMugError } from './errors';

let percentEncode = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

let signHeader = (
  method: string,
  url: string,
  consumerSecret: string,
  tokenSecret: string,
  parameters: Record<string, string>
): string => {
  let parsed = new URL(url);
  let oauth = {
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
    ...parameters
  };
  // RFC 5849 3.4.1.3: encode before sorting, and preserve repeated query keys.
  let pairs = [...parsed.searchParams.entries(), ...Object.entries(oauth)]
    .filter(([key]) => key !== 'oauth_signature')
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([keyA, valueA], [keyB, valueB]) =>
      keyA < keyB ? -1 : keyA > keyB ? 1 : valueA < valueB ? -1 : valueA > valueB ? 1 : 0
    );
  let normalized = pairs.map(([key, value]) => `${key}=${value}`).join('&');
  let baseUri = `${parsed.protocol}//${parsed.host}${parsed.pathname || '/'}`;
  let signature = crypto
    .createHmac('sha1', `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`)
    .update(`${method.toUpperCase()}&${percentEncode(baseUri)}&${percentEncode(normalized)}`)
    .digest('base64');
  return `OAuth ${Object.entries({ ...oauth, oauth_signature: signature })
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')}`;
};

export let buildOAuth1Header = (
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  extraParams?: Record<string, string>
): string =>
  signHeader(method, url, credentials.consumerSecret, credentials.tokenSecret, {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.token,
    ...extraParams
  });

export let buildOAuth1HeaderForRequestToken = (
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): string =>
  signHeader(method, url, consumerSecret, '', {
    oauth_consumer_key: consumerKey,
    oauth_callback: callbackUrl
  });

export let buildOAuth1HeaderForAccessToken = (
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): string =>
  signHeader(method, url, consumerSecret, requestTokenSecret, {
    oauth_consumer_key: consumerKey,
    oauth_token: requestToken,
    oauth_verifier: verifier
  });

let exchange = async (
  url: string,
  header: string,
  secrets: string[],
  requestToken: boolean
) => {
  try {
    let response = await createAxios({ maxRedirects: 0 }).post(url, null, {
      headers: { Authorization: header },
      responseType: 'text'
    });
    if (typeof response.data !== 'string') {
      throw createApiServiceError('SmugMug returned an invalid OAuth token response.', {
        reason: 'invalid_oauth_response'
      });
    }
    let params = new URLSearchParams(response.data);
    let oauthToken = params.get('oauth_token');
    let oauthTokenSecret = params.get('oauth_token_secret');
    if (
      !oauthToken ||
      !oauthTokenSecret ||
      (requestToken && params.get('oauth_callback_confirmed') !== 'true')
    ) {
      throw createApiServiceError(
        'SmugMug did not return valid OAuth credentials. Reconnect and authorize again.',
        { reason: 'invalid_oauth_response' }
      );
    }
    return { oauthToken, oauthTokenSecret };
  } catch (error) {
    throw smugMugError(error, 'OAuth token exchange', secrets);
  }
};

export let getRequestToken = async (
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
): Promise<{ oauthToken: string; oauthTokenSecret: string }> => {
  let url = 'https://api.smugmug.com/services/oauth/1.0a/getRequestToken';
  return exchange(
    url,
    buildOAuth1HeaderForRequestToken('POST', url, consumerKey, consumerSecret, callbackUrl),
    [consumerKey, consumerSecret],
    true
  );
};

export let getAccessToken = async (
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<{ oauthToken: string; oauthTokenSecret: string }> => {
  let url = 'https://api.smugmug.com/services/oauth/1.0a/getAccessToken';
  return exchange(
    url,
    buildOAuth1HeaderForAccessToken(
      'POST',
      url,
      consumerKey,
      consumerSecret,
      requestToken,
      requestTokenSecret,
      verifier
    ),
    [consumerKey, consumerSecret, requestToken, requestTokenSecret, verifier],
    false
  );
};
