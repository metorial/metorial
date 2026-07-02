import { createAxios } from 'slates';

export class ConnectClient {
  private http;

  constructor(private serviceKey: string) {
    this.http = createAxios({
      baseURL: 'https://connect.ifttt.com'
    });
  }

  private headers() {
    return {
      'IFTTT-Service-Key': this.serviceKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  // --- User ---

  async getServiceInfo() {
    let response = await this.http.get('/v2/me', {
      headers: this.headers()
    });
    return response.data?.data;
  }

  // --- Connection Management ---

  async getConnection(connectionId: string, userId?: string) {
    let params: Record<string, string> = {};
    if (userId) params.user_id = userId;

    let response = await this.http.get(`/v2/connections/${connectionId}`, {
      headers: this.headers(),
      params
    });
    return response.data?.data;
  }

  async updateUserConnection(
    connectionId: string,
    userId: string,
    configuration: Record<string, any>
  ) {
    let response = await this.http.put(
      `/v2/connections/${connectionId}/user_connection`,
      configuration,
      {
        headers: this.headers(),
        params: { user_id: userId }
      }
    );
    return response.data?.data;
  }

  async refreshFieldLabels(connectionId: string, userId: string) {
    let response = await this.http.post(
      `/v2/connections/${connectionId}/user_connection/refresh`,
      {},
      {
        headers: this.headers(),
        params: { user_id: userId }
      }
    );
    return response.data?.data;
  }

  async getFieldOptions(
    connectionId: string,
    type: string,
    typeId: string,
    fieldSlug: string,
    userId?: string
  ) {
    let params: Record<string, string> = {};
    if (userId) params.user_id = userId;

    let response = await this.http.get(
      `/v2/connections/${connectionId}/${type}/${typeId}/field_options/${fieldSlug}`,
      {
        headers: this.headers(),
        params
      }
    );
    return response.data?.data;
  }

  // --- Triggers ---

  async testTrigger(
    connectionId: string,
    triggerId: string,
    userId: string,
    userFeatureId?: string
  ) {
    let body: Record<string, string> = { user_id: userId };
    if (userFeatureId) body.user_feature_id = userFeatureId;

    let response = await this.http.post(
      `/v2/connections/${connectionId}/triggers/${triggerId}/test`,
      body,
      {
        headers: this.headers(),
        params: { user_id: userId }
      }
    );
    return response.data;
  }

  // --- Actions ---

  async runAction(
    connectionId: string,
    actionId: string,
    userId: string,
    fields?: Record<string, any>,
    userFeatureId?: string
  ) {
    let body: Record<string, any> = { user_id: userId };
    if (fields) body.fields = fields;
    if (userFeatureId) body.user_feature_id = userFeatureId;

    let response = await this.http.post(
      `/v2/connections/${connectionId}/actions/${actionId}/run`,
      body,
      {
        headers: this.headers(),
        params: { user_id: userId }
      }
    );
    return response.data;
  }

  // --- Queries ---

  async performQuery(
    connectionId: string,
    queryId: string,
    userId: string,
    fields?: Record<string, any>,
    limit?: number,
    cursor?: string
  ) {
    let body: Record<string, any> = { user_id: userId };
    if (fields) body.fields = fields;
    if (limit) body.limit = limit;
    if (cursor) body.cursor = cursor;

    let response = await this.http.post(
      `/v2/connections/${connectionId}/queries/${queryId}/perform`,
      body,
      {
        headers: this.headers(),
        params: { user_id: userId }
      }
    );
    return response.data?.data;
  }

  // --- Realtime API ---

  async sendRealtimeNotification(
    notifications: Array<{ userId?: string; triggerIdentity?: string }>
  ) {
    let http = createAxios({
      baseURL: 'https://realtime.ifttt.com'
    });

    let data = notifications.map(n => {
      let item: Record<string, string> = {};
      if (n.userId) item.user_id = n.userId;
      if (n.triggerIdentity) item.trigger_identity = n.triggerIdentity;
      return item;
    });

    let response = await http.post(
      '/v1/notifications',
      { data },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // --- User Token ---

  async getUserToken(userId: string, accessToken: string) {
    let response = await this.http.post(
      '/v2/user_token',
      {},
      {
        headers: this.headers(),
        params: { user_id: userId, access_token: accessToken }
      }
    );
    return response.data?.data;
  }
}
