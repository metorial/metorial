import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue
} from 'slates';

type Params = Record<string, string | number | boolean | undefined>;

// Keep the original V3 client separate: saved connections and legacy tools must
// never acquire a different host, credential interpretation, or request shape.
export class PlacesClient {
  private api: ReturnType<typeof createAxios>;

  constructor(auth: { token: string; credentialType?: 'service_key' }) {
    if (auth.credentialType !== 'service_key') {
      throw createApiServiceError(
        'Connect with a Places Service API Key to use current Places tools. Legacy API keys and V2 OAuth connections use different credentials.'
      );
    }
    if (!auth.token.trim()) {
      throw createApiServiceError('A Places Service API Key is required.');
    }
    this.api = createAxios({
      baseURL: 'https://places-api.foursquare.com',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: 'application/json',
        'X-Places-Api-Version': '2025-06-17'
      }
    });
  }

  async request(method: 'GET' | 'POST', path: string, params?: Params) {
    try {
      let response = await this.api.request({ method, url: path, params });
      return {
        data: response.data,
        requestId: getResponseHeaderValue(response.headers, 'x-fsq-request-id')
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Foursquare Places',
        reason: 'foursquare_places_request_failed',
        operation: `${method} ${path}`,
        extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
        nestedKeys: ['errors', 'error']
      });
    }
  }
}
