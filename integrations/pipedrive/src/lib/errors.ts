import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorResponse,
  buildApiServiceError,
  isApiErrorRecord as isRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  truncateApiErrorMessage
} from '@slates/provider';

// Pipedrive error fields are strings; numeric values are not shown as details.
let pushDetail = (details: string[], value: unknown) =>
  pushBoundedApiErrorDetail(details, value, { includeNumbers: false });

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

  return details.length > 0 ? truncateApiErrorMessage(details.join(' - ')) : undefined;
};

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtmlErrorBody(message)) return truncateApiErrorMessage(message);
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
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return (
        extractPipedriveDataMessage(response?.data) ?? fallbackMessageFor(input, response)
      );
    }
  });
