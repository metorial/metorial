import { buildApiServiceError } from 'slates';

// Loyverse reports field-level failures as { errors: [{ code, details, field }] }.
// https://developer.loyverse.com/docs/#section/Handling-errors
export let loyverseApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Loyverse',
    reason: 'loyverse_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
    detailKeys: ['code', 'details', 'field', 'error', 'error_description', 'message'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;
      if (Array.isArray(response.data.errors)) {
        let first = response.data.errors.find(
          entry => helpers.isRecord(entry) && typeof entry.code === 'string'
        );
        if (helpers.isRecord(first)) return String(first.code);
      }
      return typeof response.data.error === 'string' ? response.data.error : undefined;
    }
  });
