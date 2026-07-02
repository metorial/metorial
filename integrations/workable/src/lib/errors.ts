import { buildApiServiceError, createApiServiceError } from 'slates';

export let workableApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Workable',
    operation,
    reason: 'workable_api_error',
    detailKeys: ['error', 'errors', 'message', 'detail', 'description', 'title', 'code'],
    nestedKeys: ['data', 'response', 'errors'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let code = response.data.code ?? response.data.error;
      return typeof code === 'string' ? code : undefined;
    }
  });

export let requireWorkableString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw createApiServiceError(`${label} is required${action ? ` for ${action}` : ''}.`);
};

export let requireWorkableArray = <T>(
  value: T[] | undefined,
  label: string,
  action?: string
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  throw createApiServiceError(
    `${label} must contain at least one item${action ? ` for ${action}` : ''}.`
  );
};

export let requireAtLeastOneWorkableField = (
  values: Record<string, unknown>,
  labels: string[],
  action?: string
) => {
  if (Object.values(values).some(value => value !== undefined)) return;

  throw createApiServiceError(
    `Provide at least one of ${labels.join(', ')}${action ? ` for ${action}` : ''}.`
  );
};
