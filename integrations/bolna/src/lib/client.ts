import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.bolna.ai',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ── Agent Management ──

  async createAgent(agentConfig: Record<string, any>, agentPrompts: Record<string, any>) {
    let response = await this.http.post('/v2/agent', {
      agent_config: agentConfig,
      agent_prompts: agentPrompts
    });
    return response.data;
  }

  async getAgent(agentId: string) {
    let response = await this.http.get(`/v2/agent/${agentId}`);
    return response.data;
  }

  async listAgents() {
    let response = await this.http.get('/v2/agent/all');
    return response.data;
  }

  async updateAgent(
    agentId: string,
    agentConfig: Record<string, any>,
    agentPrompts: Record<string, any>
  ) {
    let response = await this.http.put(`/v2/agent/${agentId}`, {
      agent_config: agentConfig,
      agent_prompts: agentPrompts
    });
    return response.data;
  }

  async patchAgent(
    agentId: string,
    agentConfig?: Record<string, any>,
    agentPrompts?: Record<string, any>
  ) {
    let body: Record<string, any> = {};
    if (agentConfig) body.agent_config = agentConfig;
    if (agentPrompts) body.agent_prompts = agentPrompts;

    let response = await this.http.patch(`/v2/agent/${agentId}`, body);
    return response.data;
  }

  async deleteAgent(agentId: string) {
    let response = await this.http.delete(`/v2/agent/${agentId}`);
    return response.data;
  }

  // ── Calling ──

  async makeCall(params: {
    agentId: string;
    recipientPhoneNumber: string;
    fromPhoneNumber?: string;
    scheduledAt?: string;
    userData?: Record<string, any>;
    retryConfig?: Record<string, any>;
    bypassCallGuardrails?: boolean;
  }) {
    let body: Record<string, any> = {
      agent_id: params.agentId,
      recipient_phone_number: params.recipientPhoneNumber
    };

    if (params.fromPhoneNumber) body.from_phone_number = params.fromPhoneNumber;
    if (params.scheduledAt) body.scheduled_at = params.scheduledAt;
    if (params.userData) body.user_data = params.userData;
    if (params.retryConfig) body.retry_config = params.retryConfig;
    if (params.bypassCallGuardrails !== undefined)
      body.bypass_call_guardrails = params.bypassCallGuardrails;

    let response = await this.http.post('/call', body);
    return response.data;
  }

  async stopCall(executionId: string) {
    let response = await this.http.post(`/call/${executionId}/stop`);
    return response.data;
  }

  // ── Batch Calling ──

  async createBatch(
    agentId: string,
    fileContent: string,
    fileName: string,
    fromPhoneNumbers?: string[],
    retryConfig?: Record<string, any>
  ) {
    let formData = new FormData();
    formData.append('agent_id', agentId);
    formData.append('file', new Blob([fileContent], { type: 'text/csv' }), fileName);
    if (fromPhoneNumbers) {
      formData.append('from_phone_numbers', JSON.stringify(fromPhoneNumbers));
    }
    if (retryConfig) {
      formData.append('retry_config', JSON.stringify(retryConfig));
    }

    let response = await this.http.post('/batches', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async getBatch(batchId: string) {
    let response = await this.http.get(`/batches/${batchId}`);
    return response.data;
  }

  async listBatches(agentId: string) {
    let response = await this.http.get(`/batches/${agentId}/all`);
    return response.data;
  }

  async scheduleBatch(batchId: string, scheduledAt: string, bypassCallGuardrails?: boolean) {
    let formData = new FormData();
    formData.append('scheduled_at', scheduledAt);
    if (bypassCallGuardrails !== undefined) {
      formData.append('bypass_call_guardrails', String(bypassCallGuardrails));
    }

    let response = await this.http.post(`/batches/${batchId}/schedule`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async stopBatch(batchId: string) {
    let response = await this.http.post(`/batches/${batchId}/stop`);
    return response.data;
  }

  async deleteBatch(batchId: string) {
    let response = await this.http.delete(`/batches/${batchId}`);
    return response.data;
  }

  async listBatchExecutions(batchId: string) {
    let response = await this.http.get(`/batches/${batchId}/executions`);
    return response.data;
  }

  // ── Executions ──

  async getExecution(executionId: string) {
    let response = await this.http.get(`/executions/${executionId}`);
    return response.data;
  }

  async getExecutionLogs(executionId: string) {
    let response = await this.http.get(`/executions/${executionId}/log`);
    return response.data;
  }

  async listAgentExecutions(
    agentId: string,
    params?: {
      pageNumber?: number;
      pageSize?: number;
      status?: string;
      callType?: string;
      provider?: string;
      answeredByVoiceMail?: boolean;
      batchId?: string;
      from?: string;
      to?: string;
    }
  ) {
    let queryParams: Record<string, any> = {};
    if (params?.pageNumber) queryParams.page_number = params.pageNumber;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.status) queryParams.status = params.status;
    if (params?.callType) queryParams.call_type = params.callType;
    if (params?.provider) queryParams.provider = params.provider;
    if (params?.answeredByVoiceMail !== undefined)
      queryParams.answered_by_voice_mail = params.answeredByVoiceMail;
    if (params?.batchId) queryParams.batch_id = params.batchId;
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    let response = await this.http.get(`/v2/agent/${agentId}/executions`, {
      params: queryParams
    });
    return response.data;
  }

  // ── Knowledge Base ──

  async createKnowledgeBaseFromUrl(
    url: string,
    options?: {
      chunkSize?: number;
      similarityTopK?: number;
      overlapping?: number;
      languageSupport?: string;
    }
  ) {
    let formData = new FormData();
    formData.append('url', url);
    if (options?.chunkSize) formData.append('chunk_size', String(options.chunkSize));
    if (options?.similarityTopK)
      formData.append('similarity_top_k', String(options.similarityTopK));
    if (options?.overlapping) formData.append('overlapping', String(options.overlapping));
    if (options?.languageSupport) formData.append('language_support', options.languageSupport);

    let response = await this.http.post('/knowledgebase', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async getKnowledgeBase(ragId: string) {
    let response = await this.http.get(`/knowledgebase/${ragId}`);
    return response.data;
  }

  async listKnowledgeBases() {
    let response = await this.http.get('/knowledgebase/all');
    return response.data;
  }

  async deleteKnowledgeBase(ragId: string) {
    let response = await this.http.delete(`/knowledgebase/${ragId}`);
    return response.data;
  }

  // ── Phone Numbers ──

  async searchPhoneNumbers(country: string, pattern?: string) {
    let params: Record<string, any> = { country };
    if (pattern) params.pattern = pattern;

    let response = await this.http.get('/phone-numbers/search', { params });
    return response.data;
  }

  async buyPhoneNumber(country: string, phoneNumber: string) {
    let response = await this.http.post('/phone-numbers/buy', {
      country,
      phone_number: phoneNumber
    });
    return response.data;
  }

  async listPhoneNumbers() {
    let response = await this.http.get('/phone-numbers/all');
    return response.data;
  }

  async deletePhoneNumber(phoneNumberId: string) {
    let response = await this.http.delete(`/phone-numbers/${phoneNumberId}`);
    return response.data;
  }

  // ── Inbound ──

  async setupInbound(agentId: string, phoneNumberId: string, ivrConfig?: Record<string, any>) {
    let body: Record<string, any> = {
      agent_id: agentId,
      phone_number_id: phoneNumberId
    };
    if (ivrConfig) body.ivr_config = ivrConfig;

    let response = await this.http.post('/inbound/setup', body);
    return response.data;
  }

  async unlinkInbound(phoneNumberId: string) {
    let response = await this.http.post('/inbound/unlink', {
      phone_number_id: phoneNumberId
    });
    return response.data;
  }

  // ── Voices ──

  async listVoices() {
    let response = await this.http.get('/me/voices');
    return response.data;
  }

  // ── User ──

  async getUserInfo() {
    let response = await this.http.get('/user/me');
    return response.data;
  }

  // ── Providers ──

  async addProvider(providerName: string, providerValue: string) {
    let response = await this.http.post('/providers', {
      provider_name: providerName,
      provider_value: providerValue
    });
    return response.data;
  }

  async listProviders() {
    let response = await this.http.get('/providers');
    return response.data;
  }

  async removeProvider(providerKeyName: string) {
    let response = await this.http.delete(`/providers/${providerKeyName}`);
    return response.data;
  }

  // ── Stop Agent Calls ──

  async stopAgentCalls(agentId: string) {
    let response = await this.http.post(`/v2/agent/${agentId}/stop`);
    return response.data;
  }
}
