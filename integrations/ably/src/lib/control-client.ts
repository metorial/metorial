import { createAxios } from 'slates';

export class AblyControlClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(accessToken: string) {
    this.axios = createAxios({
      baseURL: 'https://control.ably.net/v1',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Me ---

  async getTokenDetails(): Promise<any> {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // --- Apps ---

  async listApps(accountId: string): Promise<any[]> {
    let response = await this.axios.get(`/accounts/${encodeURIComponent(accountId)}/apps`);
    return response.data;
  }

  async createApp(
    accountId: string,
    app: {
      name: string;
      status?: string;
      tlsOnly?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/accounts/${encodeURIComponent(accountId)}/apps`,
      app
    );
    return response.data;
  }

  async updateApp(
    appId: string,
    app: {
      name?: string;
      status?: string;
      tlsOnly?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/apps/${encodeURIComponent(appId)}`, app);
    return response.data;
  }

  async deleteApp(appId: string): Promise<void> {
    await this.axios.delete(`/apps/${encodeURIComponent(appId)}`);
  }

  // --- Keys ---

  async listKeys(appId: string): Promise<any[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appId)}/keys`);
    return response.data;
  }

  async createKey(
    appId: string,
    key: {
      name: string;
      capability: Record<string, string[]>;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/apps/${encodeURIComponent(appId)}/keys`, key);
    return response.data;
  }

  async updateKey(
    appId: string,
    keyId: string,
    key: {
      name?: string;
      capability?: Record<string, string[]>;
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appId)}/keys/${encodeURIComponent(keyId)}`,
      key
    );
    return response.data;
  }

  async revokeKey(appId: string, keyId: string): Promise<void> {
    await this.axios.post(
      `/apps/${encodeURIComponent(appId)}/keys/${encodeURIComponent(keyId)}/revoke`
    );
  }

  // --- Namespaces ---

  async listNamespaces(appId: string): Promise<any[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appId)}/namespaces`);
    return response.data;
  }

  async createNamespace(
    appId: string,
    namespace: {
      id: string;
      persisted?: boolean;
      persistLast?: boolean;
      pushEnabled?: boolean;
      tlsOnly?: boolean;
      exposeTimeserial?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/apps/${encodeURIComponent(appId)}/namespaces`,
      namespace
    );
    return response.data;
  }

  async updateNamespace(
    appId: string,
    namespaceId: string,
    namespace: {
      persisted?: boolean;
      persistLast?: boolean;
      pushEnabled?: boolean;
      tlsOnly?: boolean;
      exposeTimeserial?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appId)}/namespaces/${encodeURIComponent(namespaceId)}`,
      namespace
    );
    return response.data;
  }

  async deleteNamespace(appId: string, namespaceId: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appId)}/namespaces/${encodeURIComponent(namespaceId)}`
    );
  }

  // --- Queues ---

  async listQueues(appId: string): Promise<any[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appId)}/queues`);
    return response.data;
  }

  async createQueue(
    appId: string,
    queue: {
      name: string;
      ttl?: number;
      maxLength?: number;
      region?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/apps/${encodeURIComponent(appId)}/queues`, queue);
    return response.data;
  }

  async deleteQueue(appId: string, queueId: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appId)}/queues/${encodeURIComponent(queueId)}`
    );
  }

  // --- Rules ---

  async listRules(appId: string): Promise<any[]> {
    let response = await this.axios.get(`/apps/${encodeURIComponent(appId)}/rules`);
    return response.data;
  }

  async getRule(appId: string, ruleId: string): Promise<any> {
    let response = await this.axios.get(
      `/apps/${encodeURIComponent(appId)}/rules/${encodeURIComponent(ruleId)}`
    );
    return response.data;
  }

  async createRule(
    appId: string,
    rule: {
      ruleType: string;
      requestMode: string;
      source: {
        channelFilter: string;
        type: string;
      };
      target: Record<string, any>;
      status?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/apps/${encodeURIComponent(appId)}/rules`, rule);
    return response.data;
  }

  async updateRule(
    appId: string,
    ruleId: string,
    rule: {
      ruleType?: string;
      requestMode?: string;
      source?: {
        channelFilter?: string;
        type?: string;
      };
      target?: Record<string, any>;
      status?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(
      `/apps/${encodeURIComponent(appId)}/rules/${encodeURIComponent(ruleId)}`,
      rule
    );
    return response.data;
  }

  async deleteRule(appId: string, ruleId: string): Promise<void> {
    await this.axios.delete(
      `/apps/${encodeURIComponent(appId)}/rules/${encodeURIComponent(ruleId)}`
    );
  }
}
