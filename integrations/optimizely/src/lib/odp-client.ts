import { createAxios } from 'slates';
import { optimizelyErrorMapping } from './api-errors';

export class OdpClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string, region: 'us' | 'eu' | 'apac' = 'us') {
    this.axios = createAxios({
      errorMapping: optimizelyErrorMapping,
      timeout: 30000,
      baseURL: {
        us: 'https://api.zaius.com',
        eu: 'https://api.eu1.odp.optimizely.com',
        apac: 'https://api.au1.odp.optimizely.com'
      }[region],
      headers: {
        'x-api-key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Customer Profiles
  async getCustomer(identifierField: string, identifierValue: string) {
    let response = await this.axios.get(`/v3/profiles`, {
      params: {
        [identifierField]: identifierValue
      }
    });
    return response.data;
  }

  async upsertCustomer(data: {
    identifiers: Record<string, string>;
    attributes?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/profiles', [data]);
    return response.data;
  }

  // Events
  async sendEvent(data: {
    type: string;
    action: string;
    identifiers: Record<string, string>;
    data?: Record<string, any>;
  }) {
    let response = await this.axios.post('/v3/events', [data]);
    return response.data;
  }

  async sendEvents(
    events: Array<{
      type: string;
      action: string;
      identifiers: Record<string, string>;
      data?: Record<string, any>;
    }>
  ) {
    let response = await this.axios.post('/v3/events', events);
    return response.data;
  }

  async queryEvents(params: {
    identifierField: string;
    identifierValue: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.axios.get('/v3/events', {
      params: {
        [params.identifierField]: params.identifierValue,
        event_type: params.eventType,
        limit: params.limit,
        offset: params.offset
      }
    });
    return response.data;
  }

  // Segments
  async listSegments() {
    let response = await this.axios.get('/v3/segments');
    return response.data;
  }

  async getCustomerSegments(identifierField: string, identifierValue: string) {
    let response = await this.axios.get(
      `/v3/profiles/${encodeURIComponent(identifierField)}/${encodeURIComponent(identifierValue)}/segments`
    );
    return response.data;
  }

  // Objects (schema)
  async listObjects() {
    let response = await this.axios.get('/v3/schema/objects');
    return response.data;
  }

  async getObject(objectType: string) {
    let response = await this.axios.get(
      `/v3/schema/objects/${encodeURIComponent(objectType)}`
    );
    return response.data;
  }

  // Fields
  async listFields(objectType: string) {
    let response = await this.axios.get(
      `/v3/schema/objects/${encodeURIComponent(objectType)}/fields`
    );
    return response.data;
  }
}
