/**
 * Extracts a flat resource object from a JSON:API resource.
 * Merges id, type, and attributes into a single object.
 */
export let flattenResource = (resource: any): any => {
  if (!resource) return null;
  return {
    resourceId: resource.id,
    resourceType: resource.type,
    ...resource.attributes
  };
};

/**
 * Extracts a list of flat resources from a JSON:API response.
 */
export let flattenResourceList = (data: any): any[] => {
  if (!data?.data) return [];
  let items = Array.isArray(data.data) ? data.data : [data.data];
  return items.map(flattenResource);
};

/**
 * Extracts a single flat resource from a JSON:API response.
 */
export let flattenSingleResource = (data: any): any => {
  if (!data?.data) return null;
  return flattenResource(data.data);
};

/**
 * Build a Client instance from context.
 */
export let buildClientConfig = (ctx: {
  auth: { token: string; companySlug: string };
  config: { companySlug?: string };
}) => {
  return {
    token: ctx.auth.token,
    companySlug: ctx.config.companySlug || ctx.auth.companySlug
  };
};
