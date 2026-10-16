import { isApiErrorRecord } from 'slates';

// BART translates XML nodes and CDATA into JSON objects.
export let bartRecord = (value: unknown): Record<string, unknown> =>
  isApiErrorRecord(value) ? value : {};

export let bartText = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  let node = bartRecord(value);
  return typeof node['#cdata-section'] === 'string' ? node['#cdata-section'] : '';
};

export let bartValues = (value: unknown): unknown[] =>
  value === undefined || value === null || value === ''
    ? []
    : Array.isArray(value)
      ? value
      : [value];

export let bartRecords = (value: unknown): Record<string, unknown>[] =>
  bartValues(value).filter(isApiErrorRecord);

export let bartStrings = (value: unknown): string[] =>
  bartValues(value).map(bartText).filter(Boolean);
