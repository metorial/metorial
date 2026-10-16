import { createApiServiceError, isApiErrorRecord } from 'slates';

/**
 * Extracts a flat resource object from a JSON:API resource.
 * Merges id, type, and attributes into a single object.
 */
export let flattenResource = (resource: any): any => {
  if (
    !isApiErrorRecord(resource) ||
    typeof resource.id !== 'string' ||
    !isApiErrorRecord(resource.attributes)
  ) {
    throw createApiServiceError('Booqable returned an invalid resource response.');
  }
  return {
    ...resource.attributes,
    resourceId: resource.id,
    resourceType: resource.type,
    relationships: resource.relationships,
    links: resource.links
  };
};

/**
 * Extracts a list of flat resources from a JSON:API response.
 */
export let flattenResourceList = (data: any): any[] => {
  if (!Array.isArray(data?.data))
    throw createApiServiceError('Booqable returned an invalid resource list.');
  return data.data.map((resource: any) => ({
    ...flattenResource(resource),
    ...(data.included ? { included: data.included } : {})
  }));
};

/**
 * Extracts a single flat resource from a JSON:API response.
 */
export let flattenSingleResource = (data: any): any => {
  if (!data?.data)
    throw createApiServiceError('Booqable did not return the requested resource.');
  return {
    ...flattenResource(data.data),
    ...(data.included ? { included: data.included } : {})
  };
};

/**
 * Build a Client instance from context.
 */
export let buildClientConfig = (ctx: {
  auth: { token: string; companySlug: string };
  config: Record<string, unknown>;
}) => {
  return {
    token: ctx.auth.token,
    companySlug:
      ctx.auth.companySlug ||
      (typeof ctx.config.companySlug === 'string' ? ctx.config.companySlug : '')
  };
};

export let getTotalCount = (response: any): number | undefined => {
  let count =
    response?.meta?.total?.count ??
    response?.meta?.stats?.total?.count ??
    response?.meta?.total_count;
  return typeof count === 'number' ? count : undefined;
};
