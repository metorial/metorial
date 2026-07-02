import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  pushDetail(details, value.error);
  pushDetail(details, value.error_description);
  pushDetail(details, value.error_details);
  pushDetail(details, value.title);
  pushDetail(details, value.detail);
  pushDetail(details, value.code);

  collectDetails(value.errors, details);
  collectDetails(value.error_response, details);
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

let extractCoinbaseMessage = (error: unknown) => {
  let details: string[] = [];
  collectDetails(getErrorResponse(error)?.data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let upstreamCodeFor = (response?: ErrorResponse) => {
  if (!isRecord(response?.data)) {
    return undefined;
  }

  let code = response.data.code ?? response.data.error;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
};

export let coinbaseServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let coinbaseApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = getErrorResponse(error);
  let serviceError = coinbaseServiceError(
    `Coinbase API ${operation} failed: ${statusLabelFor(response)}${extractCoinbaseMessage(error)}`
  );
  serviceError.data.reason = 'coinbase_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
