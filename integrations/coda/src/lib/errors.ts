import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return;

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

  addDetail(details, value.message);
  addDetail(details, value.detail);
  addDetail(details, value.description);
  addDetail(details, value.error);
  addDetail(details, value.reason);
  addDetail(details, value.code);
  collectDetails(value.errors, details);
};

let extractMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let slateData = isRecord(error)
    ? (error.data as Record<string, unknown> | undefined)
    : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);
  collectDetails(slateData, details);

  if (details.length > 0) return details.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

let statusLabelFor = (status?: number, statusText?: string) =>
  status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

let getStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let data = isRecord(error.data) ? error.data : undefined;
  let upstream = isRecord(data?.upstream) ? data.upstream : undefined;
  let dataStatus = typeof data?.status === 'number' ? data.status : undefined;
  let upstreamStatus = typeof upstream?.status === 'number' ? upstream.status : undefined;

  return response?.status ?? dataStatus ?? upstreamStatus;
};

let getStatusText = (error: unknown) => {
  if (!isRecord(error)) return undefined;
  let response = error.response as ErrorResponse | undefined;
  return response?.statusText;
};

let upstreamCodeFor = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  if (isRecord(response?.data) && typeof response.data.code === 'string') {
    return response.data.code;
  }

  let data = isRecord(error.data) ? error.data : undefined;
  let upstream = isRecord(data?.upstream) ? data.upstream : undefined;
  return typeof upstream?.code === 'string' ? upstream.code : undefined;
};

export let codaServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let codaApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let status = getStatus(error);
  let serviceError = codaServiceError(
    `Coda API ${operation} failed: ${statusLabelFor(status, getStatusText(error))}${extractMessage(error)}`
  );
  serviceError.data.reason = 'coda_api_error';
  serviceError.data.upstreamStatus = status;
  serviceError.data.upstreamCode = upstreamCodeFor(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
