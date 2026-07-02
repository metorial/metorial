import { buildApiServiceError, createApiServiceError } from 'slates';

export let supabaseApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Supabase',
    operation,
    reason: 'supabase_api_error',
    detailKeys: ['message', 'error', 'reason', 'code', 'statusCode'],
    nestedKeys: ['errors'],
    extractUpstreamCode: (_input, response, helpers) =>
      helpers.isRecord(response?.data) && typeof response.data.code === 'string'
        ? response.data.code
        : undefined
  });

export let requireProjectRef = (projectRef: string | undefined) => {
  if (!projectRef) {
    throw createApiServiceError(
      'projectRef is required; provide it as input or set it in the configuration.'
    );
  }

  return projectRef;
};

export let requireField = <T>(value: T | undefined | null, label: string, action?: string) => {
  if (value === undefined || value === null || value === '') {
    throw createApiServiceError(
      `${label} is required${action ? ` for ${action} action` : ''}.`
    );
  }

  return value;
};
