import { createApiServiceError } from 'slates';

export let validateIntegerFields = (input: object, fields: string[], minimum = 0) => {
  for (let field of fields) {
    let value = (input as Record<string, unknown>)[field];
    if (
      value !== undefined &&
      (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
    ) {
      throw createApiServiceError(
        `${field} must be a whole number greater than or equal to ${minimum}.`
      );
    }
  }
};

export let validateEventTimes = (input: {
  startUtc?: string;
  startTimezone?: string;
  endUtc?: string;
  endTimezone?: string;
}) => {
  for (let [time, timezone, label] of [
    [input.startUtc, input.startTimezone, 'Start'],
    [input.endUtc, input.endTimezone, 'End']
  ]) {
    if ((time === undefined) !== (timezone === undefined)) {
      throw createApiServiceError(`${label} UTC time and timezone must be supplied together.`);
    }
    if (
      time !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(time) ||
        !Number.isFinite(Date.parse(time)))
    ) {
      throw createApiServiceError(
        `${label} time must be a valid UTC datetime such as 2026-12-25T18:00:00Z.`
      );
    }
    if (timezone !== undefined) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: timezone });
      } catch {
        throw createApiServiceError(
          `${label} timezone must be a valid timezone identifier, such as America/New_York.`
        );
      }
    }
  }
  if (
    input.startUtc &&
    input.endUtc &&
    Date.parse(input.endUtc) <= Date.parse(input.startUtc)
  ) {
    throw createApiServiceError('Event end time must be after the start time.');
  }
};
