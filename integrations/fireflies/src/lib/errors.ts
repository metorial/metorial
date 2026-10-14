import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorBuildHelpers,
  type ApiErrorResponse,
  buildApiServiceError,
  isApiErrorRecord as isRecord
} from 'slates';

let FIREFLIES_DETAIL_KEYS = ['message', 'error', 'description', 'code'];

// GraphQL errors returned with HTTP 200 are passed in as `{ data: body }`.
let firefliesErrorResponse = (
  error: unknown,
  helpers: ApiErrorBuildHelpers
): ApiErrorResponse | undefined => {
  let response = helpers.getResponseWithBody(error);
  if (response?.data !== undefined) return response;
  if (
    !isRecord(error) ||
    error instanceof Error ||
    error.name === 'SlateError' ||
    !isRecord(error.data)
  ) {
    return response;
  }

  return { ...response, data: error.data };
};

let upstreamCodeFor = (response: ApiErrorResponse | undefined) => {
  let data = response?.data;
  if (!isRecord(data) || !Array.isArray(data.errors)) return undefined;

  for (let item of data.errors) {
    if (!isRecord(item)) continue;
    if (typeof item.code === 'string') return item.code;
    if (isRecord(item.extensions) && typeof item.extensions.code === 'string') {
      return item.extensions.code;
    }
  }

  return undefined;
};

export let firefliesServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let firefliesApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Fireflies',
    operation,
    reason: 'fireflies_api_error',
    detailKeys: FIREFLIES_DETAIL_KEYS,
    extractResponse: firefliesErrorResponse,
    extractUpstreamCode: (_input, response) => upstreamCodeFor(response)
  });
