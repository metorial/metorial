import { iterableServiceError } from './errors';

type UserIdentity = {
  email?: string;
  userId?: string;
};

export let requireUserIdentity = (input: UserIdentity, label = 'user') => {
  if (!input.email && !input.userId) {
    throw iterableServiceError(`Provide either email or userId to identify the ${label}.`);
  }

  if (input.email && input.userId) {
    throw iterableServiceError(`Provide either email or userId for the ${label}, not both.`);
  }
};

export let requireField = <T>(value: T | undefined | null, name: string): T => {
  if (value === undefined || value === null || value === '') {
    throw iterableServiceError(`${name} is required.`);
  }

  return value;
};

export let requireArrayField = <T>(value: T[] | undefined, name: string): T[] => {
  if (!value?.length) {
    throw iterableServiceError(`${name} must include at least one item.`);
  }

  return value;
};

export let requireRecordField = (
  value: Record<string, unknown> | undefined,
  name: string
): Record<string, unknown> => {
  if (!value || Object.keys(value).length === 0) {
    throw iterableServiceError(`${name} must include at least one field.`);
  }

  return value;
};
