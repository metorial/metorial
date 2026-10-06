import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus
} from 'slates';
import { invalid, malformed } from './schemas';

export let API_URL = 'https://api.slite.com/v1';
export let tokenValue = (token: string) => {
  if (
    !token ||
    Array.from(token).some(char => {
      const point = char.codePointAt(0) ?? 0;
      return point <= 32 || point === 127 || (point >= 0xd800 && point <= 0xdfff);
    })
  )
    throw invalid('Provide a Slite API key without whitespace or control characters.');
  return token;
};
export let adaptError = (error: unknown, operation: string) => {
  let status = getApiErrorStatus(error);
  return buildApiServiceError(
    { response: { status } },
    {
      operation,
      providerLabel: 'Slite',
      reason: 'slite_api',
      parent: {},
      extractMessage: () =>
        status === 401
          ? 'Replace or reconnect the API key.'
          : status === 402
            ? 'This organization feature is unavailable. Check custom data source setup and contact the provider administrator or support.'
            : status === 403
              ? 'Check API key read/write permissions, access to this resource, and organization feature availability.'
              : status === 404
                ? 'The exact resource is unavailable to this API key.'
                : status === 413
                  ? 'The request or document exceeds the provider size limit.'
                  : status === 422
                    ? 'Check the documented input fields and whether Ask is enabled for this organization.'
                    : status === 429
                      ? 'Wait for the provider rate or Ask limit to reset; do not repeat an uncertain write.'
                      : 'Read the exact resource before retrying a write. The operation or Ask thread may already exist.'
    }
  );
};
export let authenticatedHttp = (token: string) =>
  createAuthenticatedAxios({
    baseURL: API_URL,
    timeout: 30000,
    maxRedirects: 0,
    maxBodyLength: 1024 * 1024,
    maxContentLength: 32 * 1024 * 1024,
    authHeader: { name: 'x-slite-api-key', value: tokenValue(token) },
    headers: { Accept: 'application/json' }
  });
export let assertPrivateReceipt = (token: string) => {
  let redactor = new AuthConfigSecretRedactor({ token });
  let text = (value: string) => {
    for (let pass = 0; pass < 5; pass++) {
      if (redactor.redactEmbedded(value) !== value) throw malformed();
      for (let encoded of value.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g)) {
        let decoded = Buffer.from(encoded[0], 'base64').toString();
        if (redactor.redactEmbedded(decoded) !== decoded) throw malformed();
      }
      let decoded = value.replace(/(?:%[a-f0-9]{2})+/gi, bytes =>
        Buffer.from(bytes.replaceAll('%', ''), 'hex').toString('utf8')
      );
      if (decoded === value) break;
      value = decoded;
    }
  };
  let inspect = (value: unknown, depth = 0): void => {
    if (depth > 80) throw malformed();
    if (typeof value === 'string') text(value);
    else if (Array.isArray(value)) value.forEach(part => inspect(part, depth + 1));
    else if (value && typeof value === 'object')
      for (let [key, part] of Object.entries(value)) {
        text(key);
        inspect(part, depth + 1);
      }
  };
  return inspect;
};
