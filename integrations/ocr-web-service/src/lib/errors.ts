import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return;
  }

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) {
    details.push(detail);
  }
};

let collectDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  for (let key of [
    'ErrorMessage',
    'OCRErrorMessage',
    'message',
    'error',
    'error_description',
    'code',
    'status'
  ]) {
    addDetail(details, value[key]);
  }

  collectDetails(value.error, details);
  collectDetails(value.details, details);
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let getErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = getErrorResponse(error);
  let data = isRecord(error.data) ? error.data : undefined;

  return response?.status ?? error.status ?? data?.status;
};

let extractOcrWebServiceMessage = (error: unknown) => {
  let response = getErrorResponse(error);
  let data = response?.data ?? (isRecord(error) ? error.data : undefined);
  let details: string[] = [];

  collectDetails(data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let ocrWebServiceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let ocrWebServiceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = getErrorResponse(error);
  let status = getErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = ocrWebServiceServiceError(
    `OCR Web Service API ${operation} failed: ${statusLabel}${extractOcrWebServiceMessage(error)}`
  );
  serviceError.data.reason = 'ocr_web_service_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
