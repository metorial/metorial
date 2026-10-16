import { createApiServiceError } from 'slates';

export let validateHistoryRange = (from?: string, to?: string, maxHours?: number) => {
  if (from === undefined && to === undefined) return;
  if (!from || !to) {
    throw createApiServiceError('Provide both from and to for a historical query.');
  }

  let parseTimestamp = (value: string) => {
    let timestamp = Date.parse(`${value.replace(' ', 'T')}Z`);
    if (
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ||
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ') !== value
    ) {
      throw createApiServiceError('Use valid timestamps in YYYY-MM-DD HH:mm:ss format.');
    }
    return timestamp;
  };

  let duration = parseTimestamp(to) - parseTimestamp(from);
  if (duration < 0) {
    throw createApiServiceError('The to timestamp must be on or after from.');
  }
  if (maxHours !== undefined && duration > maxHours * 60 * 60 * 1000) {
    throw createApiServiceError(
      `The historical query window must not exceed ${maxHours} hours.`
    );
  }
};
