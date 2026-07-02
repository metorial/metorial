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

let collectProblemDetails = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    return;
  }

  pushString(messages, value.detail);
  pushString(messages, value.title);
  pushString(messages, value.message);
};

let extractTwitterMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of ['detail', 'title', 'message', 'error_description', 'error']) {
      pushString(messages, data[key]);
    }

    if (Array.isArray(data.errors)) {
      for (let item of data.errors) {
        collectProblemDetails(item, messages);
      }
    }
  } else {
    pushString(messages, data);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let twitterServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let twitterApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = twitterServiceError(
    `X API ${operation} failed: ${statusLabel}${extractTwitterMessage(error)}`
  );

  serviceError.data.reason = 'twitter_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
