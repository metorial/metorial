import { createAxios } from 'slates';

export class RetellClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.retellai.com'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Voice Agents ──

  async createAgent(data: Record<string, any>) {
    let res = await this.axios.post('/create-agent', data, { headers: this.headers });
    return res.data;
  }

  async getAgent(agentId: string, version?: number) {
    let params: Record<string, any> = {};
    if (version !== undefined) params.version = version;
    let res = await this.axios.get(`/get-agent/${agentId}`, { headers: this.headers, params });
    return res.data;
  }

  async listAgents(params?: {
    limit?: number;
    paginationKey?: string;
    paginationKeyVersion?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.paginationKey) queryParams.pagination_key = params.paginationKey;
    if (params?.paginationKeyVersion)
      queryParams.pagination_key_version = params.paginationKeyVersion;
    let res = await this.axios.get('/list-agents', {
      headers: this.headers,
      params: queryParams
    });
    return res.data;
  }

  async updateAgent(agentId: string, data: Record<string, any>, version?: number) {
    let params: Record<string, any> = {};
    if (version !== undefined) params.version = version;
    let res = await this.axios.patch(`/update-agent/${agentId}`, data, {
      headers: this.headers,
      params
    });
    return res.data;
  }

  async deleteAgent(agentId: string) {
    await this.axios.delete(`/delete-agent/${agentId}`, { headers: this.headers });
  }

  // ── Phone Calls ──

  async createPhoneCall(data: Record<string, any>) {
    let res = await this.axios.post('/v2/create-phone-call', data, { headers: this.headers });
    return res.data;
  }

  async createWebCall(data: Record<string, any>) {
    let res = await this.axios.post('/v2/create-web-call', data, { headers: this.headers });
    return res.data;
  }

  async getCall(callId: string) {
    let res = await this.axios.get(`/v2/get-call/${callId}`, { headers: this.headers });
    return res.data;
  }

  async listCalls(data: Record<string, any>) {
    let res = await this.axios.post('/v2/list-calls', data, { headers: this.headers });
    return res.data;
  }

  async deleteCall(callId: string) {
    await this.axios.delete(`/v2/delete-call/${callId}`, { headers: this.headers });
  }

  // ── Batch Calls ──

  async createBatchCall(data: Record<string, any>) {
    let res = await this.axios.post('/create-batch-call', data, { headers: this.headers });
    return res.data;
  }

  // ── Phone Numbers ──

  async createPhoneNumber(data: Record<string, any>) {
    let res = await this.axios.post('/create-phone-number', data, { headers: this.headers });
    return res.data;
  }

  async getPhoneNumber(phoneNumber: string) {
    let res = await this.axios.get(`/get-phone-number/${encodeURIComponent(phoneNumber)}`, {
      headers: this.headers
    });
    return res.data;
  }

  async listPhoneNumbers() {
    let res = await this.axios.get('/list-phone-numbers', { headers: this.headers });
    return res.data;
  }

  async updatePhoneNumber(phoneNumber: string, data: Record<string, any>) {
    let res = await this.axios.patch(
      `/update-phone-number/${encodeURIComponent(phoneNumber)}`,
      data,
      { headers: this.headers }
    );
    return res.data;
  }

  async deletePhoneNumber(phoneNumber: string) {
    await this.axios.delete(`/delete-phone-number/${encodeURIComponent(phoneNumber)}`, {
      headers: this.headers
    });
  }

  // ── Knowledge Bases ──

  async listKnowledgeBases() {
    let res = await this.axios.get('/list-knowledge-bases', { headers: this.headers });
    return res.data;
  }

  async getKnowledgeBase(knowledgeBaseId: string) {
    let res = await this.axios.get(`/get-knowledge-base/${knowledgeBaseId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteKnowledgeBase(knowledgeBaseId: string) {
    await this.axios.delete(`/delete-knowledge-base/${knowledgeBaseId}`, {
      headers: this.headers
    });
  }

  // ── Voices ──

  async listVoices() {
    let res = await this.axios.get('/list-voices', { headers: this.headers });
    return res.data;
  }

  async getVoice(voiceId: string) {
    let res = await this.axios.get(`/get-voice/${voiceId}`, { headers: this.headers });
    return res.data;
  }

  // ── Concurrency ──

  async getConcurrency() {
    let res = await this.axios.get('/get-concurrency', { headers: this.headers });
    return res.data;
  }
}
