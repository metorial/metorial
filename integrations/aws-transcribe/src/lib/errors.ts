import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }

  let trimmed = value.trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let extractTranscribeMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'Message', 'error', 'Error', 'code', 'Code', '__type']) {
      addDetail(details, data[key]);
    }
  } else {
    addDetail(details, data);
  }

  if (isRecord(error)) {
    for (let key of ['message', 'Message', 'name', 'code', 'Code', '__type']) {
      addDetail(details, error[key]);
    }
  }

  if (error instanceof Error) {
    addDetail(details, error.message);
  }

  return details.length > 0 ? details.join(' - ') : 'Unknown error';
};

let extractTranscribeStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  let status = response?.status ?? error.statusCode ?? error.status;

  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

let extractTranscribeCode = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

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

export let transcribeServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let transcribeApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = extractTranscribeStatus(error);
  let code = extractTranscribeCode(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let codeLabel = code ? `${code} - ` : '';
  let serviceError = transcribeServiceError(
    `Amazon Transcribe API ${operation} failed: ${statusLabel}${codeLabel}${extractTranscribeMessage(error)}`
  );

  serviceError.data.reason = 'aws_transcribe_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = code;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
