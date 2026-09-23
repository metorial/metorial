import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError } from 'slates';

type ApiFailure = {
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
    headers?: Headers | Record<string, string>;
  };
};

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const stringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const upstreamException = (data: unknown): Record<string, unknown> | undefined => {
  const root = record(data);
  if (!root) return undefined;
  return record(root.exception) ?? root;
};

function providerErrorEntries(data: unknown): Record<string, unknown>[] {
  const root = record(data);
  const exception = upstreamException(data);
  const problemEntries = Array.isArray(root?.errors) ? root.errors : [];
  const legacyEntries = Array.isArray(exception?.exceptionDetailList)
    ? exception.exceptionDetailList
    : [];
  return [...problemEntries, ...legacyEntries]
    .map(record)
    .filter(entry => entry !== undefined);
}

export function getKsefUpstreamCodes(error: unknown): string[] {
  if (error instanceof ServiceError) {
    const codes = error.data.upstreamCodes;
    if (Array.isArray(codes))
      return codes.filter((code): code is string => typeof code === 'string');
    const single = stringValue(error.data.upstreamCode);
    return single ? [single] : [];
  }
  const response = record(record(error)?.response);
  const entries = providerErrorEntries(response?.data);
  const codes = entries
    .map(entry => stringValue(entry.code ?? entry.exceptionCode))
    .filter((code): code is string => code !== undefined);
  const root = record(response?.data);
  const fallback = stringValue(root?.reasonCode ?? root?.code);
  if (fallback && !codes.includes(fallback)) codes.push(fallback);
  return codes;
}

export function getKsefUpstreamCode(error: unknown): string | undefined {
  return getKsefUpstreamCodes(error)[0];
}

function providerDetails(data: unknown): string | undefined {
  const root = record(data);
  const exception = upstreamException(data);
  const status = record(root?.status);
  const parts: string[] = [];
  const add = (value: unknown) => {
    const text = stringValue(value);
    if (text && !parts.includes(text)) parts.push(text);
  };

  add(exception?.exceptionDescription);
  add(exception?.description);
  add(root?.detail);
  add(root?.title);
  add(status?.description);
  add(root?.reasonCode);
  for (const entry of providerErrorEntries(data)) {
    add(entry.exceptionDescription ?? entry.description);
    const details = entry.details;
    if (Array.isArray(details)) for (const detail of details) add(detail);
  }
  if (Array.isArray(status?.details)) for (const detail of status.details) add(detail);
  return parts.length ? parts.join(' — ') : undefined;
}

export function ksefValidationError(
  message: string
): ReturnType<typeof createApiServiceError> {
  return createApiServiceError(message, { reason: 'ksef_validation_error' });
}

export function ksefTransportError(
  operation: string
): ReturnType<typeof createApiServiceError> {
  return createApiServiceError(
    `KSeF ${operation} did not receive an HTTP response. Inspect the current session before repeating a write.`,
    { reason: 'ksef_transport_error' }
  );
}

export function isKsefTransportError(error: unknown): boolean {
  return error instanceof ServiceError && error.data.reason === 'ksef_transport_error';
}

export function ksefApiError(
  error: unknown,
  operation = 'request'
): ReturnType<typeof buildApiServiceError> {
  if (error instanceof ServiceError) return error;

  const failure = error as ApiFailure;
  const response = failure.response;
  const retryAfter =
    response?.headers instanceof Headers
      ? (response.headers.get('retry-after') ?? undefined)
      : response?.headers?.['retry-after'];
  const mapped = buildApiServiceError(error, {
    providerLabel: 'KSeF',
    reason: 'ksef_api_error',
    operation,
    extractUpstreamCode: () => getKsefUpstreamCode(error),
    extractMessage: () => providerDetails(response?.data)
  });
  mapped.data.upstreamCodes = getKsefUpstreamCodes(error);
  if (retryAfter) mapped.data.retryAfter = retryAfter;
  const details = providerDetails(response?.data);
  if (details) mapped.data.upstreamDetails = details;
  return mapped;
}
