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

  let trimmed = String(value).trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let collectCloudflareDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectCloudflareDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.code);
  addDetail(details, value.documentation_url);

  if (isRecord(value.source)) {
    addDetail(details, value.source.pointer);
  }
};

let extractCloudflareMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    collectCloudflareDetails(data.errors, details);
    collectCloudflareDetails(data.messages, details);
    collectCloudflareDetails(data.error, details);
    collectCloudflareDetails(data.message, details);
  } else {
    collectCloudflareDetails(data, details);
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

export let cloudflareWorkersServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let cloudflareWorkersApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = cloudflareWorkersServiceError(
    `Cloudflare Workers API ${operation} failed: ${statusLabelFor(response)}${extractCloudflareMessage(error)}`
  );
  serviceError.data.reason = 'cloudflare_workers_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let cloudflareWorkersApiResponseError = (
  response: ErrorResponse,
  operation = 'request'
) => {
  let serviceError = cloudflareWorkersServiceError(
    `Cloudflare Workers API ${operation} failed: ${statusLabelFor(response)}${extractCloudflareMessage({ response })}`
  );
  serviceError.data.reason = 'cloudflare_workers_api_error';
  serviceError.data.upstreamStatus = response.status;
  return serviceError;
};
