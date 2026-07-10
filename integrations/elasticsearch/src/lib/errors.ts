import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  isApiErrorRecord,
  SlateError
} from 'slates';

let elasticsearchDetailKeys = ['reason', 'message', 'type', 'error', 'status'];
let elasticsearchNestedKeys = [
  'error',
  'root_cause',
  'caused_by',
  'failed_shards',
  'errors',
  'reason'
];

export let extractElasticsearchErrorMessage = (data: unknown): string | undefined => {
  if (!isApiErrorRecord(data)) {
    return undefined;
  }

  let details: string[] = [];
  collectApiErrorDetails(data, details, {
    detailKeys: elasticsearchDetailKeys,
    nestedKeys: elasticsearchNestedKeys,
    includeNumbers: false
  });

  return details.length > 0 ? details.join(' - ') : undefined;
};

export let mapElasticsearchAxiosError = (error: {
  response?: { status?: number; statusText?: string; data?: unknown };
}) => {
  let data = error.response?.data;
  let message = extractElasticsearchErrorMessage(data);

  if (message) {
    return { message };
  }

  // Non-JSON bodies (proxy HTML pages, plain text, empty bodies) are not
  // useful user-facing messages; degrade to a generic status-based message.
  if (typeof data === 'string') {
    let statusText = error.response?.statusText?.trim();
    let status = error.response?.status;

    return {
      message:
        statusText ||
        (status !== undefined ? `Request failed with HTTP ${status}` : 'Request failed')
    };
  }

  return undefined;
};

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
    detailKeys: elasticsearchDetailKeys,
    nestedKeys: elasticsearchNestedKeys,
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
