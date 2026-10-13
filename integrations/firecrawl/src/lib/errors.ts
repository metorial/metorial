import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorResponse,
  buildApiServiceError,
  isApiErrorRecord as isRecord
} from 'slates';

let FIRECRAWL_DETAIL_KEYS = ['message', 'detail', 'title', 'error', 'reason', 'code'];

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
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractUpstreamCode: (_input, response) => upstreamCodeFor(response)
  });
