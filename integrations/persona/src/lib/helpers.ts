// Helper to normalize Persona API JSON:API response data into flat objects
export let normalizeResource = (data: any): Record<string, any> => {
  if (!data) return {};
  let result: Record<string, any> = {
    resourceId: data.id,
    resourceType: data.type
  };
  if (data.attributes) {
    Object.assign(result, data.attributes);
  }
  if (data.relationships) {
    let rels: Record<string, any> = {};
    for (let [key, val] of Object.entries(data.relationships as Record<string, any>)) {
      if (val?.data) {
        rels[key] = val.data;
      }
    }
    result.relationships = rels;
  }
  return result;
};

// Helper to normalize a list response
export let normalizeListResponse = (
  response: any
): {
  items: Record<string, any>[];
  nextCursor: string | undefined;
  previousCursor: string | undefined;
} => {
  let items = (response?.data || []).map(normalizeResource);
  let nextCursor = response?.links?.next ? extractCursor(response.links.next) : undefined;
  let previousCursor = response?.links?.prev ? extractCursor(response.links.prev) : undefined;
  return { items, nextCursor, previousCursor };
};

let extractCursor = (url: string): string | undefined => {
  try {
    let parsed = new URL(url, 'https://withpersona.com');
    return (
      parsed.searchParams.get('page[after]') ||
      parsed.searchParams.get('page[before]') ||
      undefined
    );
  } catch {
    return undefined;
  }
};
