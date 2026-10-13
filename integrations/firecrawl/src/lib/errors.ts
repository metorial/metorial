import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError } from 'slates';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let FIRECRAWL_DETAIL_KEYS = ['message', 'detail', 'title', 'error', 'reason', 'code'];

// createAxios converts upstream failures into SlateError before this adapter
// runs, so the raw response body only survives in SlateError.data.baggage.
let withSlateErrorResponseData = (
  error: unknown,
  response: ApiErrorResponse | undefined
): ApiErrorResponse | undefined => {
  if (response?.data !== undefined) return response;
  if (!isRecord(error) || error.name !== 'SlateError' || !isRecord(error.data)) {
    return response;
  }

  let baggage = isRecord(error.data.baggage) ? error.data.baggage : undefined;
  if (baggage?.response === undefined) return response;

  return { ...response, data: baggage.response };
};

let upstreamCodeFor = (response: ApiErrorResponse | undefined) =>
  isRecord(response?.data) && typeof response.data.code === 'string'
    ? response.data.code
    : undefined;

export let firecrawlServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let firecrawlApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Firecrawl',
    operation,
    reason: 'firecrawl_api_error',
    detailKeys: FIRECRAWL_DETAIL_KEYS,
    extractResponse: (input, helpers) =>
      withSlateErrorResponseData(input, helpers.getResponse(input)),
    extractUpstreamCode: (_input, response) => upstreamCodeFor(response)
  });
