import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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

export type BulkTrackEventItem = TrackEventParams;

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

export interface UserSelector {
  identity?: string;
  userId?: string;
}

export interface DeletionStatus {
  requestId: string;
  status: string;
  requestLocation?: string;
  deleted: boolean;
}

let validateIdentity = (identity: string) => {
  if (!identity.trim() || identity.length > 255) {
    throw createApiServiceError('User identity must contain 1 to 255 characters.');
  }
};

let validateUserId = (userId: string) => {
  if (!/^\d+$/.test(userId) || !Number.isSafeInteger(Number(userId))) {
    throw createApiServiceError(
      'userId must be a string containing a whole number between 0 and 2^53 - 1.'
    );
  }
};

let validateSelector = ({ identity, userId }: UserSelector) => {
  if ((identity !== undefined) === (userId !== undefined)) {
    throw createApiServiceError('Provide exactly one of identity or userId for each user.');
  }
  if (identity !== undefined) validateIdentity(identity);
  if (userId !== undefined) validateUserId(userId);
};

let validateBatch = (items: unknown[], label: string, maximum: number) => {
  if (items.length === 0 || items.length > maximum) {
    throw createApiServiceError(`Provide between 1 and ${maximum} ${label} per request.`);
  }
};

let validateUserProperties = (params: UserPropertiesParams) => {
  validateIdentity(params.identity);
  if (Object.keys(params.properties).some(key => key.toLowerCase() === 'id')) {
    throw createApiServiceError('User property names cannot be any casing of "id".');
  }
};

let mapEvent = (params: TrackEventParams) => {
  validateSelector(params);
  if (!params.event.trim() || params.event.length > 1024) {
    throw createApiServiceError('Event names must contain 1 to 1024 characters.');
  }
  return pickDefined({
    identity: params.identity,
    user_id: params.userId,
    event: params.event,
    properties: params.properties,
    timestamp: params.timestamp,
    idempotency_key: params.idempotencyKey,
    session_id: params.sessionId
  });
};

let parseDeletionStatus = (data: unknown): DeletionStatus => {
  if (
    !isApiErrorRecord(data) ||
    typeof data.deletion_request_id !== 'string' ||
    !data.deletion_request_id.trim() ||
    typeof data.status !== 'string' ||
    !data.status.trim() ||
    (data.deletion_request_location !== undefined &&
      typeof data.deletion_request_location !== 'string')
  ) {
    throw createApiServiceError('Heap returned an invalid deletion status response.', {
      reason: 'heap_invalid_response'
    });
  }
  return {
    requestId: data.deletion_request_id,
    status: data.status,
    requestLocation: data.deletion_request_location,
    deleted: data.status === 'complete'
  };
};

