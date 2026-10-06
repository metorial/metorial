import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getCurrentContext,
  requestAxios
} from 'slates';
import { invalid, malformed } from './schemas';
export type Region = 'us' | 'eu';
export type ApiMode = 'management' | 'delivery' | 'preview';
export let origin = (mode: ApiMode, region: Region) =>
  `https://${mode === 'management' ? 'api' : mode === 'delivery' ? 'cdn' : 'preview'}${region === 'eu' ? '.eu' : ''}.contentful.com`;
export let tokenValue = (token: string) => {
  if (!token || Array.from(token).some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127))
    throw invalid(
      'Provide a Contentful access token without whitespace or control characters.'
    );
  return token;
};
export let adaptError = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Contentful',
      reason: 'contentful_api',
      operation,
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Reconnect with the correct API credential and data residency region.'
          : status === 403
            ? 'Check token API type, OAuth scope, space and environment access, role, and feature permissions.'
            : status === 404
              ? 'The exact resource is unavailable to this token in this space and environment.'
              : status === 409
                ? 'Fetch the current resource version and reconcile your changes before retrying.'
                : status === 429
                  ? 'Wait for the rate limit to reset. Do not repeat an uncertain write.'
                  : 'Check the documented payload and resource state. A write may already have succeeded; inspect it before retrying.'
    }
  );
};
export let privacyGuard = (token: string) => {
  let redactor = new AuthConfigSecretRedactor({ token });
  let checkText = (text: string) => {
    for (let pass = 0; pass < 5; pass++) {
      if (redactor.redactEmbedded(text) !== text) return false;
      for (let part of text.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
        if (
          redactor.redactEmbedded(Buffer.from(part[0], 'base64').toString()) !==
          Buffer.from(part[0], 'base64').toString()
        )
          return false;
      let decoded = text.replace(/%([a-f0-9]{2})/gi, (_, byte: string) =>
        String.fromCharCode(Number.parseInt(byte, 16))
      );
      if (decoded === text) break;
      text = decoded;
    }
    return true;
  };
  let inspect = (value: unknown, depth = 0): boolean => {
    if (depth > 80) return false;
    if (typeof value === 'string') return checkText(value);
    if (Array.isArray(value)) return value.every(v => inspect(v, depth + 1));
    if (value && typeof value === 'object')
      return Object.entries(value).every(([k, v]) => checkText(k) && inspect(v, depth + 1));
    return true;
  };
  return (value: unknown) => {
    if (!inspect(getCurrentContext().getHttpTraces()) || !inspect(value)) throw malformed();
  };
};
export let httpClient = (token: string, mode: ApiMode, region: Region) =>
  createAuthenticatedAxios({
    baseURL: origin(mode, region),
    authHeader: { value: `Bearer ${tokenValue(token)}` },
    contentType:
      mode === 'management' ? 'application/vnd.contentful.management.v1+json' : false,
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 32 * 1024 * 1024,
    maxBodyLength: 32 * 1024 * 1024
  });
export let request = async (
  http: ReturnType<typeof httpClient>,
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  params?: Record<string, unknown>,
  headers?: Record<string, string>
) => {
  let privacy = privacyGuard(token);
  privacy({ path, body, params });
  let response = await requestAxios(
    `${method} request`,
    () => http.request<unknown>({ method, url: path, data: body, params, headers }),
    error => {
      privacy(undefined);
      return adaptError(error, `${method} request`);
    }
  );
  privacy(response.data);
  return response;
};
