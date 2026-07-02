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

let extractLambdaMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    for (let key of [
      'message',
      'Message',
      'error',
      'Error',
      'code',
      'Code',
      '__type',
      'Type'
    ]) {
      pushString(messages, data[key]);
    }
  } else {
    pushString(messages, data);
  }

  if (messages.length > 0) {
    return [...new Set(messages)].join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let extractLambdaStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let metadata = isRecord(error.$metadata) ? error.$metadata : undefined;
  let status =
    response?.status ?? metadata?.httpStatusCode ?? error.statusCode ?? error.status;
  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

let extractLambdaCode = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  if (typeof error.Code === 'string') return error.Code;
  if (typeof error.code === 'string' && !error.code.startsWith('upstream.')) {
    return error.code;
  }
  if (typeof error.name === 'string' && error.name !== 'Error') return error.name;
  return undefined;
};

export let lambdaServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let lambdaApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = extractLambdaStatus(error);
  let code = extractLambdaCode(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let codeLabel = code ? `${code} - ` : '';
  let serviceError = lambdaServiceError(
    `AWS Lambda API ${operation} failed: ${statusLabel}${codeLabel}${extractLambdaMessage(error)}`
  );

  serviceError.data.reason = 'aws_lambda_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = code;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
