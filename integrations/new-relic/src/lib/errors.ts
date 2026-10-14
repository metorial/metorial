import {
  API_ERROR_MAX_DETAILS,
  API_ERROR_TRUNCATED_PLACEHOLDER,
  type ApiErrorResponse,
  buildApiServiceError,
  createApiServiceError,
  isApiErrorRecord as isRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail,
  readApiErrorText,
  truncateApiErrorMessage
} from 'slates';

// New Relic error fields are strings; numeric values are not shown as details.
let readText = (value: unknown) => readApiErrorText(value, { includeNumbers: false });

let pushDetail = (details: string[], value: unknown) =>
  pushBoundedApiErrorDetail(details, value, { includeNumbers: false });

let readPath = (value: unknown) => {
  if (Array.isArray(value)) {
    let parts = value.filter(
      part =>
        (typeof part === 'string' && part !== API_ERROR_TRUNCATED_PLACEHOLDER) ||
        typeof part === 'number'
    );
    return parts.length > 0 ? parts.join('.') : undefined;
  }
  return readText(value);
};

let readValidationReasons = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, API_ERROR_MAX_DETAILS)
    .map(validationError =>
      readText(
        isRecord(validationError)
          ? (validationError.reason ?? validationError.message)
          : validationError
      )
    )
    .filter((reason): reason is string => reason !== undefined);
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

  return details.length > 0 ? truncateApiErrorMessage(details.join(' - ')) : undefined;
};

// createAxios stores this flattened body in SlateError baggage. Lift the useful
// errors[].extensions.* fields onto each error item and cap the list so the
// baggage keeps a small, flat shape the extractors read.
export let flattenNewRelicErrorResponse = (data: unknown) => {
  if (!isRecord(data) || !Array.isArray(data.errors)) return data;

  return {
    ...data,
    errors: data.errors.slice(0, API_ERROR_MAX_DETAILS).map(item => {
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

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtmlErrorBody(message)) return truncateApiErrorMessage(message);
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
      response = helpers.getResponseWithBody(input);
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
