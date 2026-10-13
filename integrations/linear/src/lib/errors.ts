import { badRequestError, ServiceError } from '@lowerdeck/error';
import { type ApiErrorResponse, buildApiServiceError, createApiServiceError } from 'slates';

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;
let TRUNCATED_PLACEHOLDER = '[truncated]';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let readText = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  let text = value.trim();
  if (!text || text === TRUNCATED_PLACEHOLDER || looksLikeHtml(text)) return undefined;
  return text;
};

let pushDetail = (details: string[], value: unknown) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  let text = readText(value);
  if (text && !details.includes(text)) {
    details.push(text);
  }
};

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

  return details.length > 0 ? truncate(details.join(' - ')) : undefined;
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

// createAxios stores the failed response body in SlateError baggage, but its
// sanitizer truncates values nested 4+ levels deep, which drops
// errors[].extensions.code and userPresentableMessage. Lift those fields onto
// each error item so they survive into the baggage.
export let flattenLinearErrorResponse = (data: unknown) => {
  if (!isRecord(data) || !Array.isArray(data.errors)) return data;

  return {
    ...data,
    errors: data.errors.slice(0, MAX_ERROR_DETAILS).map(item => {
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
      response = withSlateErrorResponseData(input, helpers.getResponse(input));
      return response;
    },
    extractMessage: input =>
      extractLinearDataMessage(response?.data) ?? fallbackMessageFor(input, response),
    extractUpstreamCode: (_input, extractedResponse) =>
      extractGraphQLErrorCode(extractedResponse?.data)
  });
};
