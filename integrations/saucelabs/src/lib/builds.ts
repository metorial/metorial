import { createApiServiceError } from 'slates';

export let buildTimeToTimestamp = (value: string | undefined, field: string) => {
  if (value === undefined) return undefined;
  let timestamp =
    value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : Date.parse(value) / 1000;
  if (!Number.isFinite(timestamp)) {
    throw createApiServiceError(
      `${field} must be an ISO 8601 date or a Unix timestamp in seconds.`
    );
  }
  return timestamp;
};

export let buildTimestampToIso = (value: number | string | null | undefined) => {
  if (value == null) return undefined;
  let date = new Date(typeof value === 'number' ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export let buildJobStatus = (state?: Record<string, boolean>) => {
  if (!state) return undefined;
  return [
    'running',
    'queued',
    'new',
    'errored',
    'failed',
    'passed',
    'completed',
    'finished'
  ].find(key => state[key]);
};
