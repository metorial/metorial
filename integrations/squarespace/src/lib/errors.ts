import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let addDetail = (details: string[], value: unknown) => {
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
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.detail);
  addDetail(details, value.title);
  addDetail(details, value.error);
  addDetail(details, value.code);
  collectDetails(value.errors, details);
};

let extractSquarespaceMessage = (error: unknown) => {
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

  let code = response.data.code ?? response.data.type ?? response.data.error;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
};

export let squarespaceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let squarespaceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = squarespaceServiceError(
    `Squarespace API ${operation} failed: ${statusLabelFor(response)}${extractSquarespaceMessage(error)}`
  );
  serviceError.data.reason = 'squarespace_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) serviceError.setParent(error);

  return serviceError;
};

export let requireSquarespaceString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) return value;
  throw squarespaceServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireSquarespaceArray = <T>(
  value: T[] | undefined,
  label: string,
  action?: string
) => {
  if (Array.isArray(value) && value.length > 0) return value;
  throw squarespaceServiceError(
    `${label} must contain at least one item${action ? ` for "${action}"` : ''}.`
  );
};
