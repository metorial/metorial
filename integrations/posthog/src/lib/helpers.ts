import { PostHogClient } from './client';
import { postHogServiceError } from './errors';
import type { PostHogRegion } from './urls';

export let createClient = (
  config: { projectId?: string },
  auth: { token: string; projectToken?: string; region: PostHogRegion; instanceUrl?: string }
) => {
  return new PostHogClient({
    token: auth.token,
    projectToken: auth.projectToken,
    region: auth.region,
    instanceUrl: auth.instanceUrl,
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
