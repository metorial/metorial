import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.phantombuster.com/api/v2',
      headers: {
        'X-Phantombuster-Key-1': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Agents (Phantoms) ──

  async fetchAgent(agentId: string): Promise<any> {
    let response = await this.axios.get('/agents/fetch', {
      params: { id: agentId }
    });
    return response.data;
  }

  async fetchAllAgents(): Promise<any[]> {
    let response = await this.axios.get('/agents/fetch-all');
    return response.data;
  }

  async saveAgent(agent: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/agents/save', agent);
    return response.data;
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.axios.post('/agents/delete', { id: agentId });
  }

  async launchAgent(agentId: string, argument?: Record<string, any>): Promise<any> {
    let body: Record<string, any> = { id: agentId };
    if (argument) {
      body.argument = argument;
    }
    let response = await this.axios.post('/agents/launch', body);
    return response.data;
  }

  async stopAgent(agentId: string): Promise<void> {
    await this.axios.post('/agents/stop', { id: agentId });
  }

  async fetchAgentOutput(agentId: string): Promise<any> {
    let response = await this.axios.get('/agents/fetch-output', {
      params: { id: agentId }
    });
    return response.data;
  }

  // ── Containers ──

  async fetchContainer(containerId: string): Promise<any> {
    let response = await this.axios.get('/containers/fetch', {
      params: { id: containerId }
    });
    return response.data;
  }

  async fetchAllContainers(agentId: string, limit?: number): Promise<any[]> {
    let params: Record<string, any> = { id: agentId };
    if (limit !== undefined) {
      params.limit = limit;
    }
    let response = await this.axios.get('/containers/fetch-all', { params });
    return response.data;
  }

  async fetchContainerOutput(containerId: string): Promise<any> {
    let response = await this.axios.get('/containers/fetch-output', {
      params: { id: containerId }
    });
    return response.data;
  }

  async fetchContainerResultObject(containerId: string): Promise<any> {
    let response = await this.axios.get('/containers/fetch-result-object', {
      params: { id: containerId }
    });
    return response.data;
  }

  // ── Organization ──

  async fetchOrg(): Promise<any> {
    let response = await this.axios.get('/orgs/fetch');
    return response.data;
  }

  // ── Storage: Lists ──

  async fetchAllLists(): Promise<any[]> {
    let response = await this.axios.get('/org-storage/lists/fetch-all');
    return response.data;
  }

  async fetchList(listId: string): Promise<any> {
    let response = await this.axios.get('/org-storage/lists/fetch', {
      params: { id: listId }
    });
    return response.data;
  }

  async saveList(list: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/org-storage/lists/save', list);
    return response.data;
  }

  async deleteList(listId: string): Promise<void> {
    await this.axios.post('/org-storage/lists/delete', { id: listId });
  }

  // ── Storage: Leads ──

  async fetchLeadsByList(
    listId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (options?.limit !== undefined) {
      body.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      body.offset = options.offset;
    }
    let response = await this.axios.post(`/org-storage/leads/by-list/${listId}`, body);
    return response.data;
  }

  async saveLead(lead: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/org-storage/leads/save', lead);
    return response.data;
  }

  async saveLeadsMany(leads: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post('/org-storage/leads/save-many', { leads });
    return response.data;
  }

  async deleteLeadsMany(leadIds: string[]): Promise<void> {
    await this.axios.post('/org-storage/leads/delete-many', { leadIds });
  }

  // ── Scripts ──

  async fetchScript(scriptId: string): Promise<any> {
    let response = await this.axios.get('/scripts/fetch', {
      params: { id: scriptId }
    });
    return response.data;
  }

  async fetchAllScripts(): Promise<any[]> {
    let response = await this.axios.get('/scripts/fetch-all');
    return response.data;
  }

  async saveScript(script: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/scripts/save', script);
    return response.data;
  }

  async deleteScript(scriptId: string): Promise<void> {
    await this.axios.post('/scripts/delete', { id: scriptId });
  }

  async fetchScriptCode(scriptId: string): Promise<any> {
    let response = await this.axios.get('/scripts/code', {
      params: { id: scriptId }
    });
    return response.data;
  }
}
