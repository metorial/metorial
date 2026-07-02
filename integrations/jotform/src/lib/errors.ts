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

let collectJotformDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectJotformDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.error);
  addDetail(details, value.error_description);
  collectJotformDetails(value.errors, details);
};

let extractJotformMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  if (response?.data !== undefined) {
    collectJotformDetails(response.data, details);
  }

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

export let jotformServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let jotformApiResponseError = (
  operation: string,
  response: Record<string, unknown>
) => {
  let responseCode = Number(response.responseCode);
  let message =
    typeof response.message === 'string' && response.message.trim()
      ? response.message.trim()
      : 'Unknown error';
  let error = jotformServiceError(`Jotform API ${operation} failed: ${message}`);

  error.data.reason = 'jotform_api_error';
  error.data.upstreamStatus = Number.isNaN(responseCode) ? undefined : responseCode;
  error.data.upstreamInfo = response.info;

  return error;
};

export let jotformApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = jotformServiceError(
    `Jotform API ${operation} failed: ${statusLabelFor(response)}${extractJotformMessage(error)}`
  );

  serviceError.data.reason = 'jotform_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (isRecord(response?.data)) {
    serviceError.data.upstreamCode = response.data.responseCode;
    serviceError.data.upstreamInfo = response.data.info;
  }

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
