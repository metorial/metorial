import { badRequestError, ServiceError } from '@lowerdeck/error';

export let s3ServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let s3ApiError = (params: {
  operation: string;
  status?: number;
  code?: string;
  message: string;
  parent?: unknown;
}) => {
  let statusLabel = params.status !== undefined ? `HTTP ${params.status}: ` : '';
  let codeLabel = params.code ? `${params.code} - ` : '';
  let error = s3ServiceError(
    `Amazon S3 ${params.operation} failed: ${statusLabel}${codeLabel}${params.message}`
  );

  error.data.reason = 's3_api_error';
  error.data.upstreamStatus = params.status;
  error.data.upstreamCode = params.code;

  if (params.parent instanceof Error) {
    error.setParent(params.parent);
  }

  return error;
};

export let hasS3ErrorCode = (error: unknown, code: string) =>
  error instanceof ServiceError && error.data.upstreamCode === code;
