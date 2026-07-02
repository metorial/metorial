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

  for (let key of ['message', 'msg', 'detail', 'title', 'error', 'error_description']) {
    pushDetail(details, value[key]);
  }

  let errors = value.errors;
  if (isRecord(errors)) {
    for (let [field, fieldErrors] of Object.entries(errors)) {
      let fieldDetails: string[] = [];
      collectDetails(fieldErrors, fieldDetails);
      for (let detail of fieldDetails) {
        pushDetail(details, `${field}: ${detail}`);
      }
    }
  } else {
    collectDetails(errors, details);
  }
};

let errorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

let extractDocparserMessage = (error: unknown) => {
  let details: string[] = [];
  collectDetails(errorResponse(error)?.data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let docparserServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let docparserApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = errorResponse(error);
  let serviceError = docparserServiceError(
    `Docparser API ${operation} failed: ${statusLabelFor(response)}${extractDocparserMessage(error)}`
  );

  serviceError.data.reason = 'docparser_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let applyDocparserApiErrorInterceptor = (axios: unknown) => {
  (axios as any).interceptors?.response?.use?.(
    (response: any) => response,
    (error: unknown) => Promise.reject(docparserApiError(error))
  );
};
