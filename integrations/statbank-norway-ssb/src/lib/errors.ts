import { Buffer } from 'node:buffer';
import { badRequestError, ServiceError } from '@lowerdeck/error';

const MAX_ERROR_DETAILS = 5;
const MAX_ERROR_MESSAGE_LENGTH = 1_000;

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string' || messages.length >= MAX_ERROR_DETAILS) return;

  let trimmed = value.trim();
  if (trimmed && !looksLikeHtml(trimmed) && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

// SSB PxWebApi v2 errors are RFC 7807-style bodies, for example
// { type: "Parameter error", title: "Non-existent value", status: 400 }.
let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['title', 'detail', 'message', 'error', 'description', 'type']) {
    addMessage(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let item of value.errors) {
      collectMessages(item, messages);
    }
  }
};

let numberOrUndefined = (value: unknown) => (typeof value === 'number' ? value : undefined);

// createAxios converts upstream failures into SlateError before this mapper runs,
// so the HTTP status lives in data.status / data.upstream.status and the raw
// response body only survives in data.baggage.response.
let getUpstreamResponse = (error: unknown): ErrorResponse | undefined => {
  if (!isRecord(error)) return undefined;

  let response = isRecord(error.response) ? (error.response as ErrorResponse) : undefined;
  if (response?.data !== undefined) return response;

  let data = isRecord(error.data) ? error.data : undefined;
  let upstream = data && isRecord(data.upstream) ? data.upstream : undefined;
  let baggage = data && isRecord(data.baggage) ? data.baggage : undefined;

  let status =
    response?.status ??
    numberOrUndefined(upstream?.status) ??
    numberOrUndefined(data?.status) ??
    numberOrUndefined(error.status);

  if (status === undefined && baggage?.response === undefined) return response;

  return {
    ...response,
    status,
    data: baggage?.response
  };
};

let extractMessage = (error: unknown, response: ErrorResponse | undefined) => {
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (messages.length === 0 && isRecord(error) && isRecord(error.data)) {
    addMessage(messages, error.data.message);
  }

  if (messages.length > 0) {
    return truncate(messages.join(' - '));
  }

  if (error instanceof Error && error.message) {
    return looksLikeHtml(error.message)
      ? 'SSB returned an unexpected non-JSON error response.'
      : truncate(error.message);
  }

  return 'Unknown error';
};

// csv/html/px requests use responseType=text and xlsx uses arraybuffer, so SSB's JSON
// error bodies arrive as strings or binary buffers. Decode them before SlateError
// sanitizes the body into baggage, so the upstream reason stays readable.
export let decodeSsbErrorBody = (data: unknown): unknown => {
  let text: string | undefined;

  if (typeof data === 'string') {
    text = data;
  } else if (data instanceof ArrayBuffer) {
    text = Buffer.from(data).toString('utf8');
  } else if (ArrayBuffer.isView(data)) {
    text = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  } else {
    return data;
  }

  let trimmed = text.trim();
  if (/^[{[]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to the bounded raw text.
    }
  }

  return truncate(trimmed);
};

export let ssbServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let ssbApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = getUpstreamResponse(error);
  let status = response?.status;
  let statusText = response?.statusText;
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

  let serviceError = ssbServiceError(
    `SSB PxWeb API ${operation} failed: ${statusLabel}${extractMessage(error, response)}`
  );

  serviceError.data.reason = 'ssb_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
