import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let extractSqsMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'Message', 'error', 'Error', 'code', 'Code', '__type']) {
      pushString(messages, data[key]);
    }
  } else {
    pushString(messages, data);
  }

  if (isRecord(error)) {
    for (let key of ['message', 'Message', 'name', 'Code', 'code', '__type']) {
      pushString(messages, error[key]);
    }
  }

  if (error instanceof Error) {
    pushString(messages, error.message);
  }

  return messages.length > 0 ? [...new Set(messages)].join(' - ') : 'Unknown error';
};

let extractSqsStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let metadata = isRecord(error.$metadata) ? error.$metadata : undefined;
  let status =
    response?.status ?? metadata?.httpStatusCode ?? error.statusCode ?? error.status;

  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

let extractSqsCode = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  if (typeof error.Code === 'string') return error.Code;
  if (typeof error.code === 'string' && !error.code.startsWith('upstream.')) {
    return error.code;
  }
  if (typeof error.name === 'string' && error.name !== 'Error') return error.name;

  let response = error.response as ErrorResponse | undefined;
  let data = response?.data;
  if (isRecord(data)) {
    if (typeof data.Code === 'string') return data.Code;
    if (typeof data.code === 'string') return data.code;
    if (typeof data.__type === 'string') return data.__type.split('#').at(-1);
  }

  return undefined;
};

export let sqsServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let sqsApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = extractSqsStatus(error);
  let code = extractSqsCode(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let codeLabel = code ? `${code} - ` : '';
  let serviceError = sqsServiceError(
    `Amazon SQS API ${operation} failed: ${statusLabel}${codeLabel}${extractSqsMessage(error)}`
  );

  serviceError.data.reason = 'aws_sqs_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = code;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
