import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.browse.ai/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Robots ──────────────────────────────────────────────

  async listRobots(): Promise<{ totalCount: number; items: any[] }> {
    let response = await this.axios.get('/robots');
    return response.data.result;
  }

  async getRobot(robotId: string): Promise<any> {
    let response = await this.axios.get(`/robots/${robotId}`);
    return response.data.result;
  }

  // ── Tasks ───────────────────────────────────────────────

  async createTask(robotId: string, inputParameters: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`/robots/${robotId}/tasks`, {
      inputParameters
    });
    return response.data.result;
  }

  async getTask(robotId: string, taskId: string): Promise<any> {
    let response = await this.axios.get(`/robots/${robotId}/tasks/${taskId}`);
    return response.data.result;
  }

  async listTasks(
    robotId: string,
    params?: {
      page?: number;
      pageSize?: number;
      status?: string;
      fromDate?: number;
      toDate?: number;
      sort?: string;
      robotBulkRunId?: string;
    }
  ): Promise<{ totalCount: number; items: any[]; page: number; pageSize: number }> {
    let response = await this.axios.get(`/robots/${robotId}/tasks`, { params });
    return response.data.result;
  }

  // ── Bulk Runs ───────────────────────────────────────────

  async createBulkRun(
    robotId: string,
    title: string,
    inputParametersList: Record<string, any>[]
  ): Promise<any> {
    let response = await this.axios.post(`/robots/${robotId}/bulk-runs`, {
      title,
      inputParameters: inputParametersList
    });
    return response.data.result;
  }

  async getBulkRun(robotId: string, bulkRunId: string): Promise<any> {
    let response = await this.axios.get(`/robots/${robotId}/bulk-runs/${bulkRunId}`);
    return response.data.result;
  }

  // ── Cookies ─────────────────────────────────────────────

  async updateCookies(robotId: string, cookies: Record<string, any>[]): Promise<any> {
    let response = await this.axios.patch(`/robots/${robotId}/cookies`, cookies);
    return response.data;
  }

  // ── Webhooks ────────────────────────────────────────────

  async createWebhook(robotId: string, hookUrl: string, eventType: string): Promise<any> {
    let response = await this.axios.post(`/robots/${robotId}/webhooks`, {
      hookUrl,
      eventType
    });
    return response.data.result;
  }

  async listWebhooks(robotId: string): Promise<any[]> {
    let response = await this.axios.get(`/robots/${robotId}/webhooks`);
    return response.data.result?.items ?? response.data.result ?? [];
  }

  async deleteWebhook(robotId: string, webhookId: string): Promise<void> {
    await this.axios.delete(`/robots/${robotId}/webhooks/${webhookId}`);
  }

  // ── Monitors ────────────────────────────────────────────

  async deleteMonitor(robotId: string, monitorId: string): Promise<void> {
    await this.axios.delete(`/robots/${robotId}/monitors/${monitorId}`);
  }
}
