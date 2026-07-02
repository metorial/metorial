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
  pushDetail(details, value.detail);
  pushDetail(details, value.title);
  pushDetail(details, value.error);
  pushDetail(details, value.error_description);
  pushDetail(details, value.code);
  collectDetails(value.data, details);
  collectDetails(value.errors, details);
};

let extractHuggingFaceMessage = (error: unknown) => {
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

  return typeof response.data.code === 'string' ? response.data.code : undefined;
};

export let huggingFaceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let huggingFaceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = huggingFaceServiceError(
    `Hugging Face API ${operation} failed: ${statusLabelFor(response)}${extractHuggingFaceMessage(error)}`
  );
  serviceError.data.reason = 'hugging_face_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireHuggingFaceInput = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw huggingFaceServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};
