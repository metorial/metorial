import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus
} from 'slates';
import { invalid, malformed } from './response';

export let US_API = 'https://api.surveymonkey.com';
let origins = new Set([
  US_API,
  'https://api.eu.surveymonkey.com',
  'https://api.surveymonkey.ca'
]);
export let apiOrigin = (value?: string) => {
  let supplied = value ?? US_API;
  let url: URL;
  try {
    url = new URL(supplied);
  } catch {
    throw invalid('Choose the documented US, EU, or Canada SurveyMonkey API URL.');
  }
  if (
    !origins.has(url.origin) ||
    url.username ||
    url.password ||
    !['', '/'].includes(url.pathname) ||
    url.search ||
    url.hash
  )
    throw invalid('Choose the documented US, EU, or Canada SurveyMonkey API URL.');
  return url.origin;
};
export let validateToken = (token: string) => {
  if (
    !token ||
    Array.from(token).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  )
    throw invalid(
      'Provide a valid SurveyMonkey access token without spaces or control characters.'
    );
  return token;
};
export let responsePrivacy = (token: string) => {
  let redactor = new AuthConfigSecretRedactor({ token });
  let checkText = (value: string) => {
    for (let round = 0; round < 5; round++) {
      if (redactor.redactEmbedded(value) !== value) throw malformed();
      for (let part of value.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
        let decoded = Buffer.from(part[0], 'base64').toString();
        if (redactor.redactEmbedded(decoded) !== decoded) throw malformed();
      }
      let decoded = value.replace(/%([a-f0-9]{2})/gi, (_, byte: string) =>
        String.fromCharCode(Number.parseInt(byte, 16))
      );
      if (decoded === value) return;
      value = decoded;
    }
  };
  let inspect = (value: unknown, depth = 0): void => {
    if (depth > 80) throw malformed();
    if (typeof value === 'string') checkText(value);
    else if (Array.isArray(value)) value.forEach(item => inspect(item, depth + 1));
    else if (value !== null && typeof value === 'object')
      for (let [key, item] of Object.entries(value)) {
        checkText(key);
        inspect(item, depth + 1);
      }
  };
  return inspect;
};
export let adaptError = (error: unknown, operation: string) => {
  let status = getApiErrorStatus(error);
  let advice =
    status === 401
      ? 'Reconnect or replace the token in the correct region.'
      : status === 403
        ? 'Check ownership, app scopes, approved grants, and plan permissions.'
        : status === 402
          ? 'The account plan limits this operation or its response-detail allowance.'
          : status === 404
            ? 'The exact resource was not found or is unavailable to this account.'
            : status === 429
              ? 'Wait for the provider rate limit to reset.'
              : 'For a write, its outcome may be uncertain. Inspect existing resources before retrying; never resend an invitation implicitly.';
  // The SDK wraps transport errors. Keep only status, never the original error graph.
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'SurveyMonkey',
      reason: 'surveymonkey_api',
      operation,
      extractMessage: () => advice,
      parent: {}
    }
  );
};
export let authenticatedHttp = (token: string, accessUrl?: string) =>
  createAuthenticatedAxios({
    baseURL: apiOrigin(accessUrl),
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 32 * 1024 * 1024,
    maxBodyLength: 32 * 1024 * 1024,
    authHeader: { value: `Bearer ${validateToken(token)}` },
    headers: { Accept: 'application/json' },
    responseType: 'text',
    transformResponse: [value => value]
  });
