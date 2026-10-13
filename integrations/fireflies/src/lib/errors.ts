import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError } from 'slates';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let FIREFLIES_DETAIL_KEYS = ['message', 'error', 'description', 'code'];

// createAxios converts upstream failures into SlateError before this adapter
// runs, so the raw GraphQL error body only survives in SlateError.data.baggage.
// GraphQL errors returned with HTTP 200 are passed in as `{ data: body }`.
let firefliesErrorResponse = (
  error: unknown,
  response: ApiErrorResponse | undefined
): ApiErrorResponse | undefined => {
  if (response?.data !== undefined) return response;
  if (!isRecord(error) || !isRecord(error.data)) return response;

  if (error.name === 'SlateError') {
    let baggage = isRecord(error.data.baggage) ? error.data.baggage : undefined;
    if (baggage?.response === undefined) return response;
    return { ...response, data: baggage.response };
  }

  if (!(error instanceof Error)) {
    return { ...response, data: error.data };
  }

  return response;
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
    extractResponse: (input, helpers) =>
      firefliesErrorResponse(input, helpers.getResponse(input)),
    extractUpstreamCode: (_input, response) => upstreamCodeFor(response)
  });
