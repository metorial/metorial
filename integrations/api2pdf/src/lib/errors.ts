import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) details.push(detail);
};

let collectDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) collectDetails(item, details);
    return;
  }

  if (!isRecord(value)) {
    pushDetail(details, value);
    return;
  }

  pushDetail(details, value.message);
  pushDetail(details, value.Message);
  pushDetail(details, value.error);
  pushDetail(details, value.Error);
  pushDetail(details, value.detail);
  pushDetail(details, value.title);
  pushDetail(details, value.code);
  collectDetails(value.errors, details);
};

let extractApi2PdfMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);

  if (details.length > 0) return details.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

let upstreamCodeFor = (response?: ErrorResponse) => {
  if (!isRecord(response?.data)) return undefined;

  let code = response.data.code ?? response.data.error ?? response.data.Error;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
};

export let api2PdfServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let api2PdfApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = api2PdfServiceError(
    `API2PDF API ${operation} failed: ${statusLabelFor(response)}${extractApi2PdfMessage(error)}`
  );
  serviceError.data.reason = 'api2pdf_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) serviceError.setParent(error);

  return serviceError;
};
