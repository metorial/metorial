import { buildApiServiceError, createApiServiceError, getApiErrorStatus } from 'slates';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'buffer_validation' });
export const safeError = (error: unknown) => {
  const candidate = getApiErrorStatus(error);
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Buffer',
      reason: 'buffer_api_error',
      parent: {},
      extractMessage: () =>
        'Check the connection, permissions, request values, and API limits. The operation may have taken effect; read it back before retrying.',
      formatMessage: ({ message }) =>
        `Buffer request failed${status === undefined ? '' : ` (HTTP ${status})`}. ${message}`
    }
  );
};
export const identifier = (value: string, label = 'ID') => {
  if (
    !value.trim() ||
    [...value].some(
      character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  )
    throw invalid(`Provide a nonempty ${label} without control characters.`);
  try {
    encodeURIComponent(value);
  } catch {
    throw invalid(`Provide a valid Unicode ${label}.`);
  }
  return value;
};
export const credential = (value: string) => {
  identifier(value, 'credential');
  if (
    [...value].some(character => character.charCodeAt(0) < 33 || character.charCodeAt(0) > 126)
  )
    throw invalid(
      'Provide the Buffer credential using printable ASCII characters without whitespace.'
    );
  return value;
};
export const legacyOnly = (capability: string): never => {
  throw invalid(
    `${capability} is available only through the retained legacy REST contract. Buffer's current API does not document an equivalent operation. Use the Buffer application for this workflow.`
  );
};
export const dateTime = (value: string, unix = false) => {
  const unixTimestamp = unix && /^-?\d+(?:\.\d+)?$/.test(value);
  const date = unixTimestamp ? new Date(Number(value) * 1000) : new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    (!unixTimestamp && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value))
  )
    throw invalid(
      'Provide a valid ISO 8601 timestamp with a timezone, or a Unix timestamp for since.'
    );
  return date.toISOString();
};
