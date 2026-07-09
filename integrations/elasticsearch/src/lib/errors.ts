import { buildApiServiceError, createApiServiceError, SlateError } from 'slates';

export let elasticsearchServiceError = (message: string) =>
  createApiServiceError(message, { reason: 'elasticsearch_validation_error' });

export let elasticsearchApiError = (error: unknown, operation = 'request') => {
  if (SlateError.is(error)) {
    return error;
  }

  return buildApiServiceError(error, {
    providerLabel: 'Elasticsearch',
    operation,
    reason: 'elasticsearch_api_error',
    detailKeys: ['reason', 'message', 'type', 'error', 'status'],
    nestedKeys: ['error', 'root_cause', 'caused_by', 'failed_shards', 'errors', 'reason'],
    includeNumbers: false,
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let data = response.data;
      let errorData = helpers.isRecord(data.error) ? data.error : data;
      let code = errorData.type ?? errorData.error;

      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
};
