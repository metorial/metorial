import { createAxios } from 'slates';
import { segmentApiError } from './errors';

export class TrackingClient {
  private http: ReturnType<typeof createAxios>;

  constructor(writeKey: string, region: string = 'us') {
    let baseURL =
      region === 'eu' ? 'https://events.eu1.segmentapis.com' : 'https://api.segment.io';

    let encoded = btoa(`${writeKey}:`);

    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });

    this.http.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(segmentApiError(error, 'tracking request'))
    );
  }

  async identify(data: {
    userId?: string;
    anonymousId?: string;
    traits?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/identify', data);
    return response.data;
  }

  async track(data: {
    userId?: string;
    anonymousId?: string;
    event: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/track', data);
    return response.data;
  }

  async page(data: {
    userId?: string;
    anonymousId?: string;
    name?: string;
    category?: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/page', data);
    return response.data;
  }

  async screen(data: {
    userId?: string;
    anonymousId?: string;
    name?: string;
    category?: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/screen', data);
    return response.data;
  }

  async group(data: {
    userId?: string;
    anonymousId?: string;
    groupId: string;
    traits?: Record<string, any>;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/group', data);
    return response.data;
  }

  async alias(data: {
    previousId: string;
    userId: string;
    context?: Record<string, any>;
    timestamp?: string;
    integrations?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/alias', data);
    return response.data;
  }

  async batch(data: {
    batch: Array<{
      type: string;
      [key: string]: any;
    }>;
    context?: Record<string, any>;
  }) {
    let response = await this.http.post('/v1/batch', data);
    return response.data;
  }
}
