import { badRequestError, ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorResponse,
  buildApiServiceError,
  isApiErrorRecord as isRecord,
  looksLikeHtmlErrorBody,
  pushBoundedApiErrorDetail as pushDetail,
  truncateApiErrorMessage
} from '@slates/provider';

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
        pushDetail(details, message, { field });
      }
    } else if (Array.isArray(data.errors)) {
      for (let item of data.errors) {
        pushDetail(details, isRecord(item) ? item.message : item);
      }
    }
  }

  return details.length > 0 ? truncateApiErrorMessage(details.join(' - ')) : undefined;
};

let fallbackMessageFor = (error: unknown, response: ApiErrorResponse | undefined) => {
  let message = error instanceof Error ? error.message.trim() : '';
  if (message && !looksLikeHtmlErrorBody(message)) return truncateApiErrorMessage(message);
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

let notFoundHintFor = (status: unknown, hint: string | undefined) =>
  hint && Number(status) === 404 ? hint : '';

export let jiraApiError = (
  error: unknown,
  operation = 'request',
  options: { notFoundHint?: string } = {}
) =>
  buildApiServiceError(error, {
    providerLabel: 'Jira',
    operation,
    reason: 'jira_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    extractMessage: (input, helpers) => {
      let response = helpers.getResponseWithBody(input);
      return extractJiraDataMessage(response?.data) ?? fallbackMessageFor(input, response);
    },
    formatMessage: ({
      providerLabel,
      operation: requestOperation,
      statusLabel,
      message,
      status
    }) =>
      `${providerLabel} API ${requestOperation} failed: ${statusLabel}${message}${scopeMismatchHint(status, message)}${notFoundHintFor(status, options.notFoundHint)}`
  });
