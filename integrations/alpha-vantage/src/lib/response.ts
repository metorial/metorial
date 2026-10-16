import { createApiServiceError, isApiErrorRecord } from 'slates';

// Alpha Vantage mixes numeric JSON values and decimal strings. Keep provider
// sentinel strings (such as "None" and ".") and real zeros without inventing data.
export let responseText = (value: unknown, field: string, allowEmpty = false): string => {
  if (typeof value === 'string' && (allowEmpty || value.trim().length > 0)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw createApiServiceError(
    `Alpha Vantage did not return a valid ${field}. Check the symbol, selected data, and API plan.`,
    {
      reason: 'alpha_vantage_invalid_response'
    }
  );
};

export let responseRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (isApiErrorRecord(value)) return value;
  throw createApiServiceError(`Alpha Vantage did not return the expected ${field} object.`, {
    reason: 'alpha_vantage_invalid_response'
  });
};

export let responseRows = (value: unknown, field: string): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Alpha Vantage did not return the expected ${field} list.`, {
      reason: 'alpha_vantage_invalid_response'
    });
  }
  return value.map(item => responseRecord(item, `${field} entry`));
};

export let responseSeries = (data: Record<string, unknown>) => {
  let key = Object.keys(data).find(key =>
    /^(Time Series|Weekly|Monthly|Technical Analysis)/.test(key)
  );
  let series = responseRecord(key ? data[key] : undefined, 'time series');
  for (let [date, values] of Object.entries(series))
    responseRecord(values, `time-series values for ${date}`);
  return series;
};

export let validateMonth = (month: string | undefined) => {
  if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw createApiServiceError('month must use YYYY-MM format with a valid month.');
  }
};

export let validateDate = (date: string | undefined, field: string) => {
  if (date === undefined) return;
  let parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw createApiServiceError(`${field} must be a valid date in YYYY-MM-DD format.`);
  }
};
