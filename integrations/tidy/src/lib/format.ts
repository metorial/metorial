import { createApiServiceError } from 'slates';

export let formatTidyId = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw createApiServiceError('TIDY returned a resource without a valid identifier.');
  }
  return String(value);
};

export let toTidyId = (value: string, field: string): number => {
  let id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
    throw createApiServiceError(`${field} must be a positive whole-number TIDY identifier.`);
  }
  return id;
};

export let toTidyDateTime = (value: string, field: string) => {
  let match =
    /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):(00|30)(?::00(?:\.0+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.exec(
      value
    );
  if (
    !match ||
    Number.isNaN(Date.parse(`${match[1]}T00:00:00Z`)) ||
    new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) !== match[1]
  ) {
    throw createApiServiceError(
      `${field} must be an ISO 8601 date and time on a 30-minute interval. Use the property's local date and time.`
    );
  }
  return { date: match[1], time: `${match[2]}:${match[3]}` };
};

export let formatTidyDateTime = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    'date' in value &&
    'time' in value &&
    typeof value.date === 'string' &&
    typeof value.time === 'string'
  ) {
    return `${value.date}T${value.time}:00`;
  }
  throw createApiServiceError('TIDY returned an invalid job date and time.');
};

export let bookingEndTime = (date: string, time: string, serviceTypeKey: string) => {
  let durations: Record<string, number> = {
    'regular_cleaning.one_hour': 60,
    'regular_cleaning.two_and_a_half_hours': 150,
    'regular_cleaning.four_hours': 240
  };
  let duration = durations[serviceTypeKey];
  let start = Date.parse(`${date}T${time}:00Z`);
  if (duration === undefined || Number.isNaN(start)) return '';
  return new Date(start + duration * 60_000).toISOString().slice(0, 19);
};
