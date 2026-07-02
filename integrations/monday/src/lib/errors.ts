import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

type MondayGraphQLError = {
  message?: string;
  extensions?: {
    code?: string;
    status_code?: number;
    request_id?: string;
    error_code?: string;
  };
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let extractMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addDetail(details, data.message);
    addDetail(details, data.error_description);
    addDetail(details, data.error);

    let errors = Array.isArray(data.errors) ? data.errors : [];
    for (let item of errors) {
      if (isRecord(item)) {
        addDetail(details, item.message);
      }
    }
  } else {
    addDetail(details, data);
  }

  if (details.length > 0) return details.join(', ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

let getStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let mondayServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let mondayApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = mondayServiceError(
    `monday.com API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );
  serviceError.data.reason = 'monday_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let mondayGraphQLError = (errors: MondayGraphQLError[], operation = 'request') => {
  let message = errors
    .map(error => {
      let parts = [error.message || 'Unknown GraphQL error'];
      if (error.extensions?.code) parts.push(`code=${error.extensions.code}`);
      if (error.extensions?.error_code)
        parts.push(`error_code=${error.extensions.error_code}`);
      return parts.join(' ');
    })
    .join(', ');

  let serviceError = mondayServiceError(`monday.com API ${operation} failed: ${message}`);
  serviceError.data.reason = 'monday_graphql_error';
  serviceError.data.upstreamStatus = errors.find(
    error => error.extensions?.status_code
  )?.extensions?.status_code;
  serviceError.data.requestId = errors.find(
    error => error.extensions?.request_id
  )?.extensions?.request_id;
  return serviceError;
};
