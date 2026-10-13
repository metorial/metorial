import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorBuildHelpers,
  type ApiErrorResponse,
  buildApiServiceError
} from 'slates';

const MAX_ERROR_DETAILS = 5;
const MAX_ERROR_MESSAGE_LENGTH = 1000;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let getSlateErrorData = (error: unknown) =>
  isRecord(error) && error.name === 'SlateError' && isRecord(error.data)
    ? error.data
    : undefined;

// createAxios converts upstream failures into SlateError before this adapter
// runs, so the raw response body only survives in SlateError.data.baggage.
let getHubSpotResponse = (
  error: unknown,
  helpers: ApiErrorBuildHelpers
): ApiErrorResponse | undefined => {
  let response = helpers.getResponse(error);
  if (response?.data !== undefined) return response;

  let baggage = getSlateErrorData(error)?.baggage;
  if (!isRecord(baggage) || baggage.response === undefined) return response;

  return { ...response, data: baggage.response };
};

let pushDetail = (details: string[], value: unknown) => {
  let detail = stringValue(value)?.trim();
  if (detail && !details.includes(detail)) {
    details.push(detail);
  }
};

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

  let message = details.slice(0, MAX_ERROR_DETAILS).join(' - ');
  if (message.length > MAX_ERROR_MESSAGE_LENGTH) {
    message = `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`;
  }

  return code && !message.includes(code) ? `${message} - ${code}` : message;
};

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
    extractResponse: (input, helpers) => getHubSpotResponse(input, helpers),
    extractMessage: (input, helpers) =>
      extractHubSpotDetails(getHubSpotResponse(input, helpers)?.data),
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
