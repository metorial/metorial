import { createApiServiceError, isApiErrorRecord } from 'slates';
import type { z } from 'zod';

const camelize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(camelize);
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key.replace(/-([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase()),
      camelize(entry)
    ])
  );
};

export const parseProviderResponse = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown
) => {
  if (!isApiErrorRecord(data)) {
    throw createApiServiceError('Neutrino returned an unexpected response.', {
      reason: 'invalid_api_response'
    });
  }
  let normalized = camelize(data);
  if (
    isApiErrorRecord(normalized) &&
    typeof normalized.apiError === 'number' &&
    normalized.apiError > 0
  ) {
    throw createApiServiceError(
      typeof normalized.apiErrorMsg === 'string'
        ? normalized.apiErrorMsg
        : 'Neutrino rejected the request.',
      { reason: 'neutrino_api_error', upstreamCode: String(normalized.apiError) }
    );
  }
  let parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    throw createApiServiceError('Neutrino returned missing or incompatible response fields.', {
      reason: 'invalid_api_response'
    });
  }
  return { ...parsed.data, raw: data };
};
