import { buildApiServiceError, createApiServiceError } from 'slates';
import type { GenesisStatus } from './types';

export let destatisValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'destatis_validation_error' });

export let destatisApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Destatis GENESIS-Online',
    operation,
    reason: 'destatis_api_error',
    detailKeys: ['Content', 'message', 'error', 'code'],
    nestedKeys: ['Status', 'errors']
  });

let statusText = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export let destatisStatusError = (status: GenesisStatus, operation: string) => {
  let upstreamCode = String(status.Code).trim();
  let detail = statusText(status.Content) ?? 'The provider rejected the request.';
  let remediation =
    upstreamCode === '98'
      ? ' Narrow the request by reducing the year range, time slices, or selected variables. Token-authenticated requests cannot enqueue background jobs.'
      : '';

  return createApiServiceError(
    `Destatis GENESIS-Online API ${operation} failed: ${detail}${remediation}`,
    {
      reason: 'destatis_api_error',
      upstreamCode
    }
  );
};

let redact = (value: string, secret: string) =>
  secret ? value.split(secret).join('[redacted]') : value;

export let destatisSecureApiError = (
  error: unknown,
  secret: string,
  operation = 'request'
) => {
  let mapped = destatisApiError(error, operation);
  let upstreamStatus = mapped.data.upstreamStatus;
  let upstreamCode = mapped.data.upstreamCode;
  return createApiServiceError(redact(mapped.data.message, secret), {
    reason: 'destatis_api_error',
    ...(typeof upstreamStatus === 'number'
      ? { upstreamStatus }
      : typeof upstreamStatus === 'string'
        ? { upstreamStatus: redact(upstreamStatus, secret) }
        : {}),
    ...(typeof upstreamCode === 'string' ? { upstreamCode: redact(upstreamCode, secret) } : {})
  });
};
