import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  extractApiErrorMessage,
  isApiErrorRecord as isRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  truncateApiErrorMessage
} from 'slates';

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let getSlateErrorData = (error: unknown) =>
  isRecord(error) && error.name === 'SlateError' && isRecord(error.data)
    ? error.data
    : undefined;

let pushDetail = (details: string[], value: unknown) =>
  pushBoundedApiErrorDetail(details, value, { includeNumbers: false });

// HubSpot error bodies carry a machine-readable `category` (VALIDATION_ERROR,
// OBJECT_NOT_FOUND, RATE_LIMITS) and, for OAuth, a specific `status`
// (BAD_REFRESH_TOKEN, BAD_AUTH_CODE); generic API errors use status "error".
let extractHubSpotCode = (data: unknown) => {
  if (!isRecord(data)) return undefined;

  let category = stringValue(data.category)?.trim();
  if (category) return category;

  let status = stringValue(data.status)?.trim();
  return status && status.toLowerCase() !== 'error' ? status : undefined;
};

let extractHubSpotDetails = (data: unknown) => {
  let details: string[] = [];

  if (isRecord(data)) {
    pushDetail(details, data.message);

    if (Array.isArray(data.errors)) {
      for (let item of data.errors) {
        pushDetail(details, isRecord(item) ? item.message : item);
      }
    }

    if (details.length === 0) {
      for (let key of ['error_description', 'error']) {
        pushDetail(details, data[key]);
      }
    }
  } else {
    pushDetail(details, data);
  }

  let code = extractHubSpotCode(data);
  if (details.length === 0) return code;

  let message = truncateApiErrorMessage(details.join(' - '));

  return code && !message.includes(code) ? `${message} - ${code}` : message;
};

// Non-JSON bodies (such as gateway or login HTML pages) fall back to the status text
// or a short generic message instead of echoing the page.
let fallbackMessageFor = (message: string, statusText: string | undefined) =>
  looksLikeHtmlErrorBody(message)
    ? statusText || 'HubSpot returned an unexpected non-JSON error response.'
    : truncateApiErrorMessage(message);

let inferOperation = (error: unknown) => {
  let upstream = getSlateErrorData(error)?.upstream;
  let config = isRecord(error) && isRecord(error.config) ? error.config : undefined;
  let source = isRecord(upstream) ? upstream : config;

  let method = stringValue(source?.method)?.toUpperCase();
  let url = stringValue(source?.url);
  if (url) {
    try {
      url = new URL(url, 'https://api.hubapi.com').pathname;
    } catch {
      // Keep the raw URL when it cannot be parsed.
    }
  }

  return [method, url].filter(Boolean).join(' ') || 'request';
};

let buildHubSpotError = (
  error: unknown,
  operation: string,
  formatMessage: (statusLabel: string, message: string) => string
) =>
  buildApiServiceError(error, {
    providerLabel: 'HubSpot',
    operation,
    reason: 'hubspot_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return (
        extractHubSpotDetails(response?.data) ??
        fallbackMessageFor(extractApiErrorMessage(input, { response }), response?.statusText)
      );
    },
    extractUpstreamCode: (_input, response) => extractHubSpotCode(response?.data),
    formatMessage: ({ statusLabel, message }) => formatMessage(statusLabel, message)
  });

export let hubSpotServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let hubSpotOAuthError = (operation: string, error: unknown) =>
  buildHubSpotError(
    error,
    operation,
    (statusLabel, message) => `HubSpot OAuth ${operation} failed: ${statusLabel}${message}`
  );

export let hubSpotApiError = (error: unknown, operation?: string) => {
  let label = operation ?? inferOperation(error);
  return buildHubSpotError(
    error,
    label,
    (statusLabel, message) => `HubSpot API ${label} failed: ${statusLabel}${message}`
  );
};
