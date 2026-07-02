import { createAxios } from 'slates';

export class MockServiceClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(params: { token: string; apiKeyId?: string; apiKeySecret?: string }) {
    let authHeader =
      params.apiKeyId && params.apiKeySecret
        ? `Basic ${Buffer.from(`${params.apiKeyId}:${params.apiKeySecret}`).toString('base64')}`
        : `Basic ${params.token}`;

    this.axios = createAxios({
      baseURL: 'https://mock.blazemeter.com/api/v1',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Virtual Services ────────────────────────────────────────

  async listVirtualServices(workspaceId: number): Promise<any[]> {
    let response = await this.axios.get(`/workspaces/${workspaceId}/service-mocks`);
    return response.data?.result || [];
  }

  async getVirtualService(serviceId: number): Promise<any> {
    let response = await this.axios.get(`/service-mocks/${serviceId}`);
    return response.data?.result;
  }

  async createVirtualService(
    workspaceId: number,
    params: {
      name: string;
      description?: string;
      serviceUrl?: string;
      thinkTime?: number;
      unmatchedRequestPolicy?: string;
      liveSystemUrl?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      name: params.name,
      workspaceId
    };
    if (params.description) body.description = params.description;
    if (params.serviceUrl) body.serviceUrl = params.serviceUrl;
    if (params.thinkTime !== undefined) body.thinkTime = params.thinkTime;
    if (params.unmatchedRequestPolicy)
      body.unmatchedRequestPolicy = params.unmatchedRequestPolicy;
    if (params.liveSystemUrl) body.liveSystemUrl = params.liveSystemUrl;

    let response = await this.axios.post(`/workspaces/${workspaceId}/service-mocks`, body);
    return response.data?.result;
  }

  async updateVirtualService(
    serviceId: number,
    params: {
      name?: string;
      description?: string;
      serviceUrl?: string;
      thinkTime?: number;
      unmatchedRequestPolicy?: string;
      liveSystemUrl?: string;
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/service-mocks/${serviceId}`, params);
    return response.data?.result;
  }

  async deleteVirtualService(serviceId: number): Promise<void> {
    await this.axios.delete(`/service-mocks/${serviceId}`);
  }

  async deployVirtualService(serviceId: number): Promise<any> {
    let response = await this.axios.post(`/service-mocks/${serviceId}/deploy`);
    return response.data?.result;
  }

  async undeployVirtualService(serviceId: number): Promise<any> {
    let response = await this.axios.post(`/service-mocks/${serviceId}/undeploy`);
    return response.data?.result;
  }

  // ─── Transactions ────────────────────────────────────────────

  async listTransactions(serviceId: number): Promise<any[]> {
    let response = await this.axios.get(`/service-mocks/${serviceId}/transactions`);
    return response.data?.result || [];
  }

  async createTransaction(
    serviceId: number,
    params: {
      name: string;
      request: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: string;
      };
      response: {
        statusCode: number;
        headers?: Record<string, string>;
        body?: string;
      };
    }
  ): Promise<any> {
    let response = await this.axios.post(`/service-mocks/${serviceId}/transactions`, params);
    return response.data?.result;
  }

  async deleteTransaction(serviceId: number, transactionId: number): Promise<void> {
    await this.axios.delete(`/service-mocks/${serviceId}/transactions/${transactionId}`);
  }
}
