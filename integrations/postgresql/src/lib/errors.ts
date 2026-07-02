import { badRequestError, ServiceError } from '@lowerdeck/error';

export let postgresServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let postgresUpstreamError = (
  message: string,
  options: {
    reason?: string;
    code?: string;
    parent?: unknown;
  } = {}
) => {
  let error = postgresServiceError(message);
  error.data.reason = options.reason ?? 'postgresql_error';
  error.data.upstreamCode = options.code;

  if (options.parent instanceof Error) {
    error.setParent(options.parent);
  }

  return error;
};

export let toPostgresServiceError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return postgresUpstreamError(`${fallbackMessage}: ${error.message}`, {
      parent: error
    });
  }

  return postgresUpstreamError(fallbackMessage);
};

export let postgresFieldsError = (
  fields: Record<string, string>,
  fallbackMessage = 'Unknown error'
) => {
  let message = fields.message || fallbackMessage;
  if (fields.detail) message += ` - ${fields.detail}`;
  if (fields.hint) message += ` (Hint: ${fields.hint})`;
  if (fields.position) message += ` at position ${fields.position}`;

  return postgresUpstreamError(`PostgreSQL error [${fields.code || 'UNKNOWN'}]: ${message}`, {
    reason: 'postgresql_server_error',
    code: fields.code
  });
};
