import { forbiddenError, ServiceError } from '@lowerdeck/error';
import { buildApiServiceError, createApiServiceError, SlateError } from 'slates';

type SlackServiceErrorOptions = {
  reason?: string;
  upstreamCode?: string;
  upstreamStatus?: number;
};

export let slackServiceError = (message: string, options: SlackServiceErrorOptions = {}) =>
  createApiServiceError(message, options);

export let slackApiError = (method: string, error?: string | null) =>
  slackServiceError(`Slack API error (${method}): ${error || 'Unknown error'}`, {
    reason: 'slack_api_error',
    upstreamCode: error || undefined
  });

export let slackRequestError = (method: string, error: unknown) => {
  // Transport errors (429/5xx/timeouts) arrive pre-classified with retry
  // semantics; flattening them into a bad_request would make them terminal.
  if (error instanceof SlateError) return error;

  return buildApiServiceError(error, {
    providerLabel: 'Slack',
    operation: method,
    reason: 'slack_api_request_error',
    detailKeys: ['message', 'error', 'detail', 'code'],
    nestedKeys: ['errors', 'details', 'error']
  });
};

export let slackOAuthError = (error?: string | null) =>
  slackServiceError(`Slack OAuth error: ${error || 'Unknown error'}`, {
    reason: 'slack_oauth_error',
    upstreamCode: error || undefined
  });

export let isSlackApiErrorCode = (error: unknown, code: string) =>
  error instanceof ServiceError && error.data.upstreamCode === code;

export let missingRequiredFieldError = (field: string, context?: string) => {
  let message = `${field} is required${context ? ` for ${context}` : ''}`;

  return slackServiceError(message);
};

export let missingRequiredAlternativeError = (message: string) => slackServiceError(message);

export let userTokenRequiredError = (message: string) =>
  new ServiceError(
    forbiddenError({
      message,
      reason: 'user_token_required'
    })
  );
