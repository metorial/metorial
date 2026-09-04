import { ServiceError, tooManyRequestsError } from '@lowerdeck/error';
import { getResponseHeaderValue } from 'slates';

let MAX_RATE_LIMIT_RETRIES = 3;
let MAX_RETRY_WAIT_MS = 60_000;

type HttpResponse<T> = {
  status: number;
  headers?: unknown;
  data: T;
};

type Sleep = (milliseconds: number) => Promise<void>;

let sleep: Sleep = milliseconds =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });

export let getNotionRetryAfterMs = (
  headers: unknown,
  retryNumber: number,
  now = Date.now()
) => {
  let value = getResponseHeaderValue(headers, 'retry-after');
  let requestedDelay: number | undefined;

  if (value !== undefined) {
    let seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      requestedDelay = seconds * 1000;
    } else {
      let timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) requestedDelay = Math.max(0, timestamp - now);
    }
  }

  let fallbackDelay = 250 * 2 ** Math.max(0, retryNumber);
  return requestedDelay ?? fallbackDelay;
};

let notionRateLimitError = (retryAfter?: string) =>
  new ServiceError(
    tooManyRequestsError({
      message: 'Notion rate limited the request and it could not be retried safely.',
      hint: retryAfter
        ? `Retry after Notion's Retry-After value (${retryAfter}).`
        : 'Wait a moment and try again.',
      reason: 'notion_rate_limited',
      upstreamStatus: 429,
      upstreamCode: 'rate_limited',
      retryAfter
    })
  );

export let requestWithNotionRateLimitRetry = async <T>(
  request: () => Promise<HttpResponse<T>>,
  wait: Sleep = sleep
): Promise<T> => {
  let retryNumber = 0;

  while (true) {
    let response = await request();
    if (response.status !== 429) return response.data;

    let retryAfter = getResponseHeaderValue(response.headers, 'retry-after');
    let retryDelay = getNotionRetryAfterMs(response.headers, retryNumber);
    if (retryNumber >= MAX_RATE_LIMIT_RETRIES || retryDelay > MAX_RETRY_WAIT_MS)
      throw notionRateLimitError(retryAfter);

    await wait(retryDelay);
    retryNumber += 1;
  }
};
