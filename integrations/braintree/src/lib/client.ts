import { createAxios } from 'slates';
import { braintreeApiError, braintreeGraphQLError } from './errors';

let GRAPHQL_URLS: Record<string, string> = {
  sandbox: 'https://payments.sandbox.braintree-api.com/graphql',
  production: 'https://payments.braintree-api.com/graphql'
};

let REST_URLS: Record<string, string> = {
  sandbox: 'https://api.sandbox.braintreegateway.com:443',
  production: 'https://api.braintreegateway.com:443'
};

let BRAINTREE_VERSION = '2024-09-01';

export class BraintreeGraphQLClient {
  private http: ReturnType<typeof createAxios>;

  constructor(params: {
    token: string;
    environment: string;
  }) {
    let baseURL = GRAPHQL_URLS[params.environment] || GRAPHQL_URLS.production;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Basic ${params.token}`,
        'Braintree-Version': BRAINTREE_VERSION,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    operation = 'GraphQL request'
  ): Promise<T> {
    let body: Record<string, any> = { query };
    if (variables) {
      body.variables = variables;
    }

    try {
      let response = await this.http.post('', body);
      let data = response.data;
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        throw braintreeGraphQLError(data.errors, operation, data.extensions?.requestId);
      }
      return data.data;
    } catch (error) {
      throw braintreeApiError(error, operation);
    }
  }
}

export class BraintreeRestClient {
  private http: ReturnType<typeof createAxios>;
  private merchantPath: string;

  constructor(params: {
    token: string;
    merchantId: string;
    environment: string;
  }) {
    let baseURL = REST_URLS[params.environment] || REST_URLS.production;
    this.merchantPath = `/merchants/${params.merchantId}`;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Basic ${params.token}`,
        'Content-Type': 'application/xml',
        Accept: 'application/xml'
      },
      timeout: 60000
    });
  }

  async get(path: string): Promise<string> {
    try {
      let response = await this.http.get(`${this.merchantPath}${path}`, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      throw braintreeApiError(error, `GET ${path}`);
    }
  }

  async post(path: string, body: string): Promise<string> {
    try {
      let response = await this.http.post(`${this.merchantPath}${path}`, body, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      throw braintreeApiError(error, `POST ${path}`);
    }
  }

  async put(path: string, body: string): Promise<string> {
    try {
      let response = await this.http.put(`${this.merchantPath}${path}`, body, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      throw braintreeApiError(error, `PUT ${path}`);
    }
  }

  async delete(path: string): Promise<string> {
    try {
      let response = await this.http.delete(`${this.merchantPath}${path}`, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      throw braintreeApiError(error, `DELETE ${path}`);
    }
  }
}
