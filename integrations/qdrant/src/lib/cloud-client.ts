import { createAxios } from 'slates';

export class QdrantCloudClient {
  private http;
  private accountId: string;

  constructor(config: { managementToken: string; accountId: string }) {
    this.accountId = config.accountId;
    this.http = createAxios({
      baseURL: 'https://api.cloud.qdrant.io',
      headers: {
        Authorization: `apikey ${config.managementToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ========== Clusters ==========

  async listClusters(options?: { pageSize?: number; pageToken?: string }): Promise<any> {
    let params: any = {};
    if (options?.pageSize !== undefined) params.pageSize = options.pageSize;
    if (options?.pageToken !== undefined) params.pageToken = options.pageToken;

    let response = await this.http.get(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters`,
      { params }
    );
    return response.data;
  }

  async getCluster(clusterId: string): Promise<any> {
    let response = await this.http.get(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters/${encodeURIComponent(clusterId)}`
    );
    return response.data;
  }

  async createCluster(params: {
    name: string;
    cloudProviderId: string;
    cloudProviderRegionId: string;
    configuration: {
      numberOfNodes: number;
      packageId: string;
      version?: string;
    };
  }): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters`,
      {
        cluster: {
          accountId: this.accountId,
          ...params
        }
      }
    );
    return response.data;
  }

  async deleteCluster(clusterId: string, deleteBackups?: boolean): Promise<any> {
    let params: any = {};
    if (deleteBackups !== undefined) params.deleteBackups = deleteBackups;

    let response = await this.http.delete(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters/${encodeURIComponent(clusterId)}`,
      { params }
    );
    return response.data;
  }

  async restartCluster(clusterId: string): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters/${encodeURIComponent(clusterId)}/restart`
    );
    return response.data;
  }

  async suspendCluster(clusterId: string): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters/${encodeURIComponent(clusterId)}/suspend`
    );
    return response.data;
  }

  async unsuspendCluster(clusterId: string): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${encodeURIComponent(this.accountId)}/clusters/${encodeURIComponent(clusterId)}/unsuspend`
    );
    return response.data;
  }
}
