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

let extractSplunkMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addDetail(details, data.message);
    addDetail(details, data.error);
    addDetail(details, data.text);

    let messages = Array.isArray(data.messages) ? data.messages : [];
    for (let item of messages) {
      if (isRecord(item)) {
        addDetail(details, item.text);
        addDetail(details, item.message);
      } else {
        addDetail(details, item);
      }
    }

    let splunkMessages = isRecord(data.messages) ? Object.values(data.messages) : [];
    for (let item of splunkMessages) {
      addDetail(details, item);
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

export let splunkServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let splunkApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = splunkServiceError(
    `Splunk API ${operation} failed: ${statusLabel}${extractSplunkMessage(error)}`
  );
  serviceError.data.reason = 'splunk_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
