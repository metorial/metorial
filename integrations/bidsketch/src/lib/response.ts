import { createApiServiceError, isApiErrorRecord } from 'slates';

export let readBidsketchRecord = (value: unknown, field = 'response') => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(
      `Bidsketch returned an invalid ${field}; expected an object.`,
      {
        reason: 'invalid_response'
      }
    );
  }
  return value as Record<string, any>;
};

export let readBidsketchList = (value: unknown, field = 'response') => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(`Bidsketch returned an invalid ${field}; expected a list.`, {
      reason: 'invalid_response'
    });
  }
  return value.map(item => readBidsketchRecord(item, `${field} item`));
};

export let readBidsketchString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw createApiServiceError(`Bidsketch did not return a valid ${field}.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let readBidsketchNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(`Bidsketch did not return a numeric ${field}.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};

export let readBidsketchBoolean = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') {
    throw createApiServiceError(`Bidsketch did not return a boolean ${field}.`, {
      reason: 'invalid_response'
    });
  }
  return value;
};
