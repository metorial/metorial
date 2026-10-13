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

let pushDetail = (details: string[], value: unknown, field?: string) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let text = String(value).trim();
  if (!text || looksLikeHtml(text)) return;

  let detail = field ? `${field}: ${text}` : text;
  if (!details.includes(detail)) {
    details.push(detail);
  }
};

// Jira REST errors look like { errorMessages: string[], errors: { field: message } };
// Atlassian gateway/OAuth errors use message, error, and error_description.
let extractJiraDataMessage = (data: unknown) => {
  let details: string[] = [];

  if (typeof data === 'string') {
    pushDetail(details, data);
  } else if (isRecord(data)) {
    pushDetail(details, data.message);
    if (isRecord(data.error)) {
      pushDetail(details, data.error.message);
    } else {
      pushDetail(details, data.error);
    }
    pushDetail(details, data.error_description);

    if (Array.isArray(data.errorMessages)) {
      for (let message of data.errorMessages) {
        pushDetail(details, message);
      }
    }

    if (isRecord(data.errors)) {
      for (let [field, message] of Object.entries(data.errors)) {
        pushDetail(details, message, field);
      }
    } else if (Array.isArray(data.errors)) {
      for (let item of data.errors) {
        pushDetail(details, isRecord(item) ? item.message : item);
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
  return message ? 'Jira returned an unexpected non-JSON error response.' : 'Unknown error';
};

let scopeMismatchHint = (status: unknown, message: string) =>
  (status === 401 || status === 403) && /scope does not match/i.test(message)
    ? ' (reconnect the Jira account and grant all requested permissions)'
    : '';

export let jiraServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let resolveJiraIssueIdOrKey = (input: {
  issueIdOrKey?: string;
  issueKeyOrId?: string;
  issueKey?: string;
  issue_key?: string;
}) => {
  let issueIdOrKey =
    input.issueIdOrKey ?? input.issueKeyOrId ?? input.issueKey ?? input.issue_key;

  if (issueIdOrKey === undefined) {
    throw jiraServiceError(
      'Provide the issue key or ID in issueIdOrKey. The legacy issueKeyOrId, issueKey, and issue_key aliases are also accepted.'
    );
  }

  return issueIdOrKey;
};

export let jiraApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Jira',
    operation,
    reason: 'jira_api_error',
    extractResponse: (input, helpers) =>
      withSlateErrorResponseData(input, helpers.getResponse(input)),
    extractMessage: (input, helpers) => {
      let response = withSlateErrorResponseData(input, helpers.getResponse(input));
      return extractJiraDataMessage(response?.data) ?? fallbackMessageFor(input, response);
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
