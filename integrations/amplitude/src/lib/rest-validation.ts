import { z } from 'zod';
import { amplitudeServiceError, unexpectedAmplitudeResponse } from './errors';

export let recordSchema = z.record(z.string(), z.unknown());
export let numericSeriesSchema = z.array(z.array(z.number().nullable()));
export let dashboardDataSchema = z
  .object({
    series: z.array(z.unknown()),
    xValues: z.array(z.string()).optional(),
    seriesMeta: z.array(z.unknown()).optional(),
    seriesLabels: z.array(z.unknown()).optional(),
    seriesCollapsed: z.array(z.unknown()).optional()
  })
  .passthrough();

export let parseResponse = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  let result = schema.safeParse(value);
  if (!result.success) throw unexpectedAmplitudeResponse(operation);
  return result.data;
};

export let parseJson = (value: string, field: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    throw amplitudeServiceError(`${field} must contain valid JSON.`);
  }
};

let eventDefinition = z.object({ event_type: z.string().min(1) }).passthrough();
export let parseEvent = (value: string, field: string) => {
  let result = eventDefinition.safeParse(parseJson(value, field));
  if (!result.success)
    throw amplitudeServiceError(
      `${field} must be a JSON event object with a nonempty event_type.`
    );
  return result.data;
};

export let parseEvents = (value: string) => {
  let result = z.array(eventDefinition).min(2).safeParse(parseJson(value, 'events'));
  if (!result.success)
    throw amplitudeServiceError(
      'events must be a JSON array containing at least two event objects with event_type.'
    );
  return result.data;
};

export let serializeSegment = (value?: string) => {
  if (value === undefined) return undefined;
  let result = z.array(recordSchema).safeParse(parseJson(value, 'segment'));
  if (!result.success)
    throw amplitudeServiceError('segment must be a JSON array of filter objects.');
  return JSON.stringify(result.data);
};

export let serializeGroupBy = (value?: string) => {
  if (value === undefined) return undefined;
  let trimmed = value.trim();
  // Accept the JSON format documented by older versions as well as plain names.
  if (trimmed.startsWith('"')) {
    let parsed = parseJson(trimmed, 'groupBy');
    if (typeof parsed === 'string' && parsed.length) return parsed;
  } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed = parseJson(trimmed, 'groupBy');
    if (Array.isArray(parsed) && parsed.length === 1) parsed = parsed[0];
    let result = z
      .object({ type: z.literal('user').optional(), value: z.string().min(1) })
      .safeParse(parsed);
    if (result.success) return result.data.value;
  } else if (trimmed) return trimmed;
  throw amplitudeServiceError(
    'groupBy must name one user property, for example country or gp:plan. Put event-property group_by clauses in the event definition.'
  );
};

export let validateDateRange = (
  start: string,
  end: string,
  format: 'day' | 'hour' | 'iso-day' = 'day'
) => {
  let parse = (value: string) => {
    let match =
      format === 'hour'
        ? /^(\d{4})(\d{2})(\d{2})T(\d{2})$/.exec(value)
        : format === 'iso-day'
          ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
          : /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    if (!match)
      throw amplitudeServiceError(
        `Dates must use ${format === 'hour' ? 'YYYYMMDDTHH' : format === 'iso-day' ? 'YYYY-MM-DD' : 'YYYYMMDD'} format.`
      );
    let iso = `${match[1]}-${match[2]}-${match[3]}T${match[4] ?? '00'}:00:00.000Z`;
    let time = Date.parse(iso);
    if (!Number.isFinite(time) || new Date(time).toISOString() !== iso)
      throw amplitudeServiceError(`Invalid calendar date: ${value}.`);
    return time;
  };
  let startTime = parse(start);
  let endTime = parse(end);
  if (endTime < startTime) throw amplitudeServiceError('end must be on or after start.');
  if (format === 'hour' && endTime - startTime >= 365 * 86400000)
    throw amplitudeServiceError('An export range may not exceed 365 days.');
};

export let validateInterval = (value: number | undefined, realtime = false) => {
  if (
    value !== undefined &&
    !(realtime ? [-300000, -3600000, 1, 7, 30] : [1, 7, 30]).includes(value)
  )
    throw amplitudeServiceError(
      `interval must be ${realtime ? '-300000, -3600000, ' : ''}1, 7, or 30.`
    );
};
