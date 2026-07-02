import { createAxios } from 'slates';
import { buildDigestHeader, parseDigestChallenge } from './digest';

let BASE_URL = 'https://cloud.mongodb.com/api/atlas/v2';
let ACCEPT_HEADER = 'application/vnd.atlas.2025-03-12+json';

export interface ClientConfig {
  token: string;
  authMethod: 'oauth' | 'digest';
  publicKey?: string;
  privateKey?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
    this.axios = createAxios({
      baseURL: BASE_URL
    });
  }

  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    let headers: Record<string, string> = {
      Accept: ACCEPT_HEADER
    };

    if (data && method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.authMethod === 'oauth') {
      headers.Authorization = `Bearer ${this.config.token}`;
      let response = await this.axios.request<T>({
        method,
        url: path,
        data,
        params,
        headers
      });
      return response.data;
    }

    // Digest auth: first request without auth to get the challenge
    let publicKey = this.config.publicKey!;
    let privateKey = this.config.privateKey!;

    try {
      let initialResponse = await this.axios.request<T>({
        method,
        url: path,
        data,
        params,
        headers,
        validateStatus: status => status === 401 || (status >= 200 && status < 300)
      });

      if (initialResponse.status !== 401) {
        return initialResponse.data;
      }

      let wwwAuth = initialResponse.headers['www-authenticate'] as string | undefined;
      if (!wwwAuth) {
        throw new Error('Expected WWW-Authenticate header for digest auth');
      }

      let challenge = parseDigestChallenge(wwwAuth);
      if (!challenge) {
        throw new Error('Failed to parse digest authentication challenge');
      }

      let uri = path.startsWith('/') ? path : `/${path}`;
      if (params) {
        let searchParams = new URLSearchParams();
        for (let [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        }
        let qs = searchParams.toString();
        if (qs) {
          uri += `?${qs}`;
        }
      }

      let digestHeader = await buildDigestHeader(
        method,
        uri,
        publicKey,
        privateKey,
        challenge
      );
      headers.Authorization = digestHeader;

      let response = await this.axios.request<T>({
        method,
        url: path,
        data,
        params,
        headers
      });

      return response.data;
    } catch (error: any) {
      if (error?.response?.data) {
        let errData = error.response.data;
        throw new Error(
          errData.detail || errData.reason || errData.errorCode || JSON.stringify(errData)
        );
      }
      throw error;
    }
  }

  // --- Organizations ---

  async listOrganizations(params?: { itemsPerPage?: number; pageNum?: number }): Promise<any> {
    return this.request('GET', '/orgs', undefined, params);
  }

  async getOrganization(orgId: string): Promise<any> {
    return this.request('GET', `/orgs/${orgId}`);
  }

  // --- Projects ---

  async listProjects(params?: { itemsPerPage?: number; pageNum?: number }): Promise<any> {
    return this.request('GET', '/groups', undefined, params);
  }

  async getProject(projectId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}`);
  }

  async createProject(data: {
    name: string;
    orgId: string;
    regionUsageRestrictions?: string;
  }): Promise<any> {
    return this.request('POST', '/groups', data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request('DELETE', `/groups/${projectId}`);
  }

  // --- Clusters ---

  async listClusters(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/clusters`, undefined, params);
  }

  async getCluster(projectId: string, clusterName: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/clusters/${clusterName}`);
  }

  async createCluster(projectId: string, data: any): Promise<any> {
    return this.request('POST', `/groups/${projectId}/clusters`, data);
  }

  async updateCluster(projectId: string, clusterName: string, data: any): Promise<any> {
    return this.request('PATCH', `/groups/${projectId}/clusters/${clusterName}`, data);
  }

  async deleteCluster(projectId: string, clusterName: string): Promise<void> {
    await this.request('DELETE', `/groups/${projectId}/clusters/${clusterName}`);
  }

  // --- Flex Clusters ---

  async listFlexClusters(projectId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/flexClusters`);
  }

  async getFlexCluster(projectId: string, clusterName: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/flexClusters/${clusterName}`);
  }

  async createFlexCluster(projectId: string, data: any): Promise<any> {
    return this.request('POST', `/groups/${projectId}/flexClusters`, data);
  }

  async updateFlexCluster(projectId: string, clusterName: string, data: any): Promise<any> {
    return this.request('PATCH', `/groups/${projectId}/flexClusters/${clusterName}`, data);
  }

  async deleteFlexCluster(projectId: string, clusterName: string): Promise<void> {
    await this.request('DELETE', `/groups/${projectId}/flexClusters/${clusterName}`);
  }

  // --- Database Users ---

  async listDatabaseUsers(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/databaseUsers`, undefined, params);
  }

  async getDatabaseUser(projectId: string, authDb: string, username: string): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/databaseUsers/${authDb}/${encodeURIComponent(username)}`
    );
  }

  async createDatabaseUser(projectId: string, data: any): Promise<any> {
    return this.request('POST', `/groups/${projectId}/databaseUsers`, data);
  }

  async updateDatabaseUser(
    projectId: string,
    authDb: string,
    username: string,
    data: any
  ): Promise<any> {
    return this.request(
      'PATCH',
      `/groups/${projectId}/databaseUsers/${authDb}/${encodeURIComponent(username)}`,
      data
    );
  }

  async deleteDatabaseUser(
    projectId: string,
    authDb: string,
    username: string
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/groups/${projectId}/databaseUsers/${authDb}/${encodeURIComponent(username)}`
    );
  }

  // --- IP Access List ---

  async listIpAccessList(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/accessList`, undefined, params);
  }

  async addIpAccessListEntries(projectId: string, entries: any[]): Promise<any> {
    return this.request('POST', `/groups/${projectId}/accessList`, entries);
  }

  async deleteIpAccessListEntry(projectId: string, entryValue: string): Promise<void> {
    await this.request(
      'DELETE',
      `/groups/${projectId}/accessList/${encodeURIComponent(entryValue)}`
    );
  }

  // --- Network Peering ---

  async listNetworkPeering(
    projectId: string,
    params?: { providerName?: string }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/peers`, undefined, params);
  }

  async getNetworkPeering(projectId: string, peerId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/peers/${peerId}`);
  }

  async createNetworkPeering(projectId: string, data: any): Promise<any> {
    return this.request('POST', `/groups/${projectId}/peers`, data);
  }

  async deleteNetworkPeering(projectId: string, peerId: string): Promise<void> {
    await this.request('DELETE', `/groups/${projectId}/peers/${peerId}`);
  }

  // --- Alerts ---

  async listAlertConfigurations(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/alertConfigs`, undefined, params);
  }

  async getAlertConfiguration(projectId: string, alertConfigId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/alertConfigs/${alertConfigId}`);
  }

  async createAlertConfiguration(projectId: string, data: any): Promise<any> {
    return this.request('POST', `/groups/${projectId}/alertConfigs`, data);
  }

  async updateAlertConfiguration(
    projectId: string,
    alertConfigId: string,
    data: any
  ): Promise<any> {
    return this.request('PUT', `/groups/${projectId}/alertConfigs/${alertConfigId}`, data);
  }

  async deleteAlertConfiguration(projectId: string, alertConfigId: string): Promise<void> {
    await this.request('DELETE', `/groups/${projectId}/alertConfigs/${alertConfigId}`);
  }

  async listAlerts(
    projectId: string,
    params?: { status?: string; itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/alerts`, undefined, params);
  }

  async getAlert(projectId: string, alertId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/alerts/${alertId}`);
  }

  async acknowledgeAlert(
    projectId: string,
    alertId: string,
    data: {
      acknowledgedUntil: string;
      acknowledgementComment?: string;
    }
  ): Promise<any> {
    return this.request('PATCH', `/groups/${projectId}/alerts/${alertId}`, data);
  }

  // --- Backups ---

  async listBackupSnapshots(
    projectId: string,
    clusterName: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots`,
      undefined,
      params
    );
  }

  async getBackupSnapshot(
    projectId: string,
    clusterName: string,
    snapshotId: string
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots/${snapshotId}`
    );
  }

  async createBackupSnapshot(
    projectId: string,
    clusterName: string,
    data: {
      description: string;
      retentionInDays: number;
    }
  ): Promise<any> {
    return this.request(
      'POST',
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots`,
      data
    );
  }

  async listBackupRestoreJobs(
    projectId: string,
    clusterName: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/backup/restoreJobs`,
      undefined,
      params
    );
  }

  async createBackupRestoreJob(
    projectId: string,
    clusterName: string,
    data: any
  ): Promise<any> {
    return this.request(
      'POST',
      `/groups/${projectId}/clusters/${clusterName}/backup/restoreJobs`,
      data
    );
  }

  async getBackupSchedule(projectId: string, clusterName: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/clusters/${clusterName}/backup/schedule`);
  }

  async updateBackupSchedule(projectId: string, clusterName: string, data: any): Promise<any> {
    return this.request(
      'PATCH',
      `/groups/${projectId}/clusters/${clusterName}/backup/schedule`,
      data
    );
  }

  // --- Atlas Search ---

  async listSearchIndexes(
    projectId: string,
    clusterName: string,
    databaseName: string,
    collectionName: string
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${databaseName}/${collectionName}`
    );
  }

  async getSearchIndex(projectId: string, clusterName: string, indexId: string): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${indexId}`
    );
  }

  async createSearchIndex(projectId: string, clusterName: string, data: any): Promise<any> {
    return this.request(
      'POST',
      `/groups/${projectId}/clusters/${clusterName}/search/indexes`,
      data
    );
  }

  async updateSearchIndex(
    projectId: string,
    clusterName: string,
    indexId: string,
    data: any
  ): Promise<any> {
    return this.request(
      'PATCH',
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${indexId}`,
      data
    );
  }

  async deleteSearchIndex(
    projectId: string,
    clusterName: string,
    indexId: string
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${indexId}`
    );
  }

  // --- Metrics ---

  async getClusterProcesses(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ): Promise<any> {
    return this.request('GET', `/groups/${projectId}/processes`, undefined, params);
  }

  async getProcessMeasurements(
    projectId: string,
    processId: string,
    params: {
      granularity: string;
      period?: string;
      start?: string;
      end?: string;
      m?: string[];
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {
      granularity: params.granularity
    };
    if (params.period) queryParams.period = params.period;
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.m && params.m.length > 0) {
      queryParams.m = params.m.join(',');
    }
    return this.request(
      'GET',
      `/groups/${projectId}/processes/${processId}/measurements`,
      undefined,
      queryParams
    );
  }

  async getDiskMeasurements(
    projectId: string,
    processId: string,
    partitionName: string,
    params: {
      granularity: string;
      period?: string;
      start?: string;
      end?: string;
      m?: string[];
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {
      granularity: params.granularity
    };
    if (params.period) queryParams.period = params.period;
    if (params.start) queryParams.start = params.start;
    if (params.end) queryParams.end = params.end;
    if (params.m && params.m.length > 0) {
      queryParams.m = params.m.join(',');
    }
    return this.request(
      'GET',
      `/groups/${projectId}/processes/${processId}/disks/${partitionName}/measurements`,
      undefined,
      queryParams
    );
  }

  // --- Third-Party Integrations ---

  async listIntegrations(projectId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/integrations`);
  }

  async getIntegration(projectId: string, integrationType: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/integrations/${integrationType}`);
  }

  async configureIntegration(
    projectId: string,
    integrationType: string,
    data: any
  ): Promise<any> {
    return this.request('POST', `/groups/${projectId}/integrations/${integrationType}`, data);
  }

  async deleteIntegration(projectId: string, integrationType: string): Promise<void> {
    await this.request('DELETE', `/groups/${projectId}/integrations/${integrationType}`);
  }

  // --- Performance Advisor ---

  async listSuggestedIndexes(
    projectId: string,
    processId: string,
    params?: {
      namespaces?: string;
      duration?: number;
      since?: number;
      nIndexes?: number;
      nExamples?: number;
    }
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/processes/${processId}/performanceAdvisor/suggestedIndexes`,
      undefined,
      params
    );
  }

  async listSlowQueries(
    projectId: string,
    processId: string,
    params?: {
      namespaces?: string;
      duration?: number;
      since?: number;
      nLogs?: number;
    }
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/processes/${processId}/performanceAdvisor/slowQueryLogs`,
      undefined,
      params
    );
  }

  // --- Online Archive ---

  async listOnlineArchives(projectId: string, clusterName: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/clusters/${clusterName}/onlineArchives`);
  }

  async getOnlineArchive(
    projectId: string,
    clusterName: string,
    archiveId: string
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/clusters/${clusterName}/onlineArchives/${archiveId}`
    );
  }

  async createOnlineArchive(projectId: string, clusterName: string, data: any): Promise<any> {
    return this.request(
      'POST',
      `/groups/${projectId}/clusters/${clusterName}/onlineArchives`,
      data
    );
  }

  async updateOnlineArchive(
    projectId: string,
    clusterName: string,
    archiveId: string,
    data: any
  ): Promise<any> {
    return this.request(
      'PATCH',
      `/groups/${projectId}/clusters/${clusterName}/onlineArchives/${archiveId}`,
      data
    );
  }

  async deleteOnlineArchive(
    projectId: string,
    clusterName: string,
    archiveId: string
  ): Promise<void> {
    await this.request(
      'DELETE',
      `/groups/${projectId}/clusters/${clusterName}/onlineArchives/${archiveId}`
    );
  }

  // --- Events ---

  async listProjectEvents(
    projectId: string,
    params?: {
      eventType?: string[];
      minDate?: string;
      maxDate?: string;
      itemsPerPage?: number;
      pageNum?: number;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.itemsPerPage) queryParams.itemsPerPage = params.itemsPerPage;
    if (params?.pageNum) queryParams.pageNum = params.pageNum;
    if (params?.minDate) queryParams.minDate = params.minDate;
    if (params?.maxDate) queryParams.maxDate = params.maxDate;
    if (params?.eventType && params.eventType.length > 0) {
      queryParams.eventType = params.eventType.join(',');
    }
    return this.request('GET', `/groups/${projectId}/events`, undefined, queryParams);
  }

  async listOrganizationEvents(
    orgId: string,
    params?: {
      eventType?: string[];
      minDate?: string;
      maxDate?: string;
      itemsPerPage?: number;
      pageNum?: number;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.itemsPerPage) queryParams.itemsPerPage = params.itemsPerPage;
    if (params?.pageNum) queryParams.pageNum = params.pageNum;
    if (params?.minDate) queryParams.minDate = params.minDate;
    if (params?.maxDate) queryParams.maxDate = params.maxDate;
    if (params?.eventType && params.eventType.length > 0) {
      queryParams.eventType = params.eventType.join(',');
    }
    return this.request('GET', `/orgs/${orgId}/events`, undefined, queryParams);
  }

  // --- Access Logs ---

  async listAccessLogs(
    projectId: string,
    clusterName: string,
    params?: {
      start?: string;
      end?: string;
      nLogs?: number;
      authResult?: boolean;
      ipAddress?: string;
    }
  ): Promise<any> {
    return this.request(
      'GET',
      `/groups/${projectId}/dbAccessHistory/clusters/${clusterName}`,
      undefined,
      params
    );
  }

  // --- Maintenance Windows ---

  async getMaintenanceWindow(projectId: string): Promise<any> {
    return this.request('GET', `/groups/${projectId}/maintenanceWindow`);
  }

  async updateMaintenanceWindow(
    projectId: string,
    data: {
      dayOfWeek: number;
      hourOfDay: number;
      autoDeferOnceEnabled?: boolean;
    }
  ): Promise<any> {
    return this.request('PATCH', `/groups/${projectId}/maintenanceWindow`, data);
  }

  async deferMaintenanceWindow(projectId: string): Promise<void> {
    await this.request('POST', `/groups/${projectId}/maintenanceWindow/defer`);
  }
}
