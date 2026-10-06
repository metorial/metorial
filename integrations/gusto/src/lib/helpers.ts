import { ServiceError } from '@lowerdeck/error';
import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

export const requirePrivateResponse = (
  value: unknown,
  auth: { token: string; refreshToken?: string }
) => {
  const redactor = new AuthConfigSecretRedactor({
    token: auth.token,
    refreshToken: auth.refreshToken
  });
  if (JSON.stringify(redactor.redactEmbedded(value)) !== JSON.stringify(value))
    throw createApiServiceError(
      'Gusto reflected a credential in resource data. Review the connection before retrying; a requested write may have completed.',
      { reason: 'unsafe_response', parent: {} }
    );
};

export const API_VERSION = '2026-06-15';
export const BASE_URLS = {
  production: 'https://api.gusto.com',
  demo: 'https://api.gusto-demo.com'
} as const;

export const getBaseUrl = (environment?: string): string => {
  if (environment === undefined || environment === 'production') return BASE_URLS.production;
  if (environment === 'demo') return BASE_URLS.demo;
  throw createApiServiceError('Reconnect using the Gusto production or demo environment.', {
    reason: 'invalid_environment'
  });
};

export const gustoError = (
  error: unknown,
  operation: string
): ReturnType<typeof buildApiServiceError> => {
  if (error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  if (isApiErrorRecord(error) && isApiErrorRecord(error.data)) {
    let baggage = isApiErrorRecord(error.data.baggage) ? error.data.baggage : undefined;
    let data =
      baggage && isApiErrorRecord(baggage.serviceErrorData)
        ? baggage.serviceErrorData
        : undefined;
    if (
      typeof data?.upstreamStatus === 'number' &&
      Number.isInteger(data.upstreamStatus) &&
      data.upstreamStatus >= 100 &&
      data.upstreamStatus <= 599
    )
      status = data.upstreamStatus;
  }
  const remediation =
    status === 401
      ? 'Reconnect the Gusto account.'
      : status === 403
        ? 'Ask Gusto to approve the required app scopes and reconnect with a company administrator.'
        : status === 406
          ? 'Ask Gusto to enable API version 2026-06-15 for this application.'
          : status === 409
            ? 'Read the latest resource version and review the change before trying again.'
            : status === 429
              ? 'Wait for the rate limit to reset before trying again.'
              : 'Review the target and fields in Gusto before trying again; a write may have completed.';
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Gusto',
      reason: 'gusto_api_error',
      operation,
      parent: {},
      extractMessage: () => remediation
    }
  );
};

export const requireFields = (input: Record<string, unknown>, fields: readonly string[]) => {
  for (let field of fields) {
    let value = input[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && !value.trim())
    ) {
      throw createApiServiceError(`${field} is required for this action.`, {
        reason: 'missing_field'
      });
    }
  }
};

export const exactId = (value: unknown): string => {
  if (typeof value === 'string' && value.trim() && value === value.trim()) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    return String(value);
  throw createApiServiceError('Gusto did not return an exact resource identifier.', {
    reason: 'invalid_response'
  });
};

export const decimalAmount = (value: unknown, field: string, scale = 2): string => {
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    const text = String(value);
    const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`);
    if (pattern.test(text)) {
      const [whole = '', fraction = ''] = text.split('.');
      const units =
        BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
      if (units <= BigInt(Number.MAX_SAFE_INTEGER) && Number(text) === value) return text;
    }
  }
  throw createApiServiceError(
    `${field} must be a nonnegative decimal string or a safe number with at most ${scale} decimal places. Use a decimal string for exact or large values.`,
    { reason: 'invalid_decimal' }
  );
};

export const legacyAmount = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const text = decimalAmount(value, 'Gusto amount');
  const number = Number(text);
  if (
    decimalAmount(number, 'Gusto amount') !==
    text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  ) {
    throw createApiServiceError(
      'This amount cannot be represented exactly in the legacy numeric output.',
      { reason: 'unsafe_amount' }
    );
  }
  return number;
};

export const validateDate = (value: unknown, field: string) => {
  if (value === undefined) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createApiServiceError(`${field} must be a calendar date in YYYY-MM-DD format.`, {
      reason: 'invalid_date'
    });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createApiServiceError(`${field} must be a valid calendar date.`, {
      reason: 'invalid_date'
    });
  }
};

export const validateInput = (input: Record<string, unknown>) => {
  for (const [field, value] of Object.entries(input)) {
    if (field.endsWith('Id') && value !== undefined) {
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value !== value.trim() ||
        value.length > 200 ||
        Array.from(value).some(character => character.charCodeAt(0) < 32)
      ) {
        throw createApiServiceError(`${field} must be the exact Gusto resource identifier.`, {
          reason: 'invalid_identifier'
        });
      }
    }
    if (field.endsWith('Date') || field === 'date' || field === 'dateOfBirth')
      validateDate(value, field);
    if (
      (field === 'page' || field === 'per') &&
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 1 ||
        (field === 'per' && value > 100))
    ) {
      throw createApiServiceError(
        `${field} must be a positive integer${field === 'per' ? ' of at most 100' : ''}.`,
        { reason: 'invalid_pagination' }
      );
    }
  }
  if (
    typeof input.startDate === 'string' &&
    typeof input.endDate === 'string' &&
    input.startDate > input.endDate
  ) {
    throw createApiServiceError('startDate must be on or before endDate.', {
      reason: 'invalid_date_range'
    });
  }
};
