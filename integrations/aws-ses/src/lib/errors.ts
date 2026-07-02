import { buildApiServiceError, createApiServiceError } from 'slates';

export let awsSesApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'AWS SES',
    operation,
    reason: 'aws_ses_api_error',
    detailKeys: [
      'message',
      'Message',
      'detail',
      'title',
      'error',
      'Error',
      'code',
      'Code',
      '__type'
    ],
    nestedKeys: ['data', 'errors'],
    extractUpstreamCode: (_input, response, helpers) => {
      if (!helpers.isRecord(response?.data)) return undefined;

      let code = response.data.Code ?? response.data.code ?? response.data.__type;
      return typeof code === 'string' ? code : undefined;
    }
  });

export let requireAwsSesString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw createApiServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireAwsSesArray = <T>(
  value: T[] | undefined,
  label: string,
  action?: string
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  throw createApiServiceError(
    `${label} must contain at least one item${action ? ` for "${action}"` : ''}.`
  );
};
