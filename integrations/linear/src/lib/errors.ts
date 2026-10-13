import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  API_ERROR_MAX_DETAILS,
  type ApiErrorResponse,
  buildApiServiceError,
  createApiServiceError,
  isApiErrorRecord as isRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';

// Linear error fields are strings; numeric values are not shown as details.
let readText = (value: unknown) => readApiErrorText(value, { includeNumbers: false });

let pushDetail = (details: string[], value: unknown) =>
  pushBoundedApiErrorDetail(details, value, { includeNumbers: false });

// Linear GraphQL errors look like
// { errors: [{ message, extensions: { code, userPresentableMessage } }] }.
let collectGraphQLErrorDetails = (errors: unknown, details: string[]) => {
  if (!Array.isArray(errors)) return;

  for (let item of errors) {
    if (!isRecord(item)) {
      pushDetail(details, item);
      continue;
    }

    pushDetail(details, item.message);
    pushDetail(details, item.userPresentableMessage);
    if (isRecord(item.extensions)) {
      pushDetail(details, item.extensions.userPresentableMessage);
    }
  }
};

let extractLinearDataMessage = (data: unknown) => {
  let details: string[] = [];

  if (typeof data === 'string') {
    pushDetail(details, data);
  } else if (isRecord(data)) {
    collectGraphQLErrorDetails(data.errors, details);
    pushDetail(details, data.message);
    if (isRecord(data.error)) {
      pushDetail(details, data.error.message);
    } else {
      pushDetail(details, data.error);
    }
    pushDetail(details, data.error_description);
  }

  return details.length > 0 ? truncateApiErrorMessage(details.join(' - ')) : undefined;
};

let extractGraphQLErrorCode = (data: unknown) => {
  if (!isRecord(data) || !Array.isArray(data.errors)) return undefined;

  for (let item of data.errors) {
    if (!isRecord(item)) continue;
    let code =
      readText(item.code) ??
      (isRecord(item.extensions) ? readText(item.extensions.code) : undefined);
    if (code) return code;
  }

  return undefined;
};

// createAxios stores this flattened body in SlateError baggage. Lift
// errors[].extensions.code and userPresentableMessage onto each error item and
// cap the list so the baggage keeps a small, flat shape the extractors read.
export let flattenLinearErrorResponse = (data: unknown) => {
  if (!isRecord(data) || !Array.isArray(data.errors)) return data;

  return {
    ...data,
    errors: data.errors.slice(0, API_ERROR_MAX_DETAILS).map(item => {
      if (!isRecord(item)) return item;
      let extensions = isRecord(item.extensions) ? item.extensions : undefined;
      return {
        message: item.message,
        code: extensions?.code,
        userPresentableMessage: extensions?.userPresentableMessage
      };
    })
  };
};

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtmlErrorBody(message)) return truncateApiErrorMessage(message);
  if (response?.statusText) return response.statusText;
  return message ? 'Linear returned an unexpected non-JSON error response.' : 'Unknown error';
};

export let linearServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

// GraphQL errors returned alongside an HTTP 2xx response.
export let linearGraphQLError = (data: unknown) =>
  createApiServiceError(
    `Linear API request failed: ${extractLinearDataMessage(data) ?? 'Unknown GraphQL error'}`,
    {
      reason: 'linear_api_error',
      upstreamCode: extractGraphQLErrorCode(data)
    }
  );

export let linearApiError = (error: unknown) => {
  let response: ApiErrorResponse | undefined;

  return buildApiServiceError(error, {
    providerLabel: 'Linear',
    reason: 'linear_api_error',
    extractResponse: (input, helpers) => {
      response = helpers.getResponseWithBody(input);
      return response;
    },
    extractMessage: input =>
      extractLinearDataMessage(response?.data) ?? fallbackMessageFor(input, response),
    extractUpstreamCode: (_input, extractedResponse) =>
      extractGraphQLErrorCode(extractedResponse?.data)
  });
};
