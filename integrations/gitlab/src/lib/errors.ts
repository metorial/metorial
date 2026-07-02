import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let _stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let extractGitLabMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'error_description', 'error']) {
      let value = data[key];
      if (typeof value === 'string' && value.trim() && !details.includes(value.trim())) {
        details.push(value.trim());
      } else if (Array.isArray(value)) {
        for (let item of value) {
          if (typeof item === 'string' && item.trim() && !details.includes(item.trim())) {
            details.push(item.trim());
          }
        }
      } else if (isRecord(value)) {
        for (let nested of Object.values(value)) {
          if (
            typeof nested === 'string' &&
            nested.trim() &&
            !details.includes(nested.trim())
          ) {
            details.push(nested.trim());
          } else if (Array.isArray(nested)) {
            for (let item of nested) {
              if (typeof item === 'string' && item.trim() && !details.includes(item.trim())) {
                details.push(item.trim());
              }
            }
          }
        }
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let gitLabServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let getGitLabErrorStatus = (error: unknown) => {
  if (error instanceof ServiceError) {
    let upstreamStatus = error.data.upstreamStatus;
    if (typeof upstreamStatus === 'number' || typeof upstreamStatus === 'string') {
      return upstreamStatus;
    }
  }

  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let gitLabApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getGitLabErrorStatus(error);
  let message = extractGitLabMessage(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let serviceError = gitLabServiceError(
    `GitLab API ${operation} failed: ${statusLabel}${message}`
  );

  serviceError.data.reason = 'gitlab_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
