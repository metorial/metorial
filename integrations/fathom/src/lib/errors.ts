import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, getApiErrorResponseWithBody, isApiErrorRecord } from 'slates';

export let fathomApiError = (error: unknown, secrets: string[], operation = 'request') => {
  if (error instanceof ServiceError) return error;
  let values = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      encodeURIComponent(secret),
      new URLSearchParams({ value: secret }).toString().slice(6)
    ])
    .sort((a, b) => b.length - a.length);
  let redactText = (text: string) => {
    for (let secret of values) text = text.split(secret).join('[REDACTED]');
    return text;
  };
  let redact = (value: unknown, depth = 0): unknown => {
    if (typeof value === 'string') return redactText(value);
    if (depth > 12) return '[TRUNCATED]';
    if (Array.isArray(value)) return value.map(item => redact(item, depth + 1));
    if (isApiErrorRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          redactText(key),
          /^(authorization|x-api-key|api[_-]?key|access_token|refresh_token|client_secret)$/i.test(
            key
          )
            ? '[REDACTED]'
            : redact(item, depth + 1)
        ])
      );
    }
    return value;
  };
  // Recover provider details after the shared HTTP interceptor without retaining
  // request credentials or provider-echoed secrets in the message or parent.
  let response = getApiErrorResponseWithBody(error);
  let safeError = {
    message: redactText(error instanceof Error ? error.message : 'Request failed.'),
    response: response
      ? {
          status:
            typeof response.status === 'string'
              ? redactText(response.status)
              : response.status,
          statusText:
            response.statusText === undefined ? undefined : redactText(response.statusText),
          data: redact(response.data)
        }
      : undefined
  };
  return buildApiServiceError(safeError, {
    providerLabel: 'Fathom',
    reason: 'fathom_api_error',
    operation,
    extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
    nestedKeys: ['errors', 'error'],
    extractUpstreamCode: (_failure, upstream, helpers) => {
      let data = upstream?.data;
      if (!helpers.isRecord(data)) return undefined;
      let code = data.code;
      if (code === undefined && helpers.isRecord(data.error)) code = data.error.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
};
