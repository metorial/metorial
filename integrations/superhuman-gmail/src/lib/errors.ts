import { buildApiServiceError, getApiErrorStatus } from 'slates';

export const gmailError = (error: unknown, operation: string) => {
  const rawStatus = getApiErrorStatus(error);
  const status =
    typeof rawStatus === 'number' &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 100 &&
    rawStatus <= 599
      ? rawStatus
      : typeof rawStatus === 'string' && /^[1-5]\d{2}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  return buildApiServiceError(error, {
    providerLabel: 'Gmail',
    operation,
    reason: 'gmail_api_error',
    parent: {},
    extractResponse: () => ({ status }),
    extractMessage: () => '',
    formatMessage: ({ status }) => {
      const code = typeof status === 'number' ? ` (HTTP ${status})` : '';
      const hint =
        status === 401
          ? ' Reconnect Google.'
          : status === 403
            ? ' Check the granted Gmail permissions and mailbox access.'
            : status === 429
              ? ' The provider rate limit was reached; retry later.'
              : '';
      return `Gmail ${operation} failed${code}.${hint} Transport and message contents are omitted.`;
    }
  });
};
