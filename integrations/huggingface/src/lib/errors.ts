import { buildApiServiceError, createApiServiceError } from 'slates';

export let huggingFaceServiceError = (message: string) => createApiServiceError(message);

export let huggingFaceApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Hugging Face',
    operation,
    reason: 'hugging_face_api_error',
    extractUpstreamCode: (_error, response, helpers) =>
      helpers.isRecord(response?.data) && typeof response.data.code === 'string'
        ? response.data.code
        : undefined
  });

export let requireHuggingFaceInput = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw huggingFaceServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};