export class HeapClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private privacyAxios: ReturnType<typeof createAuthenticatedAxios>;
  private appId: string;
  private apiKey: string;
  private secrets: Set<string>;

  constructor(config: { appId: string; apiKey: string; datacenter: string }) {
    if (!config.appId.trim() || !config.apiKey.trim()) {
      throw createApiServiceError('Connect Heap with a nonempty App ID and API Key.');
    }
    let baseURL = BASE_URLS[config.datacenter];
    if (!baseURL) {
      throw createApiServiceError('Select either the us or eu Heap datacenter.');
    }
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.secrets = new Set([
      config.appId,
      config.apiKey,
      Buffer.from(`${config.appId}:${config.apiKey}`, 'utf8').toString('base64')
    ]);

    let createClient = (url: string) => {
      let client = createAuthenticatedAxios({
        baseURL: url,
        timeout: 30_000,
        errorAdapter: error => this.apiError(error)
      });
      client.interceptors.response.use(response => {
        if (
          isApiErrorRecord(response.data) &&
          typeof response.data.access_token === 'string'
        ) {
          this.secrets.add(response.data.access_token);
        }
        if (
          isApiErrorRecord(response.data) &&
          ((response.data.err !== undefined &&
            response.data.err !== null &&
            response.data.err !== false) ||
            (response.data.error !== undefined &&
              response.data.error !== null &&
              response.data.error !== false))
        ) {
          throw this.apiError({ response: { status: response.status, data: response.data } });
        }
        return response;
      });
      return client;
    };

    this.axios = createClient(baseURL);
    // Heap documents the privacy endpoints on this host for both US and EU accounts.
    this.privacyAxios = createClient('https://heapanalytics.com');
  }

  private apiError(error: unknown) {
    return buildApiServiceError(error, {
      providerLabel: 'Heap',
      reason: 'heap_api_error',
      parent: {},
      nestedKeys: ['err', 'error', 'errors'],
      extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
      formatMessage: ({ statusLabel, message }) => {
        let text = `Heap API request failed: ${statusLabel}${message}`;
        for (let secret of [...this.secrets].sort((a, b) => b.length - a.length)) {
          if (!secret) continue;
          for (let value of [secret, encodeURIComponent(secret)]) {
            text = text.split(value).join('[redacted]');
          }
        }
        return text;
      }
    });
  }

  async trackEvent(params: TrackEventParams): Promise<void> {
    await this.axios.post('/api/track', { app_id: this.appId, ...mapEvent(params) });
  }

  async bulkTrackEvents(events: BulkTrackEventItem[]): Promise<void> {
    validateBatch(events, 'events', 1000);
    await this.axios.post('/api/track', {
      app_id: this.appId,
      events: events.map(mapEvent)
    });
  }

  async addUserProperties(params: UserPropertiesParams): Promise<void> {
    validateUserProperties(params);
    await this.axios.post('/api/add_user_properties', {
      app_id: this.appId,
      identity: params.identity,
      properties: params.properties
    });
  }

  async bulkAddUserProperties(users: UserPropertiesParams[]): Promise<void> {
    validateBatch(users, 'users', 1000);
    for (let user of users) validateUserProperties(user);
    await this.axios.post('/api/add_user_properties', {
      app_id: this.appId,
      users: users.map(user => ({ identity: user.identity, properties: user.properties }))
    });
  }

  async addAccountProperties(params: AccountPropertiesParams): Promise<void> {
    if (!params.accountId.trim()) {
      throw createApiServiceError('Provide a nonempty accountId.');
    }
    await this.axios.post('/api/add_account_properties', {
      app_id: this.appId,
      account_id: params.accountId,
      properties: params.properties
    });
  }

  async bulkAddAccountProperties(accounts: AccountPropertiesParams[]): Promise<void> {
    validateBatch(accounts, 'accounts', 1000);
    if (accounts.some(account => !account.accountId.trim())) {
      throw createApiServiceError('Provide a nonempty accountId for each account.');
    }
    await this.axios.post('/api/add_account_properties', {
      app_id: this.appId,
      accounts: accounts.map(account => ({
        account_id: account.accountId,
        properties: account.properties
      }))
    });
  }

  async identifyUser(params: IdentifyParams): Promise<void> {
    validateUserId(params.userId);
    validateIdentity(params.identity);
    await this.axios.post(
      '/api/v1/identify',
      pickDefined({
        app_id: this.appId,
        user_id: params.userId,
        identity: params.identity,
        timestamp: params.timestamp
      })
    );
  }

  async getAuthToken(): Promise<string> {
    let credentials = Buffer.from(`${this.appId}:${this.apiKey}`, 'utf8').toString('base64');
    let response = await this.privacyAxios.post('/api/public/v0/auth_token', null, {
      headers: { Authorization: `Basic ${credentials}` }
    });
    if (
      !isApiErrorRecord(response.data) ||
      typeof response.data.access_token !== 'string' ||
      !response.data.access_token.trim()
    ) {
      throw createApiServiceError('Heap did not return a valid deletion access token.', {
        reason: 'heap_invalid_response'
      });
    }
    this.secrets.add(response.data.access_token);
    return response.data.access_token;
  }

  async deleteUsers(users: UserSelector[]): Promise<DeletionStatus> {
    validateBatch(users, 'users', 10_000);
    for (let user of users) validateSelector(user);
    let authToken = await this.getAuthToken();
    let response = await this.privacyAxios.post(
      '/api/public/v0/user_deletion',
      {
        users: users.map(user =>
          pickDefined({
            identity: user.identity,
            user_id: user.userId === undefined ? undefined : Number(user.userId)
          })
        )
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    return parseDeletionStatus(response.data);
  }

  async getDeletionStatus(requestId: string): Promise<DeletionStatus> {
    if (!requestId.trim()) {
      throw createApiServiceError('Provide the requestId returned by delete_user.');
    }
    let authToken = await this.getAuthToken();
    let response = await this.privacyAxios.get(
      `/api/public/v0/deletion_status/${encodeURIComponent(requestId)}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    let result = parseDeletionStatus(response.data);
    if (result.requestId !== requestId) {
      throw createApiServiceError('Heap returned a different deletion request ID.', {
        reason: 'heap_invalid_response'
      });
    }
    return result;
  }
}
