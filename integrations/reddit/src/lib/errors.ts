import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let collectRedditMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    return;
  }

  for (let key of ['message', 'error_description', 'reason', 'explanation']) {
    let item = value[key];
    if (typeof item === 'string' && item.trim()) {
      messages.push(item.trim());
    }
  }

  let error = value.error;
  if (typeof error === 'string' && error.trim()) {
    messages.push(error.trim());
  }

  let json = value.json;
  if (isRecord(json)) {
    collectRedditMessages(json, messages);

    let errors = json.errors;
    if (Array.isArray(errors)) {
      for (let item of errors) {
        if (Array.isArray(item)) {
          let [code, message, field] = item;
          let parts = [code, message, field]
            .filter(part => typeof part === 'string' && part.trim())
            .map(String);
          if (parts.length > 0) {
            messages.push(parts.join(': '));
          }
        } else if (isRecord(item)) {
          collectRedditMessages(item, messages);
        }
      }
    }
  }
};

let extractRedditMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (typeof data === 'string' && data.trim()) {
    messages.push(data.trim());
  } else {
    collectRedditMessages(data, messages);
  }

  let uniqueMessages = [...new Set(messages)];
  if (uniqueMessages.length > 0) {
    return uniqueMessages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let extractRedditDataMessage = (data: unknown) => {
  let messages: string[] = [];
  collectRedditMessages(data, messages);

  let uniqueMessages = [...new Set(messages)];
  return uniqueMessages.length > 0 ? uniqueMessages.join(' - ') : 'Unknown error';
};

let hasRedditJsonErrors = (data: unknown) => {
  if (!isRecord(data)) return false;

  let errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) return true;

  let json = data.json;
  if (!isRecord(json)) return false;

  let jsonErrors = json.errors;
  return Array.isArray(jsonErrors) && jsonErrors.length > 0;
};

export let redditServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let assertNoRedditJsonErrors = (data: unknown, operation = 'request') => {
  if (!hasRedditJsonErrors(data)) return;

  let serviceError = redditServiceError(
    `Reddit API ${operation} failed: ${extractRedditDataMessage(data)}`
  );
  serviceError.data.reason = 'reddit_api_error';
  throw serviceError;
};

export let redditApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = redditServiceError(
    `Reddit API ${operation} failed: ${statusLabel}${extractRedditMessage(error)}`
  );

  serviceError.data.reason = 'reddit_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireRedditInput = (value: unknown, message: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw redditServiceError(message);
  }

  return value;
};

export let requireRedditArrayInput = (value: unknown, message: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw redditServiceError(message);
  }

  return value;
};
