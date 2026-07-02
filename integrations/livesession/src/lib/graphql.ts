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
  compute {
    date_range { from to }
    type
    steps {
      name
      filters { must should must_not }
    }
    conversion_value { property_name value_type label }
    filters { must should must_not }
  }
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
