import { createApiServiceError } from 'slates';
import { ContentfulGraphQLClient } from './client';
import { validateLocator } from './validation';

export interface ContentfulAuth {
  token: string;
  previewToken?: string;
  managementToken?: string;
}
export interface ContentfulConfig {
  environmentId?: string;
  region?: 'us' | 'eu';
  spaceId?: unknown;
}

export let createGraphQLClient = (
  config: ContentfulConfig,
  auth: ContentfulAuth,
  options: { preview?: boolean; spaceId?: string; environmentId?: string } = {}
): ContentfulGraphQLClient => {
  let spaceId = options.spaceId ?? config.spaceId;
  if (spaceId === undefined)
    throw createApiServiceError(
      'Provide spaceId for this call. Use list_spaces with a CMA token for account discovery, or copy the space authorized by your delivery or preview key from Contentful API-key settings.',
      { reason: 'missing_scope' }
    );
  return new ContentfulGraphQLClient({
    ...auth,
    spaceId: validateLocator(spaceId, 'space'),
    environmentId: validateLocator(
      options.environmentId ?? config.environmentId ?? 'master',
      'environment'
    ),
    region: config.region ?? 'us',
    preview: options.preview
  });
};
