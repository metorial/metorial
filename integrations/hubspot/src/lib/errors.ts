import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let extractHubSpotMessage = (error: unknown) => {
  if (error instanceof ServiceError) {
    throw error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'error_description', 'error', 'status', 'category']) {
      let value = stringValue(data[key]);
      if (value && !details.includes(value)) {
        details.push(value);
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    details.push(data.trim());
  }

  if (response?.status) {
    let status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    return details.length > 0 ? `${status}: ${details.join(' - ')}` : status;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let hubSpotServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let hubSpotOAuthError = (operation: string, error: unknown) =>
  hubSpotServiceError(`HubSpot OAuth ${operation} failed: ${extractHubSpotMessage(error)}`);

export let hubSpotApiError = (error: unknown, operation?: string) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let config = isRecord(error)
    ? (error.config as Record<string, unknown> | undefined)
    : undefined;
  let method = stringValue(config?.method)?.toUpperCase();
  let url = stringValue(config?.url);
  let inferredOperation = [method, url].filter(Boolean).join(' ');
  let label = operation ?? (inferredOperation || 'request');

  return hubSpotServiceError(`HubSpot API ${label} failed: ${extractHubSpotMessage(error)}`);
};
