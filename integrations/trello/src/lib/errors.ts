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

let extractTrelloMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data ?? (isRecord(error) ? error.data : undefined);
  let details: string[] = [];

  if (isRecord(data)) {
    let nestedError = isRecord(data.error) ? data.error : undefined;
    for (let key of ['message', 'type', 'code']) {
      addDetail(details, nestedError?.[key]);
    }

    for (let key of ['message', 'detail', 'error']) {
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

let getTrelloErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let trelloServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let trelloApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getTrelloErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = trelloServiceError(
    `Trello API ${operation} failed: ${statusLabel}${extractTrelloMessage(error)}`
  );
  serviceError.data.reason = 'trello_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireTrelloString = (
  value: string | undefined,
  label: string,
  action?: string
) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw trelloServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
  }

  return value;
};

export let requireTrelloValue = <T>(value: T | undefined, label: string, action?: string) => {
  if (value === undefined || value === null) {
    throw trelloServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
  }

  return value;
};

export let requireAtLeastOneTrelloField = (
  values: Record<string, unknown>,
  label: string,
  action?: string
) => {
  if (Object.values(values).every(value => value === undefined)) {
    throw trelloServiceError(
      `Provide at least one ${label}${action ? ` for "${action}"` : ''}.`
    );
  }
};
