import { createApiServiceError, isApiErrorRecord } from 'slates';

export type LeadBoxerRecord = Record<string, unknown>;

export let readLeadBoxerRecord = (value: unknown, operation: string): LeadBoxerRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`LeadBoxer returned an invalid ${operation} response.`, {
      reason: 'leadboxer_invalid_response'
    });
  }
  return value;
};

export let readLeadBoxerPage = (value: unknown, operation: string) => {
  let envelope = isApiErrorRecord(value) ? value : {};
  let data = Array.isArray(value) ? value : (envelope.data ?? envelope.resultsList);
  if (!Array.isArray(data)) {
    throw createApiServiceError(`LeadBoxer returned an invalid ${operation} list.`, {
      reason: 'leadboxer_invalid_response'
    });
  }
  return {
    data: data.map(item => readLeadBoxerRecord(item, operation)),
    metaData: isApiErrorRecord(envelope.metaData) ? envelope.metaData : {}
  };
};

// LeadBoxer exposes numeric metrics as both numbers and numeric strings.
export let leadString = (value: unknown): string | undefined =>
  typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    ? String(value)
    : undefined;

export let leadNumber = (value: unknown): number | undefined => {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !value.trim())
  ) {
    return undefined;
  }
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

export let leadStringList = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return typeof value === 'string' && value
    ? value.split(',').map(item => item.trim())
    : undefined;
};
