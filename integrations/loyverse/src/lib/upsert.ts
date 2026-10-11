import { createApiServiceError } from 'slates';

// Loyverse create/update endpoints are POST upserts that replace the stored
// object, so updates start from the current writable fields to avoid clearing
// values the caller did not mention.
export let pickWritable = (existing: any, keys: readonly string[]) => {
  let body: Record<string, unknown> = {};
  for (let key of keys) {
    if (existing?.[key] !== undefined && existing[key] !== null) body[key] = existing[key];
  }
  return body;
};

export let requireForCreate = (value: unknown, label: string, resource: string) => {
  if (value === undefined || value === null || value === '') {
    throw createApiServiceError(`${label} is required when creating a ${resource}.`, {
      reason: 'invalid_input'
    });
  }
};
