import { KlaviyoClient } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { revision?: string };
}): KlaviyoClient => {
  return new KlaviyoClient({
    token: ctx.auth.token,
    revision: ctx.config.revision
  });
};

export let flattenResource = (resource: {
  type: string;
  id?: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, any>;
}): Record<string, any> => {
  return {
    resourceId: resource.id,
    resourceType: resource.type,
    ...resource.attributes,
    ...(resource.relationships ? { relationships: resource.relationships } : {})
  };
};

export let extractPaginationCursor = (links?: { next?: string }): string | undefined => {
  if (!links?.next) return undefined;
  try {
    let url = new URL(links.next);
    return url.searchParams.get('page[cursor]') ?? undefined;
  } catch {
    return undefined;
  }
};
