import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginationParams {
  limit?: number;
  createdAtGt?: string;
  createdAtLt?: string;
  createdAtGe?: string;
  createdAtLe?: string;
  updatedAtGt?: string;
  updatedAtLt?: string;
  updatedAtGe?: string;
  updatedAtLe?: string;
}

export interface ListCallsParams extends PaginationParams {
  assistantId?: string;
  phoneNumberId?: string;
}

export interface VapiFile {
  id: string;
  name?: string;
  originalName?: string;
  status?: 'processing' | 'done' | 'failed';
  bytes?: number;
  purpose?: string;
  mimetype?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class Client {
  private http;
  readonly baseUrl: string;

  constructor(token: string, region: 'us' | 'eu' = 'us') {
    this.baseUrl = region === 'eu' ? 'https://api.eu.vapi.ai' : 'https://api.vapi.ai';
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      authHeader: { value: `Bearer ${token}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Vapi',
          reason: 'Vapi API request failed'
        })
    });
  }

  // ---- Assistants ----

  async listAssistants(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/assistant', { params });
    return response.data;
  }

  async getAssistant(assistantId: string): Promise<any> {
    let response = await this.http.get(`/assistant/${encodeURIComponent(assistantId)}`);
    return response.data;
  }

  async createAssistant(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/assistant', data);
    return response.data;
  }

  async updateAssistant(assistantId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(
      `/assistant/${encodeURIComponent(assistantId)}`,
      data
    );
    return response.data;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.http.delete(`/assistant/${encodeURIComponent(assistantId)}`);
  }

  // ---- Calls ----

  async listCalls(params?: ListCallsParams): Promise<any[]> {
    let response = await this.http.get('/call', { params });
    return response.data;
  }

  async getCall(callId: string): Promise<any> {
    let response = await this.http.get(`/call/${encodeURIComponent(callId)}`);
    return response.data;
  }

  async createCall(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/call', data);
    return response.data;
  }

  async updateCall(callId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/call/${encodeURIComponent(callId)}`, data);
    return response.data;
  }

  async deleteCall(callId: string): Promise<void> {
    await this.http.delete(`/call/${encodeURIComponent(callId)}`, { data: {} });
  }

  async checkCallArtifact(callId: string, artifact: string): Promise<void> {
    let response = await this.http.get(`/call/${encodeURIComponent(callId)}/${artifact}`, {
      maxRedirects: 0,
      responseType: 'stream',
      validateStatus: status => status === 200 || status === 302
    });
    response.data.destroy();
  }

  // ---- Phone Numbers ----

  async listPhoneNumbers(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/phone-number', { params });
    return response.data;
  }

  async getPhoneNumber(phoneNumberId: string): Promise<any> {
    let response = await this.http.get(`/phone-number/${encodeURIComponent(phoneNumberId)}`);
    return response.data;
  }

  async createPhoneNumber(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/phone-number', data);
    return response.data;
  }

  async updatePhoneNumber(phoneNumberId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(
      `/phone-number/${encodeURIComponent(phoneNumberId)}`,
      data
    );
    return response.data;
  }

  async deletePhoneNumber(phoneNumberId: string): Promise<void> {
    await this.http.delete(`/phone-number/${encodeURIComponent(phoneNumberId)}`);
  }

  // ---- Squads ----

  async listSquads(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/squad', { params });
    return response.data;
  }

  async getSquad(squadId: string): Promise<any> {
    let response = await this.http.get(`/squad/${encodeURIComponent(squadId)}`);
    return response.data;
  }

  async createSquad(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/squad', data);
    return response.data;
  }

  async updateSquad(squadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/squad/${encodeURIComponent(squadId)}`, data);
    return response.data;
  }

  async deleteSquad(squadId: string): Promise<void> {
    await this.http.delete(`/squad/${encodeURIComponent(squadId)}`);
  }

  // ---- Files ----

  async listFiles(params?: { purpose?: string }): Promise<VapiFile[]> {
    let response = await this.http.get('/file', { params });
    return response.data;
  }

  async getFile(fileId: string): Promise<VapiFile> {
    let response = await this.http.get(`/file/${encodeURIComponent(fileId)}`);
    return response.data;
  }

  async uploadFile(form: FormData): Promise<VapiFile> {
    let response = await this.http.post('/file', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateFile(fileId: string, data: { name: string }): Promise<VapiFile> {
    let response = await this.http.patch(`/file/${encodeURIComponent(fileId)}`, data);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.http.delete(`/file/${encodeURIComponent(fileId)}`);
  }

  // ---- Chats ----

  async listChats(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/chat', { params });
    return response.data;
  }

  async getChat(chatId: string): Promise<any> {
    let response = await this.http.get(`/chat/${encodeURIComponent(chatId)}`);
    return response.data;
  }

  async createChat(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/chat', data);
    return response.data;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.http.delete(`/chat/${encodeURIComponent(chatId)}`);
  }

  // ---- Tools ----

  async listTools(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/tool', { params });
    return response.data;
  }

  async getTool(toolId: string): Promise<any> {
    let response = await this.http.get(`/tool/${encodeURIComponent(toolId)}`);
    return response.data;
  }

  async createTool(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/tool', data);
    return response.data;
  }

  async updateTool(toolId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/tool/${encodeURIComponent(toolId)}`, data);
    return response.data;
  }

  async deleteTool(toolId: string): Promise<void> {
    await this.http.delete(`/tool/${encodeURIComponent(toolId)}`);
  }

  // ---- Analytics ----

  async queryAnalytics(queries: any[]): Promise<any> {
    let response = await this.http.post('/analytics', { queries });
    return response.data;
  }

  // ---- Campaigns ----

  async listCampaigns(
    params?: PaginationParams & { page?: number; status?: string }
  ): Promise<{
    results: any[];
    metadata: {
      currentPage: number;
      totalItems: number;
      totalPages?: number;
      hasNextPage?: boolean;
    };
  }> {
    let response = await this.http.get('/campaign', { params });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<any> {
    let response = await this.http.get(`/campaign/${encodeURIComponent(campaignId)}`);
    return response.data;
  }

  async createCampaign(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/campaign', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/campaign/${encodeURIComponent(campaignId)}`, data);
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.http.delete(`/campaign/${encodeURIComponent(campaignId)}`);
  }
}

export const getCallDuration = (call: { startedAt?: string; endedAt?: string }) => {
  if (!call.startedAt || !call.endedAt) return undefined;
  let duration = (Date.parse(call.endedAt) - Date.parse(call.startedAt)) / 1000;
  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
};
