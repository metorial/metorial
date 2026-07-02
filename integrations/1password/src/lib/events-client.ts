import { createAxios } from 'slates';
import { onePasswordApiError } from './errors';

let EVENTS_API_BASE_URLS: Record<string, string> = {
  us: 'https://events.1password.com',
  ca: 'https://events.1password.ca',
  eu: 'https://events.1password.eu',
  enterprise: 'https://events.ent.1password.com'
};

export let getEventsBaseUrl = (region: string): string => {
  return EVENTS_API_BASE_URLS[region] || EVENTS_API_BASE_URLS.us!;
};

export interface AuditEvent {
  uuid: string;
  timestamp: string;
  actorUuid: string;
  actorDetails: {
    uuid: string;
    name: string;
    email: string;
  };
  action: string;
  objectType: string;
  objectUuid: string;
  objectDetails: {
    uuid: string;
    name?: string;
    email?: string;
    type?: string;
  };
  auxId: number;
  auxUuid: string;
  auxDetails: {
    uuid: string;
    name?: string;
    email?: string;
    type?: string;
  };
  session: {
    uuid: string;
    loginTime: string;
    deviceUuid: string;
    ip: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface ItemUsageEvent {
  uuid: string;
  timestamp: string;
  usedVersion: number;
  vaultUuid: string;
  itemUuid: string;
  user: {
    uuid: string;
    name: string;
    email: string;
  };
  client: {
    appName: string;
    appVersion: string;
    platformName: string;
    platformVersion: string;
    osName: string;
    osVersion: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  action: string;
}

export interface SignInAttemptEvent {
  uuid: string;
  sessionUuid: string;
  timestamp: string;
  category: string;
  type: string;
  country: string;
  details: {
    value: string;
  };
  targetUser: {
    uuid: string;
    name: string;
    email: string;
  };
  client: {
    appName: string;
    appVersion: string;
    platformName: string;
    platformVersion: string;
    osName: string;
    osVersion: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface EventsResponse<T> {
  cursor: string;
  hasMore: boolean;
  items: T[];
}

export interface EventsCursorRequest {
  limit?: number;
  startTime?: string;
  endTime?: string;
  cursor?: string;
}

export class EventsClient {
  private http;

  constructor(config: { token: string; region: string }) {
    let baseUrl = getEventsBaseUrl(config.region);
    this.http = createAxios({
      baseURL: `${baseUrl}/api/v1`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getAuditEvents(params: EventsCursorRequest): Promise<EventsResponse<AuditEvent>> {
    let body = this.buildRequestBody(params);
    try {
      let res = await this.http.post('/auditevents', body);
      return res.data;
    } catch (error) {
      throw onePasswordApiError(error, 'get audit events');
    }
  }

  async getItemUsageEvents(
    params: EventsCursorRequest
  ): Promise<EventsResponse<ItemUsageEvent>> {
    let body = this.buildRequestBody(params);
    try {
      let res = await this.http.post('/itemusages', body);
      return res.data;
    } catch (error) {
      throw onePasswordApiError(error, 'get item usage events');
    }
  }

  async getSignInAttemptEvents(
    params: EventsCursorRequest
  ): Promise<EventsResponse<SignInAttemptEvent>> {
    let body = this.buildRequestBody(params);
    try {
      let res = await this.http.post('/signinattempts', body);
      return res.data;
    } catch (error) {
      throw onePasswordApiError(error, 'get sign-in attempt events');
    }
  }

  private buildRequestBody(params: EventsCursorRequest): Record<string, unknown> {
    if (params.cursor) {
      return { cursor: params.cursor };
    }
    let body: Record<string, unknown> = {};
    if (params.limit) body.limit = params.limit;
    if (params.startTime) body.start_time = params.startTime;
    if (params.endTime) body.end_time = params.endTime;
    return body;
  }
}
