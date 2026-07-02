import { createAxios } from 'slates';

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

export class Client {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://api.vapi.ai',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Assistants ----

  async listAssistants(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/assistant', { params });
    return response.data;
  }

  async getAssistant(assistantId: string): Promise<any> {
    let response = await this.http.get(`/assistant/${assistantId}`);
    return response.data;
  }

  async createAssistant(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/assistant', data);
    return response.data;
  }

  async updateAssistant(assistantId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/assistant/${assistantId}`, data);
    return response.data;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.http.delete(`/assistant/${assistantId}`);
  }

  // ---- Calls ----

  async listCalls(params?: ListCallsParams): Promise<any[]> {
    let response = await this.http.get('/call', { params });
    return response.data;
  }

  async getCall(callId: string): Promise<any> {
    let response = await this.http.get(`/call/${callId}`);
    return response.data;
  }

  async createCall(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/call', data);
    return response.data;
  }

  async updateCall(callId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/call/${callId}`, data);
    return response.data;
  }

  async deleteCall(callId: string): Promise<void> {
    await this.http.delete(`/call/${callId}`);
  }

  // ---- Phone Numbers ----

  async listPhoneNumbers(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/phone-number', { params });
    return response.data;
  }

  async getPhoneNumber(phoneNumberId: string): Promise<any> {
    let response = await this.http.get(`/phone-number/${phoneNumberId}`);
    return response.data;
  }

  async createPhoneNumber(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/phone-number', data);
    return response.data;
  }

  async updatePhoneNumber(phoneNumberId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/phone-number/${phoneNumberId}`, data);
    return response.data;
  }

  async deletePhoneNumber(phoneNumberId: string): Promise<void> {
    await this.http.delete(`/phone-number/${phoneNumberId}`);
  }

  // ---- Squads ----

  async listSquads(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/squad', { params });
    return response.data;
  }

  async getSquad(squadId: string): Promise<any> {
    let response = await this.http.get(`/squad/${squadId}`);
    return response.data;
  }

  async createSquad(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/squad', data);
    return response.data;
  }

  async updateSquad(squadId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/squad/${squadId}`, data);
    return response.data;
  }

  async deleteSquad(squadId: string): Promise<void> {
    await this.http.delete(`/squad/${squadId}`);
  }

  // ---- Workflows ----

  async listWorkflows(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/workflow', { params });
    return response.data;
  }

  async getWorkflow(workflowId: string): Promise<any> {
    let response = await this.http.get(`/workflow/${workflowId}`);
    return response.data;
  }

  async createWorkflow(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/workflow', data);
    return response.data;
  }

  async updateWorkflow(workflowId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/workflow/${workflowId}`, data);
    return response.data;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.http.delete(`/workflow/${workflowId}`);
  }

  // ---- Files ----

  async listFiles(): Promise<any[]> {
    let response = await this.http.get('/file');
    return response.data;
  }

  async getFile(fileId: string): Promise<any> {
    let response = await this.http.get(`/file/${fileId}`);
    return response.data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.http.delete(`/file/${fileId}`);
  }

  // ---- Chats ----

  async listChats(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/chat', { params });
    return response.data;
  }

  async getChat(chatId: string): Promise<any> {
    let response = await this.http.get(`/chat/${chatId}`);
    return response.data;
  }

  async createChat(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/chat', data);
    return response.data;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.http.delete(`/chat/${chatId}`);
  }

  // ---- Tools ----

  async listTools(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/tool', { params });
    return response.data;
  }

  async getTool(toolId: string): Promise<any> {
    let response = await this.http.get(`/tool/${toolId}`);
    return response.data;
  }

  async createTool(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/tool', data);
    return response.data;
  }

  async updateTool(toolId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/tool/${toolId}`, data);
    return response.data;
  }

  async deleteTool(toolId: string): Promise<void> {
    await this.http.delete(`/tool/${toolId}`);
  }

  // ---- Analytics ----

  async queryAnalytics(queries: any[]): Promise<any> {
    let response = await this.http.post('/analytics', { queries });
    return response.data;
  }

  // ---- Campaigns ----

  async listCampaigns(params?: PaginationParams): Promise<any[]> {
    let response = await this.http.get('/campaign', { params });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<any> {
    let response = await this.http.get(`/campaign/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/campaign', data);
    return response.data;
  }

  async updateCampaign(campaignId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.patch(`/campaign/${campaignId}`, data);
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.http.delete(`/campaign/${campaignId}`);
  }
}
