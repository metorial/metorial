import { PostHogClient } from './client';
import { postHogServiceError } from './errors';

export let createClient = (
  config: { region: string; instanceUrl?: string; projectId?: string },
  auth: { token: string; projectToken?: string }
) => {
  return new PostHogClient({
    token: auth.token,
    projectToken: auth.projectToken,
    region: config.region,
    instanceUrl: config.instanceUrl,
    projectId: config.projectId
  });
};

export let requireProjectToken = (auth: { projectToken?: string }) => {
  if (!auth.projectToken) {
    throw postHogServiceError(
      'PostHog projectToken is required for public capture and feature-flag evaluation endpoints. Add the project token to the integration auth configuration.'
    );
  }

  return auth.projectToken;
};
