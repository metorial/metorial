import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }

  let trimmed = value.trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let extractPagerDutyMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data ?? (isRecord(error) ? error.data : undefined);
  let details: string[] = [];

  if (isRecord(data)) {
    let errorBody = data.error;
    if (isRecord(errorBody)) {
      addDetail(details, errorBody.message);
      addDetail(details, errorBody.code);

      let nestedErrors = errorBody.errors;
      if (Array.isArray(nestedErrors)) {
        for (let item of nestedErrors) {
          addDetail(details, item);
          if (isRecord(item)) {
            addDetail(details, item.message);
            addDetail(details, item.detail);
          }
        }
      }
    }

    let errors = data.errors;
    if (Array.isArray(errors)) {
      for (let item of errors) {
        addDetail(details, item);
        if (isRecord(item)) {
          addDetail(details, item.message);
          addDetail(details, item.detail);
        }
      }
    }

    for (let key of ['message', 'error_description', 'error']) {
      addDetail(details, data[key]);
    }
  } else {
    addDetail(details, data);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getPagerDutyErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.status ?? error.status;
};

export let pagerDutyServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let pagerDutyApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getPagerDutyErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = pagerDutyServiceError(
    `PagerDuty API ${operation} failed: ${statusLabel}${extractPagerDutyMessage(error)}`
  );
  serviceError.data.reason = 'pagerduty_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
