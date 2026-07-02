import { createAxios } from 'slates';
import type { PaginatedResponse } from './client';

export class TelemetryClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; teamName?: string }) {
    this.axios = createAxios({
      baseURL: 'https://telemetry.betterstack.com/api/v2',
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
    if (params.teamName) {
      this.axios.defaults.headers.common['X-Team-Name'] = params.teamName;
    }
  }

  // ---- Sources ----

  async listSources(params?: {
    page?: number;
    perPage?: number;
    name?: string;
    platform?: string;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/sources', {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        name: params?.name,
        platform: params?.platform
      }
    });
    return response.data;
  }

  async getSource(sourceId: string): Promise<any> {
    let response = await this.axios.get(`/sources/${sourceId}`);
    return response.data;
  }

  async createSource(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/sources', data);
    return response.data;
  }

  async updateSource(sourceId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/sources/${sourceId}`, data);
    return response.data;
  }

  async deleteSource(sourceId: string): Promise<void> {
    await this.axios.delete(`/sources/${sourceId}`);
  }

  // ---- Dashboards ----

  async listDashboards(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/dashboards', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getDashboard(dashboardId: string): Promise<any> {
    let response = await this.axios.get(`/dashboards/${dashboardId}`);
    return response.data;
  }

  // ---- Alerts ----

  async listAlerts(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/alerts', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getAlert(alertId: string): Promise<any> {
    let response = await this.axios.get(`/alerts/${alertId}`);
    return response.data;
  }

  async createAlert(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/alerts', data);
    return response.data;
  }

  async updateAlert(alertId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.patch(`/alerts/${alertId}`, data);
    return response.data;
  }

  async deleteAlert(alertId: string): Promise<void> {
    await this.axios.delete(`/alerts/${alertId}`);
  }

  // ---- Source Groups ----

  async listSourceGroups(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/sources-groups', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ---- Connections (Query API credentials) ----

  async listConnections(params?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get('/connections', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async createConnection(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/connections', data);
    return response.data;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.axios.delete(`/connections/${connectionId}`);
  }
}
