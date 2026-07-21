import { buildApiServiceError, SlateError } from 'slates';

export let notionApiError = (error: unknown, operation = 'request') => {
  if (SlateError.is(error)) {
    return error;
  }

  return buildApiServiceError(error, {
    providerLabel: 'Notion',
    operation,
    reason: 'notion_api_error',
    detailKeys: ['message', 'code', 'error', 'error_description'],
    nestedKeys: ['errors'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let code = response.data.code ?? response.data.error;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });
};
