import { postHogServiceError } from './errors';

export type PostHogRegion = 'us' | 'eu' | 'self-hosted';

let getSelfHostedUrl = (instanceUrl?: string) => {
  if (!instanceUrl) {
    throw postHogServiceError('A PostHog instance URL is required for self-hosted accounts.');
  }
  return instanceUrl.replace(/\/+$/, '');
};

export let getPrivateBaseUrl = (region: PostHogRegion, instanceUrl?: string): string => {
  if (region === 'self-hosted') return getSelfHostedUrl(instanceUrl);
  if (region === 'eu') return 'https://eu.posthog.com';
  if (region === 'us') return 'https://us.posthog.com';
  throw postHogServiceError(
    'Reconnect PostHog and select US Cloud, EU Cloud, or self-hosted.'
  );
};

export let getPublicBaseUrl = (region: PostHogRegion, instanceUrl?: string): string => {
  if (region === 'self-hosted') return getSelfHostedUrl(instanceUrl);
  if (region === 'eu') return 'https://eu.i.posthog.com';
  if (region === 'us') return 'https://us.i.posthog.com';
  throw postHogServiceError(
    'Reconnect PostHog and select US Cloud, EU Cloud, or self-hosted.'
  );
};
