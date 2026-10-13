import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  extractApiErrorMessage,
  isApiErrorRecord as isRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  truncateApiErrorMessage
} from '@slates/provider';

// Keeps up to the shared default number of unique text details.
let pushString = (messages: string[], value: unknown) =>
  pushBoundedApiErrorDetail(messages, value, { includeNumbers: false });

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

  return messages.length > 0 ? truncateApiErrorMessage(messages.join(' - ')) : undefined;
};

// Non-JSON bodies (such as gateway or login HTML pages) fall back to the status text
// or a short generic message instead of echoing the page.
let fallbackMessageFor = (message: string, statusText: string | undefined) =>
  looksLikeHtmlErrorBody(message)
    ? statusText || 'Confluence returned an unexpected non-JSON error response.'
    : message;

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
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return (
        extractConfluenceDataMessage(response?.data) ??
        fallbackMessageFor(extractApiErrorMessage(input, { response }), response?.statusText)
      );
    },
    formatMessage: ({
      providerLabel,
      operation: requestOperation,
      statusLabel,
      message,
      status
    }) =>
      `${providerLabel} API ${requestOperation} failed: ${statusLabel}${message}${scopeMismatchHint(status, message)}`
  });
