import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    messages.push(value.trim());
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error_description', 'error', 'detail']) {
    addMessage(messages, value[key]);
  }

  let nestedError = value.error;
  if (isRecord(nestedError)) {
    collectMessages(nestedError, messages);
  }

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let item of errors) {
      collectMessages(item, messages);
    }
  }
};

let extractBitbucketMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  let uniqueMessages = [...new Set(messages)];
  if (uniqueMessages.length > 0) {
    return uniqueMessages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let bitbucketServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let bitbucketApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = bitbucketServiceError(
    `Bitbucket API ${operation} failed: ${statusLabel}${extractBitbucketMessage(error)}`
  );

  serviceError.data.reason = 'bitbucket_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
