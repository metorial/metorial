import type { JsonApiResource } from './client';

export let flattenResource = (resource: JsonApiResource): Record<string, any> => {
  let result: Record<string, any> = {
    id: resource.id,
    type: resource.type,
    ...resource.attributes
  };

  if (resource.relationships) {
    for (let [key, rel] of Object.entries(resource.relationships)) {
      if (rel.data) {
        if (Array.isArray(rel.data)) {
          result[key] = rel.data.map(r => ({ id: r.id, type: r.type }));
        } else {
          result[`${key}Id`] = rel.data.id;
        }
      }
    }
  }

  return result;
};

export let buildFilterParams = (
  filters: Record<string, string | undefined>
): Record<string, string> => {
  let params: Record<string, string> = {};
  for (let [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params[`filter[${key}]`] = value;
    }
  }
  return params;
};

export let buildRelationship = (
  type: string,
  id: string | undefined
): Record<string, any> | undefined => {
  if (!id) return undefined;
  return {
    [type]: {
      data: { type, id }
    }
  };
};

export let mergeRelationships = (
  ...relationships: (Record<string, any> | undefined)[]
): Record<string, any> | undefined => {
  let merged: Record<string, any> = {};
  let hasAny = false;
  for (let rel of relationships) {
    if (rel) {
      Object.assign(merged, rel);
      hasAny = true;
    }
  }
  return hasAny ? merged : undefined;
};

export let cleanAttributes = (obj: Record<string, any>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
};
