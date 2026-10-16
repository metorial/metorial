import { buildApiServiceError, createApiServiceError } from 'slates';

export const crowdinError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Crowdin',
    reason: 'crowdin_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'error_description', 'key', 'code'],
    nestedKeys: ['error', 'errors'],
    extractUpstreamCode: (_error, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      const error = response.data.error;
      return helpers.isRecord(error) &&
        (typeof error.code === 'number' || typeof error.code === 'string')
        ? String(error.code)
        : undefined;
    }
  });

export const organizationDomain = (value?: string) => {
  if (!value) return undefined;
  if (typeof value !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value)) {
    throw createApiServiceError(
      'Provide only the Crowdin Enterprise organization subdomain, such as myorg.'
    );
  }
  return value.toLowerCase();
};

export const validateInput = (input: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (typeof value === 'string') {
      if (['exportId', 'preTranslationId'].includes(key) && !/^[a-z0-9-]+$/i.test(value)) {
        throw createApiServiceError(`${key} must be the job identifier returned by Crowdin.`);
      }
      if (
        key === 'deadline' &&
        (!Number.isFinite(Date.parse(value)) || !/(Z|[+-]\d{2}:\d{2})$/i.test(value))
      ) {
        throw createApiServiceError('deadline must be an ISO 8601 timestamp with a timezone.');
      }
      try {
        encodeURIComponent(value);
      } catch {
        throw createApiServiceError(`${key} must contain valid Unicode text.`);
      }
    }
    if (
      key === 'limit' ||
      key === 'offset' ||
      key === 'maxLength' ||
      /Id$/.test(key) ||
      /Ids$/.test(key)
    ) {
      // Language identifiers and asynchronous job identifiers are strings.
      if (/language/i.test(key) || typeof value === 'string') continue;
      const values = Array.isArray(value) ? value : [value];
      const minimum = ['offset', 'maxLength', 'groupId'].includes(key) ? 0 : 1;
      if (
        values.some(
          item => typeof item !== 'number' || !Number.isSafeInteger(item) || item < minimum
        ) ||
        (key === 'limit' && typeof value === 'number' && value > 500)
      ) {
        throw createApiServiceError(
          `${key} must contain integer values ${key === 'limit' ? 'from 1 to 500' : `greater than or equal to ${minimum}`}.`
        );
      }
    }
  }
};
