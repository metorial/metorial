import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError } from '@slates/provider';

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let pushDetail = (details: string[], value: unknown) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  if (typeof value !== 'string') return;

  let text = value.trim();
  if (!text || looksLikeHtml(text) || details.includes(text)) return;

  details.push(text);
};

// Pipedrive errors look like { success: false, error, error_info, data, additional_data };
// OAuth and gateway errors use message, error, or error_description.
let extractPipedriveDataMessage = (data: unknown) => {
  let details: string[] = [];

  if (typeof data === 'string') {
    pushDetail(details, data);
  } else if (isRecord(data)) {
    if (isRecord(data.error)) {
      pushDetail(details, data.error.message);
    } else {
      pushDetail(details, data.error);
    }
    pushDetail(details, data.message);
    pushDetail(details, data.error_description);
    pushDetail(details, data.error_info);

    if (Array.isArray(data.errors)) {
      for (let item of data.errors) {
        if (isRecord(item)) {
          pushDetail(details, item.message);
          pushDetail(details, item.error);
        } else {
          pushDetail(details, item);
        }
      }
    }
  }

  return details.length > 0 ? truncate(details.join(' - ')) : undefined;
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

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtml(message)) return truncate(message);
  if (response?.statusText) return response.statusText;
  return message
    ? 'Pipedrive returned an unexpected non-JSON error response.'
    : 'Unknown error';
};

export let pipedriveServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let pipedriveApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Pipedrive',
    operation,
    reason: 'pipedrive_api_error',
    extractResponse: (input, helpers) =>
      withSlateErrorResponseData(input, helpers.getResponse(input)),
    extractMessage: (input, helpers) => {
      let response = withSlateErrorResponseData(input, helpers.getResponse(input));
      return (
        extractPipedriveDataMessage(response?.data) ?? fallbackMessageFor(input, response)
      );
    }
  });
