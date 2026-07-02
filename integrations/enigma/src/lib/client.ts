import { createAxios } from 'slates';

let restApi = createAxios({
  baseURL: 'https://api.enigma.com'
});

export interface MatchBusinessInput {
  name?: string;
  website?: string;
  address?: {
    streetAddress1?: string;
    streetAddress2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  person?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface MatchBusinessOptions {
  entityType?: 'business' | 'business_location';
  matchThreshold?: number;
  topN?: number;
  showNonMatches?: boolean;
  prioritization?: 'MTX';
}

export interface LookupBusinessOptions {
  attributes?: string[];
  lookbackMonths?: number | '*';
}

export interface KybInput {
  name?: string;
  website?: string;
  address?: {
    streetAddress1?: string;
    streetAddress2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  tin?: string;
  person?: {
    firstName?: string;
    lastName?: string;
    ssn?: string;
  };
  personsToScreen?: Array<{
    firstName?: string;
    lastName?: string;
    dob?: string;
  }>;
}

export interface KybAdvancedInput {
  names?: string[];
  addresses?: Array<{
    streetAddress1?: string;
    streetAddress2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }>;
  websites?: string[];
  person?: {
    firstName?: string;
    lastName?: string;
    ssn?: string;
  };
  tins?: string[];
  personsToScreen?: Array<{
    firstName?: string;
    lastName?: string;
    dob?: string;
  }>;
}

export interface KybOptions {
  package?: 'identify' | 'verify';
  attrs?: string[];
  matchThreshold?: number;
  topN?: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'x-api-key': this.token,
      'content-type': 'application/json'
    };
  }

  async matchBusiness(input: MatchBusinessInput, options: MatchBusinessOptions = {}) {
    let body: Record<string, unknown> = {};

    if (input.name) body.name = input.name;
    if (input.website) body.website = input.website;
    if (input.address) {
      body.address = {
        ...(input.address.streetAddress1 && { street_address1: input.address.streetAddress1 }),
        ...(input.address.streetAddress2 && { street_address2: input.address.streetAddress2 }),
        ...(input.address.city && { city: input.address.city }),
        ...(input.address.state && { state: input.address.state }),
        ...(input.address.postalCode && { postal_code: input.address.postalCode })
      };
    }
    if (input.person) {
      body.person = {
        ...(input.person.firstName && { first_name: input.person.firstName }),
        ...(input.person.lastName && { last_name: input.person.lastName })
      };
    }

    let params: Record<string, string> = {};
    if (options.entityType) params.business_entity_type = options.entityType;
    if (options.matchThreshold !== undefined)
      params.match_threshold = String(options.matchThreshold);
    if (options.topN !== undefined) params.top_n = String(options.topN);
    if (options.showNonMatches) params.show_non_matches = '1';
    if (options.prioritization) params.prioritization = options.prioritization;

    let response = await restApi.post('/businesses/match', body, {
      headers: this.headers(),
      params
    });

    return response.data;
  }

  async lookupBusiness(enigmaId: string, options: LookupBusinessOptions = {}) {
    let params: Record<string, string> = {};
    if (options.attributes && options.attributes.length > 0) {
      params.attrs = options.attributes.join(',');
    }
    if (options.lookbackMonths !== undefined) {
      params.lookback_months = String(options.lookbackMonths);
    }

    let response = await restApi.get(`/businesses/${enigmaId}`, {
      headers: this.headers(),
      params
    });

    return response.data;
  }

  async verifyBusiness(input: KybInput, options: KybOptions = {}) {
    let body: Record<string, unknown> = {};

    if (input.name) body.name = input.name;
    if (input.website) body.website = input.website;
    if (input.tin) body.tin = input.tin;
    if (input.address) {
      body.address = {
        ...(input.address.streetAddress1 && { street_address1: input.address.streetAddress1 }),
        ...(input.address.streetAddress2 && { street_address2: input.address.streetAddress2 }),
        ...(input.address.city && { city: input.address.city }),
        ...(input.address.state && { state: input.address.state }),
        ...(input.address.postalCode && { postal_code: input.address.postalCode })
      };
    }
    if (input.person) {
      body.person = {
        ...(input.person.firstName && { first_name: input.person.firstName }),
        ...(input.person.lastName && { last_name: input.person.lastName }),
        ...(input.person.ssn && { ssn: input.person.ssn })
      };
    }
    if (input.personsToScreen && input.personsToScreen.length > 0) {
      body.persons_to_screen = input.personsToScreen.map(p => ({
        ...(p.firstName && { first_name: p.firstName }),
        ...(p.lastName && { last_name: p.lastName }),
        ...(p.dob && { dob: p.dob })
      }));
    }

    let params: Record<string, string> = {};
    if (options.package) params.package = options.package;
    if (options.attrs && options.attrs.length > 0) params.attrs = options.attrs.join(',');
    if (options.matchThreshold !== undefined)
      params.match_threshold = String(options.matchThreshold);
    if (options.topN !== undefined) params.top_n = String(options.topN);

    let response = await restApi.post('/v1/kyb/', body, {
      headers: this.headers(),
      params
    });

    return response.data;
  }

  async verifyBusinessAdvanced(input: KybAdvancedInput, options: KybOptions = {}) {
    let body: Record<string, unknown> = {
      data: {} as Record<string, unknown>
    };

    let data = body.data as Record<string, unknown>;

    if (input.names && input.names.length > 0) data.names = input.names;
    if (input.websites && input.websites.length > 0) data.websites = input.websites;
    if (input.tins && input.tins.length > 0) data.tins = input.tins;
    if (input.addresses && input.addresses.length > 0) {
      data.addresses = input.addresses.map(a => ({
        ...(a.streetAddress1 && { street_address1: a.streetAddress1 }),
        ...(a.streetAddress2 && { street_address2: a.streetAddress2 }),
        ...(a.city && { city: a.city }),
        ...(a.state && { state: a.state }),
        ...(a.postalCode && { postal_code: a.postalCode })
      }));
    }
    if (input.person) {
      data.persons = [
        {
          ...(input.person.firstName && { first_name: input.person.firstName }),
          ...(input.person.lastName && { last_name: input.person.lastName }),
          ...(input.person.ssn && { ssn: input.person.ssn })
        }
      ];
    }
    if (input.personsToScreen && input.personsToScreen.length > 0) {
      data.persons_to_screen = input.personsToScreen.map(p => ({
        ...(p.firstName && { first_name: p.firstName }),
        ...(p.lastName && { last_name: p.lastName }),
        ...(p.dob && { dob: p.dob })
      }));
    }

    let params: Record<string, string> = {};
    if (options.package) params.package = options.package;
    if (options.attrs && options.attrs.length > 0) params.attrs = options.attrs.join(',');
    if (options.matchThreshold !== undefined)
      params.match_threshold = String(options.matchThreshold);
    if (options.topN !== undefined) params.top_n = String(options.topN);

    let response = await restApi.post('/v1/kyb/', body, {
      headers: this.headers(),
      params
    });

    return response.data;
  }

  async graphqlQuery(query: string, variables?: Record<string, unknown>) {
    let body: Record<string, unknown> = { query };
    if (variables) body.variables = variables;

    let response = await restApi.post('/graphql', body, {
      headers: this.headers()
    });

    return response.data;
  }
}
