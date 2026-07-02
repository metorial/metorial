import { ContentfulGraphQLClient } from './client';
import { ContentfulWebhookClient } from './webhook-client';

export let createGraphQLClient = (
  config: { spaceId: string; environmentId: string; region: 'us' | 'eu' },
  auth: { token: string; previewToken?: string; managementToken?: string },
  options?: { preview?: boolean }
): ContentfulGraphQLClient => {
  return new ContentfulGraphQLClient({
    token: auth.token,
    spaceId: config.spaceId,
    environmentId: config.environmentId,
    region: config.region,
    preview: options?.preview,
    previewToken: auth.previewToken
  });
};

export let createWebhookClient = (
  config: { spaceId: string; region: 'us' | 'eu' },
  auth: { managementToken?: string }
): ContentfulWebhookClient => {
  if (!auth.managementToken) {
    throw new Error(
      'A Content Management API token is required for webhook management. Provide a managementToken in the authentication settings.'
    );
  }

  return new ContentfulWebhookClient({
    managementToken: auth.managementToken,
    spaceId: config.spaceId,
    region: config.region
  });
};
