import { buildApiServiceError, isApiErrorRecord } from 'slates';

export let ahrefsApiError = (error: unknown, operation = 'request') => {
  let result = buildApiServiceError(error, {
    providerLabel: 'Ahrefs',
    reason: 'ahrefs_api_failed',
    operation,
    extractResponse: (failure, helpers) => {
      let response = helpers.getResponse(failure);
      if (!helpers.isRecord(failure) || !helpers.isRecord(failure.data)) return response;
      let data = failure.data;
      let upstream = helpers.isRecord(data.upstream) ? data.upstream : undefined;
      let baggage = helpers.isRecord(data.baggage) ? data.baggage : undefined;
      let status = upstream?.status ?? data.upstreamStatus ?? response?.status;
      return {
        ...response,
        status: typeof status === 'number' || typeof status === 'string' ? status : undefined,
        data: baggage?.response ?? response?.data
      };
    },
    extractUpstreamCode: failure => {
      if (!isApiErrorRecord(failure) || !isApiErrorRecord(failure.data)) return undefined;
      let upstream = isApiErrorRecord(failure.data.upstream)
        ? failure.data.upstream
        : undefined;
      return typeof upstream?.code === 'string' ? upstream.code : undefined;
    }
  });

  if (result === error) return result;
  if (isApiErrorRecord(error) && isApiErrorRecord(error.data)) {
    let data = error.data;
    if (typeof data.retryable === 'boolean') result.data.retryable = data.retryable;
    if (isApiErrorRecord(data.provider)) result.data.provider = data.provider;
    if (isApiErrorRecord(data.upstream)) result.data.upstream = data.upstream;
    if (isApiErrorRecord(data.baggage)) result.data.baggage = data.baggage;
  }
  return result;
};
