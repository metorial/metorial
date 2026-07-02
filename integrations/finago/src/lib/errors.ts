import { buildApiServiceError, createApiServiceError } from 'slates';

export let finagoServiceError = (message: string) =>
  createApiServiceError(message, { reason: 'finago_validation_error' });

export let finagoApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Finago',
    operation,
    reason: 'finago_api_error',
    detailKeys: [
      'message',
      'detail',
      'error',
      'error_description',
      'title',
      'type',
      'name',
      'keyword',
      'path'
    ],
    nestedKeys: ['errors', 'error', 'validationErrors', 'payload']
  });

export let requireInput = <T>(value: T | undefined | null, label: string): T => {
  if (value === undefined || value === null || value === '') {
    throw finagoServiceError(`${label} is required.`);
  }

  return value;
};

export let requireUpdateFields = (body: Record<string, unknown>, label: string) => {
  if (Object.keys(body).length === 0) {
    throw finagoServiceError(`Provide at least one ${label} field to update.`);
  }
};
