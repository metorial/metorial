import { createApiServiceError } from 'slates';

export let requireAtLeastOneDefined = <T extends Record<string, unknown>>(
  values: T,
  message: string
) => {
  if (!Object.values(values).some(value => value !== undefined)) {
    throw createApiServiceError(message);
  }

  return values;
};
