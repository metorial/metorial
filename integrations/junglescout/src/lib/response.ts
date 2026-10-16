import { createApiServiceError, isApiErrorRecord } from 'slates';

export type ApiRecord = Record<string, unknown>;
export type ApiResource = { id: string; attributes: ApiRecord };

export let responseRecord = (value: unknown, label: string): ApiRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`Jungle Scout returned an invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseArray = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Jungle Scout returned an invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Jungle Scout returned a missing or invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseNumber = (value: unknown, label: string): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Jungle Scout returned an invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseRequiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Jungle Scout returned a missing or invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseNullableString = (value: unknown, label: string): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw createApiServiceError(`Jungle Scout returned an invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseBoolean = (value: unknown, label: string): boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'boolean') {
    throw createApiServiceError(`Jungle Scout returned an invalid ${label}.`, {
      reason: 'junglescout_invalid_response'
    });
  }
  return value;
};

export let responseCollection = (response: ApiRecord): ApiResource[] =>
  responseArray(response.data, 'data collection').map(value => {
    let item = responseRecord(value, 'resource');
    return {
      id: responseString(item.id, 'resource ID'),
      attributes: responseRecord(item.attributes, 'resource attributes')
    };
  });

export let responsePagination = (response: ApiRecord) => {
  let meta = response.meta == null ? undefined : responseRecord(response.meta, 'metadata');
  let links = response.links == null ? undefined : responseRecord(response.links, 'links');
  let nextPageCursor: string | null = null;
  if (links?.next != null) {
    let nextLink = responseString(links.next, 'next page link');
    let nextUrl: URL;
    try {
      nextUrl = new URL(nextLink, 'https://developer.junglescout.com');
    } catch (error) {
      throw createApiServiceError('Jungle Scout returned an invalid next page link.', {
        reason: 'junglescout_invalid_response',
        parent: error
      });
    }
    nextPageCursor = nextUrl.searchParams.get('page[cursor]');
    if (!nextPageCursor) {
      throw createApiServiceError('Jungle Scout returned a next page link without a cursor.', {
        reason: 'junglescout_invalid_response'
      });
    }
  }
  return { totalItems: responseNumber(meta?.total_items, 'total item count'), nextPageCursor };
};
