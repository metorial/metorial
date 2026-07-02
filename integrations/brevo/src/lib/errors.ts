import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushDetail = (details: string[], value: unknown) => {
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
    pushDetail(details, value);
    return;
  }

  pushDetail(details, value.message);
  pushDetail(details, value.error_description);
  pushDetail(details, value.error);
  pushDetail(details, value.code);
  pushDetail(details, value.reason);
  collectDetails(value.errors, details);
};

let extractBrevoMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

let upstreamCodeFor = (response?: ErrorResponse) => {
  if (!isRecord(response?.data)) {
    return undefined;
  }

  if (typeof response.data.code === 'string') return response.data.code;
  if (typeof response.data.error === 'string') return response.data.error;

  return undefined;
};

export let brevoServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let brevoApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = brevoServiceError(
    `Brevo API ${operation} failed: ${statusLabelFor(response)}${extractBrevoMessage(error)}`
  );
  serviceError.data.reason = 'brevo_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
