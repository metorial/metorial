import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

type BraintreeGraphQLError = {
  message?: string;
  path?: Array<string | number>;
  extensions?: {
    errorClass?: string;
    legacyCode?: string;
    inputPath?: Array<string | number>;
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

let stripXml = (value: string) =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

let extractBraintreeMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addDetail(details, data.message);
    addDetail(details, data.error);
    addDetail(details, data.error_description);
  } else if (typeof data === 'string') {
    let messageMatches = [...data.matchAll(/<message>([\s\S]*?)<\/message>/g)].map(
      match => match[1]
    );
    for (let message of messageMatches) {
      addDetail(details, message);
    }
    if (details.length === 0) {
      addDetail(details, stripXml(data));
    }
  } else {
    addDetail(details, data);
  }

  if (details.length > 0) return details.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

export let braintreeServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let braintreeApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = braintreeServiceError(
    `Braintree API ${operation} failed: ${statusLabel}${extractBraintreeMessage(error)}`
  );

  serviceError.data.reason = 'braintree_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let braintreeGraphQLError = (
  errors: BraintreeGraphQLError[],
  operation = 'GraphQL request',
  requestId?: string
) => {
  let message = errors
    .map(error => {
      let parts = [error.message || 'Unknown GraphQL error'];
      if (error.extensions?.errorClass) parts.push(`class=${error.extensions.errorClass}`);
      if (error.extensions?.legacyCode) parts.push(`code=${error.extensions.legacyCode}`);
      if (error.extensions?.inputPath)
        parts.push(`input=${error.extensions.inputPath.join('.')}`);
      if (error.path) parts.push(`path=${error.path.join('.')}`);
      return parts.join(' ');
    })
    .join(', ');

  let serviceError = braintreeServiceError(`Braintree API ${operation} failed: ${message}`);
  serviceError.data.reason = 'braintree_graphql_error';
  serviceError.data.requestId = requestId;
  return serviceError;
};
