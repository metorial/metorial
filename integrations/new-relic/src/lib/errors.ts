import { type ApiErrorResponse, buildApiServiceError, createApiServiceError } from 'slates';

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;
let TRUNCATED_PLACEHOLDER = '[truncated]';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let looksLikeHtml = (value: string) =>
  /^\s*<(!doctype|html|[a-z]+[\s>])/i.test(value) || /<\/?(html|body|head)\b/i.test(value);

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

let readPath = (value: unknown) => {
  if (Array.isArray(value)) {
    let parts = value.filter(
      part =>
        (typeof part === 'string' && part !== TRUNCATED_PLACEHOLDER) ||
        typeof part === 'number'
    );
    return parts.length > 0 ? parts.join('.') : undefined;
  }
  return readText(value);
};

let readValidationReasons = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ERROR_DETAILS)
    .map(validationError =>
      readText(
        isRecord(validationError)
          ? (validationError.reason ?? validationError.message)
          : validationError
      )
    )
    .filter((reason): reason is string => reason !== undefined);
};

let pushDetail = (details: string[], value: unknown) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  let text = readText(value);
  if (text && !details.includes(text)) {
    details.push(text);
  }
};

// NerdGraph errors look like
// { errors: [{ message, extensions: { errorClass, errorCode, argumentPath } }] }.
// Items lifted by flattenNewRelicErrorResponse carry those fields at the top level.
let collectGraphqlErrorDetails = (errors: unknown[], details: string[]) => {
  for (let item of errors) {
    if (!isRecord(item)) {
      pushDetail(details, item);
      continue;
    }

    let extensions = isRecord(item.extensions) ? item.extensions : {};
    pushDetail(details, item.message);
    pushDetail(details, item.description);
    let validationErrors = item.validationErrors ?? extensions.validationErrors;
    if (typeof validationErrors === 'string') {
      pushDetail(details, validationErrors);
    } else {
      for (let reason of readValidationReasons(validationErrors)) {
        pushDetail(details, reason);
      }
    }
    let argumentPath = readPath(item.argumentPath ?? extensions.argumentPath);
    if (argumentPath) pushDetail(details, `argument: ${argumentPath}`);
    pushDetail(details, item.errorCode ?? extensions.errorCode);
    pushDetail(details, item.errorClass ?? extensions.errorClass);
    pushDetail(details, item.type);
  }
};

let extractNewRelicDataMessage = (data: unknown) => {
  let details: string[] = [];

  if (Array.isArray(data)) {
    collectGraphqlErrorDetails(data, details);
  } else if (typeof data === 'string') {
    pushDetail(details, data);
  } else if (isRecord(data)) {
    if (Array.isArray(data.errors)) {
      collectGraphqlErrorDetails(data.errors, details);
    }
    pushDetail(details, data.message);
    if (isRecord(data.error)) {
      pushDetail(details, data.error.message);
    } else {
      pushDetail(details, data.error);
    }
    pushDetail(details, data.error_description);
    pushDetail(details, data.description);
    pushDetail(details, data.details);
  }

  return details.length > 0 ? truncate(details.join(' - ')) : undefined;
};

// createAxios stores the failed response body in SlateError baggage, but its
// sanitizer truncates values nested 4+ levels deep, which drops
// errors[].extensions.*. Lift the useful fields onto each error item so they
// survive into the baggage.
export let flattenNewRelicErrorResponse = (data: unknown) => {
  if (!isRecord(data) || !Array.isArray(data.errors)) return data;

  return {
    ...data,
    errors: data.errors.slice(0, MAX_ERROR_DETAILS).map(item => {
      if (!isRecord(item)) return item;
      let { extensions: rawExtensions, ...rest } = item;
      let extensions = isRecord(rawExtensions) ? rawExtensions : {};
      let validationReasons = readValidationReasons(extensions.validationErrors);
      return {
        ...rest,
        errorCode: extensions.errorCode,
        errorClass: extensions.errorClass,
        argumentPath: readPath(extensions.argumentPath),
        validationErrors:
          validationReasons.length > 0 ? validationReasons.join('; ') : undefined
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
  return message
    ? 'New Relic returned an unexpected non-JSON error response.'
    : 'Unknown error';
};

export let newRelicApiError = (error: unknown, operation = 'request') => {
  let response: ApiErrorResponse | undefined;

  return buildApiServiceError(error, {
    providerLabel: 'New Relic',
    operation,
    reason: 'new_relic_api_error',
    extractResponse: (input, helpers) => {
      response = withSlateErrorResponseData(input, helpers.getResponse(input));
      return response;
    },
    extractMessage: input =>
      extractNewRelicDataMessage(response?.data) ?? fallbackMessageFor(input, response),
    formatMessage: ({ operation: apiOperation, statusLabel, message }) =>
      `New Relic ${apiOperation} failed: ${statusLabel}${message}`
  });
};

export let newRelicGraphqlErrors = (operation: string, errors: unknown[]) =>
  createApiServiceError(
    `New Relic ${operation} failed: ${extractNewRelicDataMessage(errors) ?? 'Unknown GraphQL error'}`,
    {
      reason: 'new_relic_graphql_error'
    }
  );
