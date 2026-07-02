import { createAxios } from 'slates';

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

    let response = await this.axios.post('', body);

    if (response.data.errors && response.data.errors.length > 0) {
      let errorMessages = response.data.errors.map((e: any) => e.message).join('; ');
      throw new Error(`Bitquery GraphQL error: ${errorMessages}`);
    }

    return response.data.data;
  }

  getApiVersion(): string {
    return this.apiVersion;
  }
}
