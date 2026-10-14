import { createApiServiceError, isApiErrorRecord } from 'slates';

// Translate the existing tool schemas to the documented GraphQL input names and list shapes.
export let normalizeFunnelFilters = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeFunnelFilters);
  if (!isApiErrorRecord(value)) return value;
  let result: Record<string, unknown> = {};
  for (let [key, field] of Object.entries(value)) {
    if (['must', 'should', 'must_not'].includes(key) && Array.isArray(field)) {
      result[key] = field.flat().map(normalizeFunnelFilters);
    } else if (key === 'event_properties' && Array.isArray(field)) {
      result[key] = field.map(property => {
        if (!isApiErrorRecord(property) || typeof property.name !== 'string') {
          throw createApiServiceError('Each custom event property filter requires a name.');
        }
        let { string, int, bool, float, ...rest } = property;
        return normalizeFunnelFilters({
          ...rest,
          value_str: rest.value_str ?? string,
          value_int: rest.value_int ?? int,
          value_bool: rest.value_bool ?? bool,
          value_float: rest.value_float ?? float
        });
      });
    } else {
      result[key] = normalizeFunnelFilters(field);
    }
  }
  return result;
};

export let normalizeFunnelCompute = (compute: unknown[]) => {
  if (compute.length !== 1) {
    throw createApiServiceError(
      'LiveSession accepts one computation configuration per funnel. Supply exactly one compute item.'
    );
  }
  return normalizeFunnelFilters(compute[0]);
};

export let FUNNEL_FIELDS = `
  funnel_id
  name
  description
  website_id
  segment_id
  is_favourite
  is_owner
  is_public
  created_by_agent_id
  created_by_login
`;

export let FUNNEL_CREATE_MUTATION = `
  mutation funnelCreate($input: FunnelInput!) {
    funnelCreate(input: $input) {
      ${FUNNEL_FIELDS}
    }
  }
`;

export let FUNNEL_DELETE_MUTATION = `
  mutation funnelDelete($funnel_id: ID!) {
    funnelDelete(funnel_id: $funnel_id)
  }
`;

export let FUNNEL_UPDATE_MUTATION = `
  mutation updateFunnel($funnel_id: ID!, $input: FunnelInput!) {
    updateFunnel(funnel_id: $funnel_id, input: $input) {
      ${FUNNEL_FIELDS}
    }
  }
`;

export let FUNNEL_SET_FAVOURITE_MUTATION = `
  mutation funnelSetFavourite($funnel_id: ID!, $input: FunnelSetFavouriteInput!) {
    funnelSetFavourite(funnel_id: $funnel_id, input: $input)
  }
`;

export let FUNNEL_COMPUTE_MUTATION = `
  mutation funnelCompute($input: FunnelComputeInput!, $website_id: ID) {
    funnelCompute(input: $input, website_id: $website_id) {
      cached_response {
        ttl
        id
        computed_at
        fresh
      }
      total_sessions
      total_visitors
      total_events
      conversion_value {
        value
        label
      }
      steps {
        sessions
        visitors
        events
      }
    }
  }
`;
