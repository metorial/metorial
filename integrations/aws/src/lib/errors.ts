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

let extractAwsMessage = (error: unknown) => {
  let messages: string[] = [];
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;

  if (isRecord(error)) {
    for (let key of ['message', 'Message', 'name', 'Code', 'code', '__type']) {
      pushString(messages, error[key]);
    }
  }

  if (isRecord(data)) {
    for (let key of ['message', 'Message', 'error', 'Error', 'code', 'Code', '__type']) {
      pushString(messages, data[key]);
    }
  } else if (typeof data === 'string') {
    pushString(messages, data);
  }

  if (error instanceof Error && error.message) {
    pushString(messages, error.message);
  }

  return messages.length > 0 ? [...new Set(messages)].join(' - ') : 'Unknown error';
};

export let awsServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let awsApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let metadata = isRecord(error)
    ? (error.$metadata as Record<string, unknown> | undefined)
    : undefined;
  let status =
    (typeof metadata?.httpStatusCode === 'number' ? metadata.httpStatusCode : undefined) ??
    response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = awsServiceError(
    `AWS API ${operation} failed: ${statusLabel}${extractAwsMessage(error)}`
  );

  serviceError.data.reason = 'aws_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
