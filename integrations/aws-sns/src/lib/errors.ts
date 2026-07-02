import { badRequestError, ServiceError } from '@lowerdeck/error';

export let snsServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let snsApiError = (params: {
  operation: string;
  status?: number;
  code?: string;
  message: string;
  parent?: unknown;
}) => {
  let statusLabel = params.status !== undefined ? `HTTP ${params.status}: ` : '';
  let codeLabel = params.code ? `${params.code} - ` : '';
  let error = snsServiceError(
    `Amazon SNS ${params.operation} failed: ${statusLabel}${codeLabel}${params.message}`
  );

  error.data.reason = 'aws_sns_api_error';
  error.data.upstreamStatus = params.status;
  error.data.upstreamCode = params.code;

  if (params.parent instanceof Error) {
    error.setParent(params.parent);
  }

  return error;
};
