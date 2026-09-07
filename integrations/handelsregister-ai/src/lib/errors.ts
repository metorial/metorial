import { ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, getApiErrorStatus } from 'slates';

const statusMessages: Record<string, string> = {
  '401': 'Authentication failed. Reconnect with a valid API key.',
  '402': 'Insufficient credits. Add credits to your Handelsregister.ai account.',
  '403':
    'Access denied. Check account verification, subscription, and credential permissions.',
  '404': 'The requested company, person, or document was not found.',
  '422':
    'The provider rejected the request parameters. Check the documented input requirements.',
  '429':
    'Rate limit reached. Wait before trying again; documents allow only five requests per minute.'
};

export let handelsregisterError = (error: unknown, operation: string) => {
  if (error instanceof ServiceError) return error;
  let status = getApiErrorStatus(error);
  // Use status-based messages: upstream error bodies can echo credentials and binary content.
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Handelsregister.ai',
      reason: 'handelsregister_api_error',
      operation,
      extractMessage: () =>
        statusMessages[String(status)] ??
        'The provider request failed or timed out. Try again later.'
    }
  );
};
