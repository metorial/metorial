import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorLike = {
  code?: unknown;
  errno?: unknown;
  sqlState?: unknown;
  sqlMessage?: unknown;
  message?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let extractMessage = (error: unknown) => {
  if (isRecord(error)) {
    let candidate = error as ErrorLike;
    for (let value of [candidate.sqlMessage, candidate.message]) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let mysqlServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let mysqlApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let source = isRecord(error) ? (error as ErrorLike) : {};
  let code = typeof source.code === 'string' ? source.code : undefined;
  let errno = typeof source.errno === 'number' ? source.errno : undefined;
  let sqlState = typeof source.sqlState === 'string' ? source.sqlState : undefined;
  let labels = [code, errno !== undefined ? `errno ${errno}` : undefined, sqlState]
    .filter(Boolean)
    .join(', ');
  let suffix = labels ? ` (${labels})` : '';

  let serviceError = mysqlServiceError(
    `MySQL ${operation} failed${suffix}: ${extractMessage(error)}`
  );

  serviceError.data.reason = 'mysql_error';
  serviceError.data.upstreamCode = code;
  serviceError.data.upstreamErrno = errno;
  serviceError.data.upstreamSqlState = sqlState;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
