import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let polygonResponseFields = {
  rawResponse: z
    .unknown()
    .optional()
    .describe(
      'Complete provider response, including plan-dependent data and per-ticker errors.'
    ),
  nextCursor: z
    .string()
    .optional()
    .describe(
      'Pagination cursor. Pass it to the same tool with the same selection to retrieve the next page.'
    )
};

export let polygonCursor = z
  .string()
  .optional()
  .describe(
    'Pagination cursor returned by a previous call to this tool. Keep the same data type and ticker selection.'
  );

// Summaries omit unavailable values; the separate provider response retains nulls.
let omitNullSummaryFields = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(omitNullSummaryFields) as T;
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, field]) => field !== null && field !== undefined)
      .map(([key, field]) => [key, omitNullSummaryFields(field)])
  ) as T;
};

export let polygonOutput = <T extends object>(summary: T, response: unknown) => {
  let nextCursor: string | undefined;
  if (isApiErrorRecord(response) && typeof response.next_url === 'string') {
    try {
      nextCursor = new URL(response.next_url).searchParams.get('cursor') ?? undefined;
    } catch {
      throw createApiServiceError(
        'Massive returned an invalid pagination URL. Retry the request.'
      );
    }
  }
  return { ...omitNullSummaryFields(summary), rawResponse: response, nextCursor };
};

export let polygonRecords = (value: unknown, field = 'results', required = false) => {
  if (!required && (value === undefined || value === null)) return [];
  if (!Array.isArray(value) || value.some(item => !isApiErrorRecord(item))) {
    throw createApiServiceError(
      `Massive returned malformed ${field}; expected an array of records.`
    );
  }
  return value;
};

export let validatePolygonLimit = (limit: number | undefined, maximum: number) => {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > maximum)) {
    throw createApiServiceError(`limit must be an integer between 1 and ${maximum}.`);
  }
};

export let polygonTickerList = (value: string) => {
  let tickers = value.split(',').map(ticker => ticker.trim());
  if (tickers.some(ticker => !ticker)) {
    throw createApiServiceError('Provide nonempty ticker symbols separated by commas.');
  }
  return tickers;
};

export let polygonRawOutput = <T extends object>(records: T, response: unknown) => ({
  ...records,
  ...polygonOutput({}, response)
});
