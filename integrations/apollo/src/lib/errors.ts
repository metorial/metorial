import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim() && !messages.includes(value.trim())) {
    messages.push(value.trim());
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushString(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'error_description', 'detail', 'title']) {
    pushString(messages, value[key]);
  }

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let item of errors) {
      collectMessages(item, messages);
    }
  }
};

let extractApolloMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (data !== undefined) {
    collectMessages(data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.status ?? (typeof error.status === 'number' ? error.status : undefined);
};

let getErrorStatusText = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.statusText;
};

export let apolloServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let apolloApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = apolloServiceError(
    `Apollo API ${operation} failed: ${statusLabel}${extractApolloMessage(error)}`
  );

  serviceError.data.reason = 'apollo_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let apolloOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = apolloServiceError(
    `Apollo OAuth ${operation} failed: ${extractApolloMessage(error)}`
  );
  let status = getErrorStatus(error);
  serviceError.data.reason = 'apollo_oauth_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
