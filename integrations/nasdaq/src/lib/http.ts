import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export let nasdaqApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Nasdaq',
    operation,
    reason: 'nasdaq_api_error',
    detailKeys: ['message', 'detail', 'error_description', 'error', 'code'],
    nestedKeys: ['quandl_error', 'errors', 'error'],
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractUpstreamCode: (_input, response) => {
      let data = response?.data;
      let detail =
        isApiErrorRecord(data) && isApiErrorRecord(data.quandl_error)
          ? data.quandl_error
          : data;
      return isApiErrorRecord(detail) && typeof detail.code === 'string'
        ? detail.code
        : undefined;
    }
  });

export let createNasdaqHttp = (baseURL?: string) => {
  let http = createAuthenticatedAxios({
    baseURL,
    contentType: false,
    timeout: 30_000,
    errorAdapter: nasdaqApiError,
    headers: { Accept: 'application/json' }
  });
  http.interceptors.response.use(response => {
    if (
      isApiErrorRecord(response.data) &&
      (response.data.quandl_error || response.data.error || response.data.errors)
    ) {
      throw nasdaqApiError({ response: { status: response.status, data: response.data } });
    }
    return response;
  });
  return http;
};

export let parseResponse = <T extends z.ZodType>(
  schema: T,
  data: unknown,
  label: string
): z.infer<T> => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(`Nasdaq returned an invalid ${label} response.`, {
      reason: 'nasdaq_invalid_response'
    });
  }
  return result.data;
};

export let validateInteger = (
  value: number | undefined,
  name: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < minimum || value > maximum)
  ) {
    throw createApiServiceError(
      `${name} must be a whole number between ${minimum} and ${maximum}.`
    );
  }
};

export let encodeCode = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} is required.`);
  return encodeURIComponent(value);
};

export let encodeTablePath = (value: string) => {
  let parts = value.split('/');
  if (parts.length !== 2 || parts.some(part => !part.trim())) {
    throw createApiServiceError('tablePath must have the form PUBLISHER/TABLE_CODE.');
  }
  return parts.map(part => encodeCode(part, 'Table code')).join('/');
};

export let validateFilters = (filters?: Record<string, string>) => {
  for (let key of Object.keys(filters ?? {})) {
    if (!key || key === 'api_key' || key.startsWith('qopts.')) {
      throw createApiServiceError(
        'Filters must be column names or column comparison filters. Use the dedicated inputs for pagination and column selection.'
      );
    }
  }
};

export let validateHttpsUrl = (value: string, label: string) => {
  let result = z.url().safeParse(value);
  if (!result.success) throw createApiServiceError(`${label} must be an HTTPS URL.`);
  let url = new URL(result.data);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw createApiServiceError(
      `${label} must be an HTTPS URL without embedded credentials, query parameters, or a fragment.`
    );
  }
  return url.toString().replace(/\/$/, '');
};
