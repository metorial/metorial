import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://heapanalytics.com',
  eu: 'https://c.eu.heap-api.com'
};

export interface TrackEventParams {
  identity?: string;
  userId?: string;
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
  idempotencyKey?: string;
  sessionId?: string;
}

export interface BulkTrackEventItem {
  identity?: string;
  userId?: string;
  event: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
  idempotencyKey?: string;
  sessionId?: string;
}

export interface UserPropertiesParams {
  identity: string;
  properties: Record<string, string | number | boolean>;
}

export interface AccountPropertiesParams {
  accountId: string;
  properties: Record<string, string | number | boolean>;
}

export interface IdentifyParams {
  userId: string;
  identity: string;
  timestamp?: string;
}

export class HeapClient {
  private axios: ReturnType<typeof createAxios>;
  private appId: string;
  private apiKey: string;

  constructor(config: { appId: string; apiKey: string; datacenter: string }) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;

    let baseURL = BASE_URLS[config.datacenter] || BASE_URLS.us;

    this.axios = createAxios({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async trackEvent(params: TrackEventParams): Promise<void> {
    let body: Record<string, unknown> = {
      app_id: this.appId,
      event: params.event
    };

    if (params.identity) body.identity = params.identity;
    if (params.userId) body.user_id = params.userId;
    if (params.properties) body.properties = params.properties;
    if (params.timestamp) body.timestamp = params.timestamp;
    if (params.idempotencyKey) body.idempotency_key = params.idempotencyKey;
    if (params.sessionId) body.session_id = params.sessionId;

    await this.axios.post('/api/track', body);
  }

  async bulkTrackEvents(events: BulkTrackEventItem[]): Promise<void> {
    let mappedEvents = events.map(e => {
      let item: Record<string, unknown> = {
        event: e.event
      };
      if (e.identity) item.identity = e.identity;
      if (e.userId) item.user_id = e.userId;
      if (e.properties) item.properties = e.properties;
      if (e.timestamp) item.timestamp = e.timestamp;
      if (e.idempotencyKey) item.idempotency_key = e.idempotencyKey;
      if (e.sessionId) item.session_id = e.sessionId;
      return item;
    });

    await this.axios.post('/api/track', {
      app_id: this.appId,
      events: mappedEvents
    });
  }

  async addUserProperties(params: UserPropertiesParams): Promise<void> {
    await this.axios.post('/api/add_user_properties', {
      app_id: this.appId,
      identity: params.identity,
      properties: params.properties
    });
  }

  async bulkAddUserProperties(users: UserPropertiesParams[]): Promise<void> {
    let mappedUsers = users.map(u => ({
      identity: u.identity,
      properties: u.properties
    }));

    await this.axios.post('/api/add_user_properties', {
      app_id: this.appId,
      users: mappedUsers
    });
  }

  async addAccountProperties(params: AccountPropertiesParams): Promise<void> {
    await this.axios.post('/api/add_account_properties', {
      app_id: this.appId,
      account_id: params.accountId,
      properties: params.properties
    });
  }

  async bulkAddAccountProperties(accounts: AccountPropertiesParams[]): Promise<void> {
    let mappedAccounts = accounts.map(a => ({
      account_id: a.accountId,
      properties: a.properties
    }));

    await this.axios.post('/api/add_account_properties', {
      app_id: this.appId,
      accounts: mappedAccounts
    });
  }

  async identifyUser(params: IdentifyParams): Promise<void> {
    let body: Record<string, unknown> = {
      app_id: this.appId,
      user_id: params.userId,
      identity: params.identity
    };

    if (params.timestamp) body.timestamp = params.timestamp;

    await this.axios.post('/api/v1/identify', body);
  }

  async getAuthToken(): Promise<string> {
    let credentials = btoa(`${this.appId}:${this.apiKey}`);

    let response = await this.axios.post('/api/public/v0/auth_token', null, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.auth_token;
  }

  async deleteUser(params: { identity?: string; userId?: string }): Promise<void> {
    let authToken = await this.getAuthToken();

    // First, look up the user via SCIM to get their SCIM ID
    let filter = params.identity
      ? `userName eq "${params.identity}"`
      : `externalId eq "${params.userId}"`;

    let lookupResponse = await this.axios.get(`/scim/v2/${this.appId}/Users`, {
      params: { filter },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    let resources = lookupResponse.data?.Resources || [];
    if (resources.length === 0) {
      throw new Error(
        `No user found matching the provided ${params.identity ? 'identity' : 'userId'}`
      );
    }

    let scimUserId = resources[0].id;

    await this.axios.delete(`/scim/v2/${this.appId}/Users/${scimUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
  }
}
