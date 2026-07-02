import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  headers?: Record<string, unknown>;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  addDetail(details, value.code);
  addDetail(details, value.message);
  addDetail(details, value.status);
  addDetail(details, value.error);
  addDetail(details, value.error_description);

  if (isRecord(value.details)) {
    addDetail(details, value.details.api_name);
    addDetail(details, value.details.param_name);
    addDetail(details, value.details.id);
  }

  collectDetails(value.data, details);
  collectDetails(value.errors, details);
};

let responseFor = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let extractZohoMessage = (error: unknown) => {
  let details: string[] = [];
  collectDetails(responseFor(error)?.data, details);

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
  let data = response?.data;
  if (!isRecord(data)) return undefined;

  if (typeof data.code === 'string') return data.code;
  let first = Array.isArray(data.data) ? data.data[0] : undefined;
  return isRecord(first) && typeof first.code === 'string' ? first.code : undefined;
};

export let zohoCrmServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let zohoCrmApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = responseFor(error);
  let serviceError = zohoCrmServiceError(
    `Zoho CRM API ${operation} failed: ${statusLabelFor(response)}${extractZohoMessage(error)}`
  );
  serviceError.data.reason = 'zoho_crm_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireZohoCrmString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw zohoCrmServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireZohoCrmArray = <T>(
  value: T[] | undefined,
  label: string,
  action?: string
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  throw zohoCrmServiceError(
    `${label} must contain at least one item${action ? ` for "${action}"` : ''}.`
  );
};

export let decodeZohoCrmBase64File = (contentBase64: string, label: string) => {
  let normalized = contentBase64.trim();
  let buffer = Buffer.from(normalized, 'base64');
  let encoded = buffer.toString('base64');

  if (!normalized || encoded !== normalized) {
    throw zohoCrmServiceError(`${label} must be valid non-empty base64 data.`);
  }

  return buffer;
};
