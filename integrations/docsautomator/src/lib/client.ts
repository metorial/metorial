import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.docsautomator.co',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Document Generation ──

  async createDocument(params: {
    docId?: string;
    docTemplateLink?: string;
    documentName?: string;
    data?: Record<string, unknown>;
    recId?: string;
    rowId?: number;
    taskId?: string;
    webhookParams?: Record<string, unknown>;
  }) {
    let response = await this.axios.post('/createDocument', params);
    return response.data;
  }

  async getJobStatus(jobId: string) {
    let response = await this.axios.get(`/job/${jobId}`);
    return response.data;
  }

  async getQueueStats() {
    let response = await this.axios.get('/queue/stats');
    return response.data;
  }

  // ── Automation Management ──

  async listAutomations() {
    let response = await this.axios.get('/automations');
    return response.data;
  }

  async getAutomation(docId: string) {
    let response = await this.axios.get('/automation', {
      params: { docId }
    });
    return response.data;
  }

  async createAutomation(params: {
    title: string;
    dataSourceName: string;
    docTemplateLink: string;
  }) {
    let response = await this.axios.post('/createAutomation', params);
    return response.data;
  }

  async updateAutomation(docId: string, params: Record<string, unknown>) {
    let response = await this.axios.put('/updateAutomation', params, {
      params: { docId }
    });
    return response.data;
  }

  async deleteAutomation(docId: string) {
    let response = await this.axios.delete('/deleteAutomation', {
      params: { docId }
    });
    return response.data;
  }

  async duplicateAutomation(automationId: string) {
    let response = await this.axios.post('/duplicateAutomation', null, {
      params: { automationId }
    });
    return response.data;
  }

  // ── Template ──

  async listPlaceholders(automationId: string) {
    let response = await this.axios.get('/listPlaceholdersV2', {
      params: { automationId }
    });
    return response.data;
  }

  async duplicateGoogleDocTemplate(automationId: string) {
    let response = await this.axios.post('/duplicateGoogleDocTemplate', null, {
      params: { automationId }
    });
    return response.data;
  }

  // ── E-Signature ──

  async listEsignSessions(params?: {
    status?: string;
    page?: number;
    limit?: number;
    email?: string;
  }) {
    let response = await this.axios.get('/esign/sessions', {
      params
    });
    return response.data;
  }

  async getEsignSession(sessionId: string) {
    let response = await this.axios.get(`/esign/sessions/${sessionId}`);
    return response.data;
  }

  async getEsignSessionLinks(sessionId: string) {
    let response = await this.axios.get(`/esign/sessions/${sessionId}/links`);
    return response.data;
  }

  async getEsignSessionAudit(sessionId: string) {
    let response = await this.axios.get(`/esign/sessions/${sessionId}/audit`);
    return response.data;
  }

  async cancelEsignSession(sessionId: string, reason?: string) {
    let response = await this.axios.post(`/esign/sessions/${sessionId}/cancel`, {
      reason
    });
    return response.data;
  }

  async resendEsignInvitation(sessionId: string, signerIndex: number) {
    let response = await this.axios.post(`/esign/sessions/${sessionId}/resend/${signerIndex}`);
    return response.data;
  }
}
