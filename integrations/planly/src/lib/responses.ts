import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';
import type { PaginationInput } from './client';

export let rawSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Original provider data');
export let teamIdSchema = z
  .string()
  .describe('Team ID. Call list_teams to discover available teams.');

let invalidResponse = (field: string) =>
  createApiServiceError(`Planly returned missing or invalid ${field}.`, {
    reason: 'planly_invalid_response'
  });

export let responseData = (value: unknown): unknown =>
  isApiErrorRecord(value) && 'data' in value ? value.data : value;

export let responseRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) throw invalidResponse(field);
  return value;
};

export let responseArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) throw invalidResponse(field);
  return value;
};

export let responseItems = (value: unknown, aliases: string[]): unknown[] => {
  if (Array.isArray(value)) return value;
  let data = responseRecord(value, 'list response');
  for (let key of ['rows', ...aliases]) {
    if (data[key] !== undefined) return responseArray(data[key], key);
  }
  throw invalidResponse('list items');
};

export let requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw invalidResponse(field);
  return value;
};

export let optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export let nullableString = (value: unknown): string | null | undefined =>
  value === null ? null : optionalString(value);

export let optionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export let scalarString = (value: unknown): string | undefined =>
  typeof value === 'string'
    ? value
    : optionalNumber(value) !== undefined
      ? String(value)
      : undefined;

export let requiredScalarString = (value: unknown, field: string): string =>
  requiredString(scalarString(value), field);

export let requireConfirmed = (value: unknown) => {
  if (responseData(value) !== true) throw invalidResponse('operation confirmation');
};

export let paginationFor = (input: {
  cursor?: string;
  pageSize?: number;
  orderByField?: string;
  orderByDirection?: string;
}): PaginationInput | undefined => {
  if (
    input.pageSize !== undefined &&
    (!Number.isInteger(input.pageSize) || input.pageSize <= 0)
  ) {
    throw createApiServiceError('pageSize must be a positive whole number.');
  }
  if (input.orderByDirection && !input.orderByField) {
    throw createApiServiceError('Provide orderByField when setting orderByDirection.');
  }
  let pagination: PaginationInput = {
    cursor: input.cursor,
    pageSize: input.pageSize,
    orderBy: input.orderByField
      ? [input.orderByField, input.orderByDirection ?? 'desc']
      : undefined
  };
  return Object.values(pagination).some(value => value !== undefined) ? pagination : undefined;
};

export let pageMetadata = (value: unknown) => {
  let data = isApiErrorRecord(value) ? value : {};
  return {
    nextCursor: nullableString(data.next),
    totalCount: optionalNumber(data.totalNumberOfRows)
  };
};

export let mapMedia = (value: unknown) => {
  let media = responseRecord(value, 'media item');
  let resolution = isApiErrorRecord(media.resolution) ? media.resolution : undefined;
  return {
    mediaId: requiredString(media.id, 'media ID'),
    contentType: optionalString(media.contentType) ?? optionalString(media.mimeType),
    contentLength: optionalNumber(media.contentLength),
    contentUri: optionalString(media.contentUri),
    thumbnailUri: optionalString(media.thumbnailUri),
    duration: media.duration === null ? null : optionalNumber(media.duration),
    resolution: nullableString(media.resolution),
    createdAt: optionalString(media.createdAt),
    mediaTypeCode: optionalNumber(media.contentType),
    dimensions: resolution
      ? {
          width: optionalNumber(resolution.width),
          height: optionalNumber(resolution.height)
        }
      : undefined,
    raw: media
  };
};

export let mediaAdditionalFields = {
  mediaTypeCode: z.number().optional().describe('Provider media type code'),
  dimensions: z
    .object({ width: z.number().optional(), height: z.number().optional() })
    .optional()
    .describe('Image or video dimensions in pixels'),
  raw: rawSchema
};

export let upsertGroups = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  let data = responseRecord(value, 'schedule group response');
  if ('upsert' in data) return responseArray(data.upsert, 'upsert groups');
  if (typeof data.id === 'string') return [data];
  throw invalidResponse('upsert groups');
};

export let mapSchedule = (value: unknown, groupPublishOn?: unknown) => {
  let schedule = responseRecord(value, 'schedule');
  let channel = isApiErrorRecord(schedule.channel) ? schedule.channel : undefined;
  let publishOn = schedule.publish_on !== undefined ? schedule.publish_on : schedule.publishOn;
  return {
    scheduleId: requiredString(schedule.id, 'schedule ID'),
    channelId: optionalString(channel?.id ?? schedule.channelId ?? schedule.channel_id),
    content: nullableString(schedule.content),
    status: scalarString(schedule.status),
    publishOn: nullableString(publishOn === undefined ? groupPublishOn : publishOn),
    createdAt: optionalString(schedule.created_at ?? schedule.createdAt),
    url: nullableString(schedule.url),
    errorMessage: nullableString(schedule.error_message ?? schedule.errorMessage),
    media:
      schedule.media === undefined
        ? undefined
        : responseArray(schedule.media, 'schedule media').map(value => {
            let media = responseRecord(value, 'schedule media item');
            return {
              mediaId: requiredString(media.id, 'schedule media ID'),
              contentUri: optionalString(media.contentUri),
              thumbnailUri: optionalString(media.thumbnailUri),
              contentType: media.contentType,
              raw: media
            };
          }),
    raw: schedule
  };
};
