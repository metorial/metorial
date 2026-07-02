import { createAxios } from 'slates';

let BASE_URL = 'https://api.intelliprint.net/v1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // ─── Print Jobs ───────────────────────────────────────────────

  async createPrintJob(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/prints', params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getPrintJob(printJobId: string): Promise<any> {
    let response = await this.axios.get(`/prints/${printJobId}`);
    return response.data;
  }

  async listPrintJobs(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/prints', { params });
    return response.data;
  }

  async updatePrintJob(printJobId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/prints/${printJobId}`, params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deletePrintJob(printJobId: string): Promise<any> {
    let response = await this.axios.delete(`/prints/${printJobId}`);
    return response.data;
  }

  // ─── Backgrounds ──────────────────────────────────────────────

  async createBackground(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/backgrounds', params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getBackground(backgroundId: string): Promise<any> {
    let response = await this.axios.get(`/backgrounds/${backgroundId}`);
    return response.data;
  }

  async listBackgrounds(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/backgrounds', { params });
    return response.data;
  }

  async updateBackground(backgroundId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/backgrounds/${backgroundId}`, params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteBackground(backgroundId: string): Promise<any> {
    let response = await this.axios.delete(`/backgrounds/${backgroundId}`);
    return response.data;
  }

  // ─── Mailing Lists ───────────────────────────────────────────

  async createMailingList(params: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/mailing_lists', params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async getMailingList(mailingListId: string): Promise<any> {
    let response = await this.axios.get(`/mailing_lists/${mailingListId}`);
    return response.data;
  }

  async listMailingLists(params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/mailing_lists', { params });
    return response.data;
  }

  async updateMailingList(mailingListId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/mailing_lists/${mailingListId}`, params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async deleteMailingList(mailingListId: string): Promise<any> {
    let response = await this.axios.delete(`/mailing_lists/${mailingListId}`);
    return response.data;
  }

  // ─── Mailing List Recipients ──────────────────────────────────

  async createRecipient(mailingListId: string, params: Record<string, any>): Promise<any> {
    let response = await this.axios.post(
      `/mailing_lists/${mailingListId}/recipients`,
      params,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async getRecipient(mailingListId: string, recipientId: string): Promise<any> {
    let response = await this.axios.get(
      `/mailing_lists/${mailingListId}/recipients/${recipientId}`
    );
    return response.data;
  }

  async listRecipients(mailingListId: string, params?: Record<string, any>): Promise<any> {
    let response = await this.axios.get(`/mailing_lists/${mailingListId}/recipients`, {
      params
    });
    return response.data;
  }

  async updateRecipient(
    mailingListId: string,
    recipientId: string,
    params: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.post(
      `/mailing_lists/${mailingListId}/recipients/${recipientId}`,
      params,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteRecipient(mailingListId: string, recipientId: string): Promise<any> {
    let response = await this.axios.delete(
      `/mailing_lists/${mailingListId}/recipients/${recipientId}`
    );
    return response.data;
  }
}
