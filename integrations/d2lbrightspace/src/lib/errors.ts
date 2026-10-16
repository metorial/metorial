import { buildApiServiceError } from 'slates';

export let brightspaceError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Brightspace',
    reason: 'brightspace_api_error',
    operation,
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    detailKeys: ['message', 'Message', 'detail', 'error', 'error_description', 'Code'],
    nestedKeys: ['errors', 'Errors']
  });
