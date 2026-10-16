import { createApiServiceError, isApiErrorRecord } from 'slates';

export let requireInput = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`${field} is required for this operation.`, {
      reason: 'zixflow_invalid_input'
    });
  }
  return value;
};

export let validatePage = (limit: number, offset: number) => {
  if (!Number.isInteger(limit) || limit <= 0 || !Number.isInteger(offset) || offset < 0) {
    throw createApiServiceError(
      'limit must be a positive integer and offset a nonnegative integer.',
      {
        reason: 'zixflow_invalid_input'
      }
    );
  }
};

export let providerString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw createApiServiceError(
      `Zixflow returned an unexpected ${field}; expected a string.`,
      {
        reason: 'zixflow_unexpected_response'
      }
    );
  }
  return value;
};

export let providerRecords = (value: unknown): Record<string, any>[] => {
  if (!Array.isArray(value) || !value.every(isApiErrorRecord)) {
    throw createApiServiceError(
      'Zixflow returned unexpected data; expected a list of objects.',
      {
        reason: 'zixflow_unexpected_response'
      }
    );
  }
  return value;
};

export let operationOutput = (result: Record<string, any>) => ({
  success: result.status === true || result.status === 'success',
  responseMessage: providerString(result.message, 'response message'),
  raw: result
});

export let providerId = (result: Record<string, any>) => {
  if (typeof result._id === 'string') return result._id;
  if (isApiErrorRecord(result.data) && typeof result.data._id === 'string') {
    return result.data._id;
  }
  return undefined;
};
