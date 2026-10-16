import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

let V1_ENDPOINT = 'https://graphql.bitquery.io';
let V2_ENDPOINT = 'https://streaming.bitquery.io/graphql';

export interface BitqueryClientConfig {
  token: string;
  apiVersion: 'v1' | 'v2';
}

export class BitqueryClient {
  private axios: ReturnType<typeof createAxios>;
  private apiVersion: 'v1' | 'v2';

  constructor(config: BitqueryClientConfig) {
    this.apiVersion = config.apiVersion;

    let baseURL = config.apiVersion === 'v1' ? V1_ENDPOINT : V2_ENDPOINT;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiVersion === 'v1') {
      headers['X-API-KEY'] = config.token;
    } else {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.axios = createAxios({
      baseURL,
      headers
    });
  }

  async query(graphqlQuery: string, variables?: Record<string, any>): Promise<any> {
    let body: Record<string, any> = { query: graphqlQuery };
    if (variables && Object.keys(variables).length > 0) {
      body.variables = variables;
    }

    try {
      let response = await this.axios.post('', body);
      let payload: unknown = response.data;
      if (!isApiErrorRecord(payload)) {
        throw createApiServiceError('Bitquery returned an invalid GraphQL response.', {
          reason: 'bitquery_invalid_response'
        });
      }
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        throw buildApiServiceError(
          { response: { status: response.status, data: payload } },
          {
            providerLabel: 'Bitquery',
            operation: 'GraphQL query',
            reason: 'bitquery_graphql_error',
            fallbackMessage: 'The query was rejected.'
          }
        );
      }
      if (!isApiErrorRecord(payload.data)) {
        throw createApiServiceError('Bitquery did not return GraphQL query data.', {
          reason: 'bitquery_invalid_response'
        });
      }
      return payload.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Bitquery',
        operation: 'GraphQL query',
        reason: 'bitquery_api_error',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  requireV2(feature: string) {
    if (this.apiVersion === 'v1') {
      throw createApiServiceError(
        `${feature} require a Bitquery V2 connection. Use a V2 bearer token or client credentials.`,
        {
          reason: 'bitquery_api_version'
        }
      );
    }
  }

  getApiVersion(): string {
    return this.apiVersion;
  }
}

export let toBitqueryNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  throw createApiServiceError('Bitquery returned an invalid numeric value.', {
    reason: 'bitquery_invalid_response'
  });
};
