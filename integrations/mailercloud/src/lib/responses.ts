import { isApiErrorRecord } from 'slates';

// Marketing search endpoints return arrays, numeric-keyed objects, or a single record.
export let getMailercloudItems = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) return data.filter(isApiErrorRecord);
  if (!isApiErrorRecord(data)) return [];
  if ('id' in data) return [data];
  return Object.entries(data)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([, item]) => item)
    .filter(isApiErrorRecord);
};

export let getMailercloudCount = (count: unknown, fallback: number): number => {
  if (typeof count === 'number') return count;
  if (Array.isArray(count) && isApiErrorRecord(count[0])) {
    if (typeof count[0].count === 'number') return count[0].count;
  }
  return fallback;
};
