import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let extractSalesforceMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['error', 'error_description', 'message']) {
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

export let salesforceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let salesforceOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = salesforceServiceError(
    `Salesforce OAuth ${operation} failed: ${extractSalesforceMessage(error)}`
  );

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let salesforceApiError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = salesforceServiceError(
    `Salesforce API ${operation} failed: ${extractSalesforceMessage(error)}`
  );

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
