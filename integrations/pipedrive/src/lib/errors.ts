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

let extractPipedriveMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of ['error', 'error_info', 'error_description', 'message']) {
      pushString(messages, data[key]);
    }

    let errors = data.errors;
    if (Array.isArray(errors)) {
      for (let item of errors) {
        if (isRecord(item)) {
          pushString(messages, item.message);
          pushString(messages, item.error);
        } else {
          pushString(messages, item);
        }
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

export let pipedriveServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let pipedriveApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = pipedriveServiceError(
    `Pipedrive API ${operation} failed: ${statusLabel}${extractPipedriveMessage(error)}`
  );
  serviceError.data.reason = 'pipedrive_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
