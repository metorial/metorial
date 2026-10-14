import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorResponse,
  createApiServiceError,
  getApiErrorResponseWithBody,
  isApiErrorRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  statusLabelForApiError,
  truncateApiErrorMessage
} from 'slates';

let addMessage = (messages: string[], value: unknown) =>
  pushBoundedApiErrorDetail(messages, value, { includeNumbers: false });

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isApiErrorRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'detail', 'description', 'title']) {
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

  // createAxios rejects with a SlateError that keeps the upstream body
  // (for example SDMX { errors: [{ code, message }] }) in data.baggage.response.
  collectMessages(response?.data, messages);
  if (isApiErrorRecord(error)) {
    collectMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return truncateApiErrorMessage(messages.join(' - '));
  }

  if (error instanceof Error && error.message) {
    let message = error.message.trim();
    if (looksLikeHtmlErrorBody(message)) {
      return response?.statusText || 'upstream returned an HTML error page';
    }

    return truncateApiErrorMessage(message);
  }

  return 'Unknown error';
};

export let norgesBankServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let norgesBankApiError = (error: unknown, operation = 'request') => {
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
    `Norges Bank API ${operation} failed: ${statusLabelForApiError(status, response?.statusText)}${extractMessage(error, response)}`,
    { reason: 'norges_bank_api_error', upstreamStatus: status, parent: error }
  );
};
