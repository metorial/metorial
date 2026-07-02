import { badRequestError, forbiddenError, ServiceError } from '@lowerdeck/error';

export let slackServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let slackApiError = (method: string, error?: string | null) =>
  slackServiceError(`Slack API error (${method}): ${error || 'Unknown error'}`);

export let slackOAuthError = (error?: string | null) =>
  slackServiceError(`Slack OAuth error: ${error || 'Unknown error'}`);

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
