import { buildApiServiceError, createApiServiceError, isApiErrorRecord } from 'slates';

export let invalidResponse = (detail: string) =>
  createApiServiceError(`Twelve Data returned an unusable response: ${detail}.`, {
    reason: 'twelve_data_invalid_response'
  });

export let providerError = (body: Record<string, unknown>) =>
  buildApiServiceError(
    {
      response: { status: typeof body.code === 'number' ? body.code : undefined, data: body }
    },
    {
      providerLabel: 'Twelve Data',
      reason: 'twelve_data_api_error',
      extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
      extractUpstreamCode: () =>
        typeof body.code === 'undefined' ? undefined : String(body.code)
    }
  );

export let record = (value: unknown, field: string): Record<string, any> => {
  if (!isApiErrorRecord(value)) throw invalidResponse(`${field} must be an object`);
  return value;
};

export let records = (value: unknown, field: string): Record<string, any>[] => {
  if (!Array.isArray(value)) throw invalidResponse(`${field} must be an array`);
  return value.map((item, index) => record(item, `${field}[${index}]`));
};

export let requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.length)
    throw invalidResponse(`${field} must be a nonempty string`);
  return value;
};

export let optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export let optionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export let optionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

export let decimalString = (value: unknown, field: string): string => {
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw invalidResponse(`${field} must be a finite decimal value`);
};

export let optionalDecimalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return decimalString(value, 'optional financial value');
};
