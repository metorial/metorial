import { buildApiServiceError, createApiServiceError } from 'slates';

export let projectOperationsValidationError = (
  message: string,
  options: Record<string, unknown> = {}
) =>
  createApiServiceError(message, {
    reason: 'dynamics_project_operations_validation_error',
    ...options
  });

export let microsoftAuthApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Microsoft identity platform',
    reason: 'microsoft_identity_api_error',
    operation,
    detailKeys: [
      'message',
      'error_description',
      'error',
      'error_codes',
      'trace_id',
      'correlation_id'
    ],
    nestedKeys: ['error', 'details', 'errors']
  });
