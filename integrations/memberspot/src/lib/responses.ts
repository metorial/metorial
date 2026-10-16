import { createApiServiceError, isApiErrorRecord } from 'slates';

export let getMemberspotList = (result: unknown, fields: string[]) => {
  let value: unknown = result;
  if (isApiErrorRecord(result)) {
    let field = fields.find(key => key in result);
    value = field ? result[field] : [result];
  }
  if (!Array.isArray(value) || !value.every(isApiErrorRecord)) {
    throw createApiServiceError('Memberspot returned an invalid list response.');
  }
  return value;
};

export let getMemberspotNextPage = (result: unknown) => {
  if (!isApiErrorRecord(result)) return undefined;
  let cursor = result.nextPage ?? result.next_page;
  if (cursor === undefined || cursor === null) return undefined;
  if (typeof cursor !== 'string') {
    throw createApiServiceError('Memberspot returned an invalid pagination cursor.');
  }
  return cursor;
};
