import { createApiServiceError } from 'slates';

export let toUniOneDateTime = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return value;
  let date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createApiServiceError(
      'Provide a valid ISO 8601 timestamp or UTC date and time in YYYY-MM-DD hh:mm:ss format.'
    );
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
};
