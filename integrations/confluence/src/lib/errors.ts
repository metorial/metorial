import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError } from '@slates/provider';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;
  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let pushAtlassianErrorMessages = (messages: string[], value: unknown) => {
  if (!Array.isArray(value)) return;

  for (let error of value) {
    if (typeof error === 'string') {
      pushString(messages, error);
      continue;
    }
    if (!isRecord(error)) continue;

    pushString(messages, error.message);
    if (isRecord(error.message)) {
      pushString(messages, error.message.translation);
    }

    // Confluence v2 API errors: { errors: [{ status, code, title, detail }] }
    pushString(messages, error.title);
    pushString(messages, error.detail);
  }
};

let extractConfluenceDataMessage = (data: unknown) => {
  let messages: string[] = [];

  if (isRecord(data)) {
    pushString(messages, data.message);
    pushString(messages, data.error);
    pushString(messages, data.error_description);
    pushString(messages, data.statusText);

    if (isRecord(data.data)) {
      pushAtlassianErrorMessages(messages, data.data.errors);
    }

    pushAtlassianErrorMessages(messages, data.errors);
  } else {
    pushString(messages, data);
  }

  return messages.length > 0 ? messages.join(' - ') : undefined;
};

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

let scopeMismatchHint = (status: unknown, message: string) =>
  (status === 401 || status === 403) && /scope does not match/i.test(message)
    ? ' (reconnect the Confluence account and grant all requested permissions)'
    : '';

export let confluenceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let confluenceApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Confluence',
    operation,
    reason: 'confluence_api_error',
    extractResponse: (input, helpers) =>
      withSlateErrorResponseData(input, helpers.getResponse(input)),
    extractMessage: (input, helpers) =>
      extractConfluenceDataMessage(
        withSlateErrorResponseData(input, helpers.getResponse(input))?.data
      ),
    formatMessage: ({
      providerLabel,
      operation: requestOperation,
      statusLabel,
      message,
      status
    }) =>
      `${providerLabel} API ${requestOperation} failed: ${statusLabel}${message}${scopeMismatchHint(status, message)}`
  });
