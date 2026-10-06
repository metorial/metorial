import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export let resolveCloudClient = async (
  auth: { managementToken?: string },
  accountId?: string,
  legacyAccountId?: string
) => {
  let resolvedId = accountId ?? legacyAccountId;
  if (!resolvedId) {
    let discovery = new QdrantCloudClient(auth);
    let accounts = (await discovery.listAccounts()).items ?? [];
    if (accounts.length !== 1 || !accounts[0]?.id) {
      throw createApiServiceError(
        'Call list_accounts and provide the selected accountId for this cloud operation.'
      );
    }
    resolvedId = accounts[0].id;
  }
  return new QdrantCloudClient({ ...auth, accountId: resolvedId });
};

export class QdrantCloudClient {
  private http;
  private accountId?: string;

  constructor(config: { managementToken?: string; accountId?: string }) {
    if (!config.managementToken) {
      throw createApiServiceError(
        'A Cloud Management API key is required. Reconnect with a management key to use cloud tools.'
      );
    }
    this.accountId = config.accountId;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.cloud.qdrant.io',
      authHeader: { value: `apikey ${config.managementToken}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Qdrant Cloud',
          reason: 'qdrant_cloud_api_error'
        })
    });
  }

  private get accountPath() {
    if (!this.accountId) {
      throw createApiServiceError(
        'Provide an accountId from list_accounts for this cloud operation.'
      );
    }
    return encodeURIComponent(this.accountId);
  }

  async listAccounts(): Promise<{
    items?: Array<{ id: string; name: string; createdAt?: string }>;
  }> {
    let response = await this.http.get('/api/account/v1/accounts');
    return response.data;
  }

  async listCloudOptions(
    action: 'providers' | 'regions' | 'packages',
    cloudProvider?: string,
    region?: string
  ): Promise<{ items?: Record<string, any>[] }> {
    if (action === 'providers') {
      let response = await this.http.get(
        `/api/platform/v1/accounts/${this.accountPath}/cloud-providers`
      );
      return response.data;
    }
    if (!cloudProvider) {
      throw createApiServiceError(
        'cloudProvider is required. Call list_cloud_options with action providers first.'
      );
    }
    if (action === 'regions') {
      let response = await this.http.get(
        `/api/platform/v1/accounts/${this.accountPath}/cloud-providers/${encodeURIComponent(cloudProvider)}/regions`
      );
      return response.data;
    }
    if (!region && cloudProvider !== 'hybrid') {
      throw createApiServiceError(
        'region is required for packages. Call list_cloud_options with action regions first.'
      );
    }
    let response = await this.http.get(
      `/api/booking/v1/accounts/${this.accountPath}/packages`,
      {
        params: { cloudProviderId: cloudProvider, cloudProviderRegionId: region }
      }
    );
    return response.data;
  }

  // ========== Clusters ==========

  async listClusters(options?: { pageSize?: number; pageToken?: string }): Promise<any> {
    let params: any = {};
    if (options?.pageSize !== undefined) params.pageSize = options.pageSize;
    if (options?.pageToken !== undefined) params.pageToken = options.pageToken;

    let response = await this.http.get(
      `/api/cluster/v1/accounts/${this.accountPath}/clusters`,
      { params }
    );
    return response.data;
  }

  async getCluster(clusterId: string): Promise<any> {
    let response = await this.http.get(
      `/api/cluster/v1/accounts/${this.accountPath}/clusters/${encodeURIComponent(clusterId)}`
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
      `/api/cluster/v1/accounts/${this.accountPath}/clusters`,
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
      `/api/cluster/v1/accounts/${this.accountPath}/clusters/${encodeURIComponent(clusterId)}`,
      { params }
    );
    return response.data;
  }

  async restartCluster(clusterId: string): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${this.accountPath}/clusters/${encodeURIComponent(clusterId)}/restart`
    );
    return response.data;
  }

  async suspendCluster(clusterId: string): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${this.accountPath}/clusters/${encodeURIComponent(clusterId)}/suspend`
    );
    return response.data;
  }

  async unsuspendCluster(clusterId: string): Promise<any> {
    let response = await this.http.post(
      `/api/cluster/v1/accounts/${this.accountPath}/clusters/${encodeURIComponent(clusterId)}/unsuspend`
    );
    return response.data;
  }
}
