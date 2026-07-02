import { ContentfulClient } from './client';

export let createClient = (
  config: { spaceId: string; environmentId: string; region: 'us' | 'eu' },
  auth: { token: string }
): ContentfulClient => {
  return new ContentfulClient({
    token: auth.token,
    spaceId: config.spaceId,
    environmentId: config.environmentId,
    region: config.region
  });
};

export let formatSys = (sys: any) => ({
  resourceId: sys?.id,
  type: sys?.type,
  version: sys?.version,
  createdAt: sys?.createdAt,
  updatedAt: sys?.updatedAt,
  publishedAt: sys?.publishedAt,
  publishedVersion: sys?.publishedVersion,
  contentTypeId: sys?.contentType?.sys?.id
});
