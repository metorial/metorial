import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorResponse,
  createApiServiceError,
  decodeApiErrorBody,
  getApiErrorResponseWithBody,
  isApiErrorRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  statusLabelForApiError,
  truncateApiErrorMessage
} from 'slates';

let addMessage = (messages: string[], value: unknown) =>
  pushBoundedApiErrorDetail(messages, value, { includeNumbers: false });

// SSB PxWebApi v2 errors are RFC 7807-style bodies, for example
// { type: "Parameter error", title: "Non-existent value", status: 400 }.
let collectMessages = (value: unknown, messages: string[]) => {
  if (!isApiErrorRecord(value)) {
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

let extractMessage = (error: unknown, response: ApiErrorResponse | undefined) => {
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (messages.length === 0 && isApiErrorRecord(error) && isApiErrorRecord(error.data)) {
    addMessage(messages, error.data.message);
  }

  if (messages.length > 0) {
    return truncateApiErrorMessage(messages.join(' - '));
  }

  if (error instanceof Error && error.message) {
    return looksLikeHtmlErrorBody(error.message)
      ? 'SSB returned an unexpected non-JSON error response.'
      : truncateApiErrorMessage(error.message);
  }

  return 'Unknown error';
};

// csv/html/px requests use responseType=text and xlsx uses arraybuffer, so SSB's JSON
// error bodies arrive as strings or binary buffers. Decode them before SlateError
// sanitizes the body into baggage, so the upstream reason stays readable.
export let decodeSsbErrorBody = (data: unknown): unknown => {
  let decoded = decodeApiErrorBody(data);
  return typeof decoded === 'string' ? truncateApiErrorMessage(decoded) : decoded;
};

export let ssbServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let ssbApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  // createAxios converts upstream failures into SlateError before this mapper runs,
  // so the HTTP status lives in data.upstream.status / data.status and the raw
  // response body only survives in data.baggage.response.
  let response = getApiErrorResponseWithBody(error);
  let status =
    response?.status ??
    (isApiErrorRecord(error) && typeof error.status === 'number' ? error.status : undefined);

  return createApiServiceError(
    `SSB PxWeb API ${operation} failed: ${statusLabelForApiError(status, response?.statusText)}${extractMessage(error, response)}`,
    { reason: 'ssb_api_error', upstreamStatus: status, parent: error }
  );
};
