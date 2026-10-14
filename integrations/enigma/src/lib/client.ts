import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  pickDefined
} from 'slates';

export interface GraphqlResponse<T> {
  data?: T | null;
  errors?: { message: string; locations?: unknown; path?: unknown }[];
}

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
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.enigma.com',
      timeout: 60000,
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Enigma',
          reason: 'enigma_api_error',
          formatMessage: ({ status, statusLabel, message }) => {
            let remediation =
              status === 401
                ? ' Check the API key in your connection.'
                : status === 403
                  ? ' Check that your account has access to the requested data or add-on.'
                  : status === 404
                    ? ' For a business lookup, match the business again to obtain its current ID.'
                    : status === 429
                      ? ' Wait before retrying and check your account rate limits.'
                      : '';
            return `Enigma API request failed: ${statusLabel}${message}${remediation}`;
          }
        })
    });
  }

  async matchBusiness(input: MatchBusinessInput, options: MatchBusinessOptions = {}) {
    let name = !!input.name?.trim();
    let address = !!input.address && Object.values(input.address).some(value => value?.trim());
    let person = !!input.person && Object.values(input.person).some(value => value?.trim());
    let website = !!input.website?.trim();
    if (website && options.entityType === 'business_location') {
      throw createApiServiceError(
        'Website matching is only available for business entities. Remove website or choose entityType "business".'
      );
    }
    if (!website && [name, address, person].filter(Boolean).length < 2) {
      throw createApiServiceError(
        'Provide a website, or at least two of business name, address, and associated person.'
      );
    }
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

    let response = await this.api.post('/businesses/match', body, {
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

    let response = await this.api.get(`/businesses/${encodeURIComponent(enigmaId)}`, {
      params
    });

    return response.data;
  }

  async verifyBusiness(input: KybInput, options: KybOptions = {}) {
    let name = !!input.name?.trim();
    let address = !!input.address && Object.values(input.address).some(value => value?.trim());
    let person =
      !!input.person &&
      [input.person.firstName, input.person.lastName].some(value => value?.trim());
    if ([name, address, person].filter(Boolean).length < 2) {
      throw createApiServiceError(
        'KYB verification requires at least two of business name, address, and associated person.'
      );
    }
    if (
      input.address &&
      ![input.address.city, input.address.state, input.address.postalCode].some(value =>
        value?.trim()
      )
    ) {
      throw createApiServiceError('A KYB address must include city, state, or postalCode.');
    }
    if (input.tin !== undefined && !/^\d{9}$/.test(input.tin)) {
      throw createApiServiceError('Provide tin as exactly 9 digits without dashes.');
    }
    if (input.person?.ssn !== undefined && !/^\d{9}$/.test(input.person.ssn)) {
      throw createApiServiceError('Provide person.ssn as exactly 9 digits without dashes.');
    }
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
        ...(p.dob && { date_of_birth: p.dob })
      }));
    }

    let params: Record<string, string> = {};
    if (options.package) params.package = options.package;
    if (options.attrs && options.attrs.length > 0) params.attrs = options.attrs.join(',');
    if (options.matchThreshold !== undefined)
      params.match_threshold = String(options.matchThreshold);
    if (options.topN !== undefined) params.top_n = String(options.topN);

    let response = await this.api.post('/v1/kyb/', body, {
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
        ...(p.dob && { date_of_birth: p.dob })
      }));
    }

    let params: Record<string, string> = {};
    if (options.package) params.package = options.package;
    if (options.attrs && options.attrs.length > 0) params.attrs = options.attrs.join(',');
    if (options.matchThreshold !== undefined)
      params.match_threshold = String(options.matchThreshold);
    if (options.topN !== undefined) params.top_n = String(options.topN);

    let response = await this.api.post('/v1/kyb/', body, {
      params
    });

    return response.data;
  }

  async graphqlQuery<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>
  ) {
    let response = await this.api.post<GraphqlResponse<T>>(
      '/graphql',
      pickDefined({ query, variables })
    );

    return response.data;
  }

  async graphqlData<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    let result = await this.graphqlQuery<T>(query, variables);
    if (result.errors?.length) {
      throw createApiServiceError(
        `Enigma GraphQL request failed: ${extractApiErrorMessage({ response: { data: result } })}`,
        { reason: 'enigma_graphql_error' }
      );
    }
    if (result.data === undefined || result.data === null) {
      throw createApiServiceError(
        'Enigma returned no GraphQL data. Check the query and API access.'
      );
    }
    return result.data;
  }
}
