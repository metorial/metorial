import { createApiServiceError } from 'slates';

export let validateInteger = (value: number, field: string, min: number, max?: number) => {
  if (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max)) {
    throw createApiServiceError(
      `${field} must be a whole number from ${min}${max === undefined ? '' : ` to ${max}`}.`
    );
  }
};

export let validateDate = (value: string, field: string) => {
  let parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw createApiServiceError(
      `${field} must be a valid calendar date in YYYY-MM-DD format.`
    );
  }
};

export let weatherTimestamp = (value: number) => {
  let date = new Date(value * 1000);
  if (!Number.isFinite(value) || Number.isNaN(date.getTime())) {
    throw createApiServiceError('OpenWeather returned an invalid weather timestamp.', {
      reason: 'openweather_invalid_response'
    });
  }
  return date.toISOString();
};

export let weatherString = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw createApiServiceError(
      'OpenWeather omitted a required weather description or location.',
      {
        reason: 'openweather_invalid_response'
      }
    );
  }
  return value;
};

export let weatherArray = <T>(value: T[] | null | undefined): T[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError('OpenWeather omitted a required result list.', {
      reason: 'openweather_invalid_response'
    });
  }
  return value;
};
