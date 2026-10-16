import { createApiServiceError, isApiErrorRecord, pickDefined } from 'slates';

export type FinageRecord = Record<string, unknown>;

export let finageRecord = (value: unknown, label = 'response'): FinageRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Finage returned an invalid ${label}.`);
  }
  return value;
};

export let finageRecords = (value: unknown, keys: string[] = []): FinageRecord[] => {
  if (Array.isArray(value)) return value.map(item => finageRecord(item, 'result record'));
  let record = finageRecord(value);
  for (let key of keys) {
    if (Array.isArray(record[key])) return finageRecords(record[key]);
  }
  throw createApiServiceError(
    'Finage returned a response without the expected results array.'
  );
};

export let finageNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  let normalized =
    typeof value === 'string' ? value.trim().replace(/%$/, '').trim() : undefined;
  let numeric =
    typeof value === 'number' ? value : normalized ? Number(normalized) : Number.NaN;
  if (!Number.isFinite(numeric)) {
    throw createApiServiceError('Finage returned an invalid numeric value.');
  }
  return numeric;
};

export let finageString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string')
    throw createApiServiceError('Finage returned an invalid text value.');
  return value;
};

export let requiredFinageString = (value: unknown, label: string): string => {
  let result = finageString(value);
  if (!result?.trim())
    throw createApiServiceError(`Finage returned a result without ${label}.`);
  return result;
};

export let finageBar = (bar: FinageRecord) => {
  if (!['o', 'h', 'l', 'c'].some(key => bar[key] !== undefined && bar[key] !== null)) {
    throw createApiServiceError('Finage returned an aggregate bar without price data.');
  }
  return pickDefined({
    open: finageNumber(bar.o),
    high: finageNumber(bar.h),
    low: finageNumber(bar.l),
    close: finageNumber(bar.c),
    volume: finageNumber(bar.v),
    timestamp: finageNumber(bar.t)
  });
};

export let finagePreviousClose = (data: unknown) => {
  let bar = finageRecords(data, ['results'])[0];
  if (!bar) return undefined;
  let { timestamp: _timestamp, ...prices } = finageBar(bar);
  return prices;
};

export let validateFinageRange = (from?: string, to?: string) => {
  for (let value of [from, to]) {
    if (
      value !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    ) {
      throw createApiServiceError('Dates must be valid calendar dates in YYYY-MM-DD format.');
    }
  }
  if (from && to && from > to)
    throw createApiServiceError('The start date must be on or before the end date.');
};

export let validateFinageLimit = (
  value: number | undefined,
  label: string,
  maximum?: number
) => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < 1 || (maximum !== undefined && value > maximum))
  ) {
    throw createApiServiceError(
      `${label} must be a positive whole number${maximum === undefined ? '' : ` no greater than ${maximum}`}.`
    );
  }
};

export let finageSymbol = (value: string) => {
  let symbol = value.trim().toUpperCase();
  if (!symbol)
    throw createApiServiceError('Provide a non-empty market symbol or currency code.');
  return symbol;
};
