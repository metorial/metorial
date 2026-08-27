import { createHmac, randomBytes } from 'node:crypto';
import { createAxios } from 'slates';
import { trelloApiError, trelloServiceError } from './errors';

const REQUEST_TOKEN_URL = 'https://trello.com/1/OAuthGetRequestToken';
const ACCESS_TOKEN_URL = 'https://trello.com/1/OAuthGetAccessToken';

export type OAuthParameter = readonly [name: string, value: string];

export type OAuth1HeaderOptions = {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  callbackUrl?: string;
  verifier?: string;
  nonce?: string;
  timestamp?: string;
  bodyParameters?: readonly OAuthParameter[];
};

export let percentEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

let compareEncodedValues = (left: string, right: string) => {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

export let normalizeOAuthParameters = (parameters: readonly OAuthParameter[]) =>
  parameters
    .map(([name, value]) => [percentEncode(name), percentEncode(value)] as const)
    .sort(([leftName, leftValue], [rightName, rightValue]) => {
      let nameComparison = compareEncodedValues(leftName, rightName);
      return nameComparison || compareEncodedValues(leftValue, rightValue);
    })
    .map(([name, value]) => `${name}=${value}`)
    .join('&');

let createNonce = () => randomBytes(16).toString('hex');

let createTimestamp = () => Math.floor(Date.now() / 1000).toString();

let getSignatureBaseUrl = (url: URL) => `${url.protocol}//${url.host}${url.pathname}`;

export let buildOAuth1Header = (
  method: string,
  rawUrl: string,
  options: OAuth1HeaderOptions
) => {
  let url = new URL(rawUrl);
  let oauthParameters: OAuthParameter[] = [
    ['oauth_consumer_key', options.consumerKey],
    ['oauth_nonce', options.nonce ?? createNonce()],
    ['oauth_signature_method', 'HMAC-SHA1'],
    ['oauth_timestamp', options.timestamp ?? createTimestamp()],
    ['oauth_version', '1.0']
  ];

  if (options.callbackUrl !== undefined) {
    oauthParameters.push(['oauth_callback', options.callbackUrl]);
  }
  if (options.token !== undefined) {
    oauthParameters.push(['oauth_token', options.token]);
  }
  if (options.verifier !== undefined) {
    oauthParameters.push(['oauth_verifier', options.verifier]);
  }

  let signatureParameters: OAuthParameter[] = [
    ...oauthParameters,
    ...url.searchParams.entries(),
    ...(options.bodyParameters ?? [])
  ].filter(([name]) => name !== 'oauth_signature');
  let normalizedParameters = normalizeOAuthParameters(signatureParameters);
  let signatureBaseString = [
    method.toUpperCase(),
    percentEncode(getSignatureBaseUrl(url)),
    percentEncode(normalizedParameters)
  ].join('&');
  let signingKey = `${percentEncode(options.consumerSecret)}&${percentEncode(options.tokenSecret ?? '')}`;
  let signature = createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  let headerParameters = normalizeOAuthParameters([
    ...oauthParameters,
    ['oauth_signature', signature]
  ]);

  return `OAuth ${headerParameters
    .split('&')
    .map(parameter => {
      let separator = parameter.indexOf('=');
      return `${parameter.slice(0, separator)}="${parameter.slice(separator + 1)}"`;
    })
    .join(', ')}`;
};

let getSingleResponseValue = (
  parameters: URLSearchParams,
  key: string,
  responseName: string
) => {
  let values = parameters.getAll(key);
  if (values.length !== 1 || values[0]?.trim().length === 0) {
    throw trelloServiceError(
      `Trello OAuth ${responseName} response did not include a valid ${key}.`
    );
  }

  return values[0]!;
};

let parseTokenResponse = (
  data: unknown,
  responseName: 'request token' | 'access token',
  requireCallbackConfirmation: boolean
) => {
  if (typeof data !== 'string') {
    throw trelloServiceError(
      `Trello OAuth ${responseName} response was not URL-encoded text.`
    );
  }

  let parameters = new URLSearchParams(data);
  let oauthToken = getSingleResponseValue(parameters, 'oauth_token', responseName);
  let oauthTokenSecret = getSingleResponseValue(
    parameters,
    'oauth_token_secret',
    responseName
  );

  if (requireCallbackConfirmation) {
    let confirmations = parameters.getAll('oauth_callback_confirmed');
    if (confirmations.length !== 1 || confirmations[0] !== 'true') {
      throw trelloServiceError(
        'Trello OAuth request token response did not confirm the callback URL.'
      );
    }
  }

  return { oauthToken, oauthTokenSecret };
};

export let getTrelloRequestToken = async (
  consumerKey: string,
  consumerSecret: string,
  callbackUrl: string
) => {
  let authorization = buildOAuth1Header('POST', REQUEST_TOKEN_URL, {
    consumerKey,
    consumerSecret,
    callbackUrl
  });

  let response: { data: unknown };
  try {
    response = await createAxios().post(REQUEST_TOKEN_URL, null, {
      headers: { Authorization: authorization }
    });
  } catch (error) {
    throw trelloApiError(error, 'request OAuth request token');
  }

  return parseTokenResponse(response.data, 'request token', true);
};

export let getTrelloAccessToken = async (
  consumerKey: string,
  consumerSecret: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
) => {
  let authorization = buildOAuth1Header('POST', ACCESS_TOKEN_URL, {
    consumerKey,
    consumerSecret,
    token: requestToken,
    tokenSecret: requestTokenSecret,
    verifier
  });

  let response: { data: unknown };
  try {
    response = await createAxios().post(ACCESS_TOKEN_URL, null, {
      headers: { Authorization: authorization }
    });
  } catch (error) {
    throw trelloApiError(error, 'exchange OAuth access token');
  }

  return parseTokenResponse(response.data, 'access token', false);
};
