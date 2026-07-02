import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
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

let addRecordDetails = (details: string[], record: Record<string, unknown>) => {
  for (let key of ['message', 'detail', 'error', 'error_description', 'code', 'type']) {
    addDetail(details, record[key]);
  }
};

let extractSegmentMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addRecordDetails(details, data);

    let nestedError = data.error;
    if (isRecord(nestedError)) {
      addRecordDetails(details, nestedError);
    }

    let errors = data.errors;
    if (Array.isArray(errors)) {
      for (let item of errors) {
        if (isRecord(item)) addRecordDetails(details, item);
        else addDetail(details, item);
      }
    } else if (isRecord(errors)) {
      addRecordDetails(details, errors);
    }
  } else {
    addDetail(details, data);
  }

  if (isRecord(error)) {
    addRecordDetails(details, error);
  }

  if (error instanceof Error) {
    addDetail(details, error.message);
  }

  return details.length > 0 ? details.join(' - ') : 'Unknown error';
};

let getSegmentErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let status =
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined);

  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

export let segmentServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let segmentApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getSegmentErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = segmentServiceError(
    `Segment API ${operation} failed: ${statusLabel}${extractSegmentMessage(error)}`
  );
  serviceError.data.reason = 'segment_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
