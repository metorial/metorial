import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorResponse,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export const laterError = (error: unknown) => {
  const metadata =
    isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
  const candidate = getApiErrorStatus(error) ?? metadata?.upstreamStatus;
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  const data = getApiErrorResponse(error)?.data;
  const upstream = isApiErrorRecord(metadata?.upstream) ? metadata.upstream : undefined;
  const candidateCode = isApiErrorRecord(data)
    ? data.type
    : (upstream?.type ?? upstream?.code ?? metadata?.upstreamCode);
  const code =
    typeof candidateCode === 'string' &&
    /^ANL_(00400|00401|00403|00404|00422|00500)$/.test(candidateCode)
      ? candidateCode
      : undefined;
  const message =
    status === 401
      ? 'Reconnect or renew the client-credentials token for the selected API version.'
      : status === 403
        ? 'Check Reporting API access and the instances assigned to these credentials.'
        : status === 429
          ? 'The reporting rate limit was reached. Retry after the provider rate-limit window.'
          : status === 400
            ? 'Check the dates, metric names and filters against the selected reporting endpoint.'
            : 'The reporting request could not be completed. Check the selected API version and provider availability.';
  // Pass only validated protocol metadata: the shared builder otherwise retains raw transport parents.
  return buildApiServiceError(
    { response: { status, data: { type: code } } },
    {
      providerLabel: 'Later Influence',
      reason: 'upstream_error',
      parent: {},
      extractMessage: () => message,
      extractUpstreamCode: () => code
    }
  );
};
