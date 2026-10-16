import { createApiServiceError, isApiErrorRecord } from 'slates';
import type { z } from 'zod';

export let validateOutput = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(
      'Plisio returned an invalid response. Please contact support.',
      {
        reason: 'invalid_provider_response'
      }
    );
  }
  return parsed.data;
};

export let readRecord = (value: unknown): Record<string, any> => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('Plisio returned an invalid response object.', {
      reason: 'invalid_provider_response'
    });
  }
  return value;
};

export let readArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    throw createApiServiceError('Plisio returned an invalid response list.', {
      reason: 'invalid_provider_response'
    });
  }
  return value.map(readRecord);
};

// Nullable provider values remain available, unchanged, in each tool's raw response.
export let optionalValue = <T>(value: T | null | undefined): T | undefined =>
  value === null ? undefined : value;

export let providerBoolean = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  throw createApiServiceError('Plisio returned an invalid boolean value.', {
    reason: 'invalid_provider_response'
  });
};

export let providerInteger = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  let number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 0) {
    throw createApiServiceError('Plisio returned an invalid integer value.', {
      reason: 'invalid_provider_response'
    });
  }
  return number;
};

export let validatePage = (value: number | undefined, field: string) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
    throw createApiServiceError(`${field} must be a positive integer.`);
  }
};

export let requireText = (value: string, field: string) => {
  if (!value.trim()) throw createApiServiceError(`${field} must not be empty.`);
};

export let validateDestinations = (addresses: string, amounts: string) => {
  let addressList = addresses.split(',');
  let amountList = amounts.split(',');
  if (
    addressList.length !== amountList.length ||
    addressList.some(address => !address.trim() || address !== address.trim()) ||
    amountList.some(
      amount => !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount) || !/[1-9]/.test(amount)
    )
  ) {
    throw createApiServiceError(
      'Provide one positive decimal cryptocurrency amount for each wallet address, in matching order, without empty entries or surrounding spaces.'
    );
  }
  return addressList.length > 1;
};
