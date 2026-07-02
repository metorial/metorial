import { createAxios } from 'slates';

let ATLAS_API_VERSION = '2025-03-12';
let ACCEPT_HEADER = `application/vnd.atlas.${ATLAS_API_VERSION}+json`;

export class AtlasClient {
  private axios;

  constructor(authConfig: {
    token: string;
    authMethod: string;
    publicKey?: string;
    privateKey?: string;
  }) {
    let headers: Record<string, string> = {
      Accept: ACCEPT_HEADER,
      'Content-Type': 'application/json'
    };

    if (authConfig.authMethod === 'oauth') {
      headers.Authorization = `Bearer ${authConfig.token}`;
    } else {
      headers.Authorization = `Basic ${authConfig.token}`;
    }

    this.axios = createAxios({
      baseURL: 'https://cloud.mongodb.com/api/atlas/v2',
      headers
    });
  }

  // ==================== Organizations ====================

  async listOrganizations(params?: { itemsPerPage?: number; pageNum?: number }) {
    let response = await this.axios.get('/orgs', { params });
    return response.data;
  }

  async getOrganization(orgId: string) {
    let response = await this.axios.get(`/orgs/${orgId}`);
    return response.data;
  }

  // ==================== Projects (Groups) ====================

  async listProjects(params?: { itemsPerPage?: number; pageNum?: number }) {
    let response = await this.axios.get('/groups', { params });
    return response.data;
  }

  async listOrganizationProjects(
    orgId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/orgs/${orgId}/groups`, { params });
    return response.data;
  }

  async getProject(projectId: string) {
    let response = await this.axios.get(`/groups/${projectId}`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    orgId: string;
    regionUsageRestrictions?: string;
  }) {
    let response = await this.axios.post('/groups', data);
    return response.data;
  }

  async deleteProject(projectId: string) {
    let response = await this.axios.delete(`/groups/${projectId}`);
    return response.data;
  }

  // ==================== Clusters ====================

  async listClusters(projectId: string, params?: { itemsPerPage?: number; pageNum?: number }) {
    let response = await this.axios.get(`/groups/${projectId}/clusters`, { params });
    return response.data;
  }

  async getCluster(projectId: string, clusterName: string) {
    let response = await this.axios.get(`/groups/${projectId}/clusters/${clusterName}`);
    return response.data;
  }

  async createCluster(projectId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/groups/${projectId}/clusters`, data);
    return response.data;
  }

  async updateCluster(projectId: string, clusterName: string, data: Record<string, any>) {
    let response = await this.axios.patch(
      `/groups/${projectId}/clusters/${clusterName}`,
      data
    );
    return response.data;
  }

  async deleteCluster(projectId: string, clusterName: string) {
    let response = await this.axios.delete(`/groups/${projectId}/clusters/${clusterName}`);
    return response.data;
  }

  // ==================== Flex Clusters ====================

  async listFlexClusters(projectId: string) {
    let response = await this.axios.get(`/groups/${projectId}/flexClusters`);
    return response.data;
  }

  async getFlexCluster(projectId: string, clusterName: string) {
    let response = await this.axios.get(`/groups/${projectId}/flexClusters/${clusterName}`);
    return response.data;
  }

  // ==================== Database Users ====================

  async listDatabaseUsers(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/databaseUsers`, { params });
    return response.data;
  }

  async getDatabaseUser(projectId: string, authDb: string, username: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/databaseUsers/${authDb}/${username}`
    );
    return response.data;
  }

  async createDatabaseUser(
    projectId: string,
    data: {
      databaseName: string;
      username: string;
      password?: string;
      roles: Array<{ databaseName: string; roleName: string; collectionName?: string }>;
      scopes?: Array<{ name: string; type: string }>;
      awsIAMType?: string;
      x509Type?: string;
      ldapAuthType?: string;
      deleteAfterDate?: string;
    }
  ) {
    let response = await this.axios.post(`/groups/${projectId}/databaseUsers`, data);
    return response.data;
  }

  async updateDatabaseUser(
    projectId: string,
    authDb: string,
    username: string,
    data: Record<string, any>
  ) {
    let response = await this.axios.patch(
      `/groups/${projectId}/databaseUsers/${authDb}/${username}`,
      data
    );
    return response.data;
  }

  async deleteDatabaseUser(projectId: string, authDb: string, username: string) {
    let response = await this.axios.delete(
      `/groups/${projectId}/databaseUsers/${authDb}/${username}`
    );
    return response.data;
  }

  // ==================== IP Access List ====================

  async listIpAccessList(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/accessList`, { params });
    return response.data;
  }

  async getIpAccessListEntry(projectId: string, entryValue: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/accessList/${encodeURIComponent(entryValue)}`
    );
    return response.data;
  }

  async addIpAccessListEntries(
    projectId: string,
    entries: Array<{
      ipAddress?: string;
      cidrBlock?: string;
      awsSecurityGroup?: string;
      comment?: string;
      deleteAfterDate?: string;
    }>
  ) {
    let response = await this.axios.post(`/groups/${projectId}/accessList`, entries);
    return response.data;
  }

  async deleteIpAccessListEntry(projectId: string, entryValue: string) {
    let response = await this.axios.delete(
      `/groups/${projectId}/accessList/${encodeURIComponent(entryValue)}`
    );
    return response.data;
  }

  // ==================== Alerts ====================

  async listAlerts(
    projectId: string,
    params?: { status?: string; itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/alerts`, { params });
    return response.data;
  }

  async getAlert(projectId: string, alertId: string) {
    let response = await this.axios.get(`/groups/${projectId}/alerts/${alertId}`);
    return response.data;
  }

  async acknowledgeAlert(
    projectId: string,
    alertId: string,
    data: {
      acknowledgedUntil: string;
      acknowledgementComment?: string;
    }
  ) {
    let response = await this.axios.patch(`/groups/${projectId}/alerts/${alertId}`, data);
    return response.data;
  }

  // ==================== Alert Configurations ====================

  async listAlertConfigurations(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/alertConfigs`, { params });
    return response.data;
  }

  async getAlertConfiguration(projectId: string, alertConfigId: string) {
    let response = await this.axios.get(`/groups/${projectId}/alertConfigs/${alertConfigId}`);
    return response.data;
  }

  async createAlertConfiguration(projectId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/groups/${projectId}/alertConfigs`, data);
    return response.data;
  }

  async updateAlertConfiguration(
    projectId: string,
    alertConfigId: string,
    data: Record<string, any>
  ) {
    let response = await this.axios.put(
      `/groups/${projectId}/alertConfigs/${alertConfigId}`,
      data
    );
    return response.data;
  }

  async deleteAlertConfiguration(projectId: string, alertConfigId: string) {
    let response = await this.axios.delete(
      `/groups/${projectId}/alertConfigs/${alertConfigId}`
    );
    return response.data;
  }

  // ==================== Cloud Backups ====================

  async listBackupSnapshots(
    projectId: string,
    clusterName: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots`,
      { params }
    );
    return response.data;
  }

  async getBackupSnapshot(projectId: string, clusterName: string, snapshotId: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots/${snapshotId}`
    );
    return response.data;
  }

  async createOnDemandSnapshot(
    projectId: string,
    clusterName: string,
    data: {
      description?: string;
      retentionInDays?: number;
    }
  ) {
    let response = await this.axios.post(
      `/groups/${projectId}/clusters/${clusterName}/backup/snapshots`,
      data
    );
    return response.data;
  }

  async listBackupRestoreJobs(
    projectId: string,
    clusterName: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(
      `/groups/${projectId}/clusters/${clusterName}/backup/restoreJobs`,
      { params }
    );
    return response.data;
  }

  async createRestoreJob(
    projectId: string,
    clusterName: string,
    data: {
      deliveryType: string;
      snapshotId?: string;
      targetClusterName?: string;
      targetGroupId?: string;
      pointInTimeUTCSeconds?: number;
      oplogTs?: number;
      oplogInc?: number;
    }
  ) {
    let response = await this.axios.post(
      `/groups/${projectId}/clusters/${clusterName}/backup/restoreJobs`,
      data
    );
    return response.data;
  }

  async getBackupSchedule(projectId: string, clusterName: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/clusters/${clusterName}/backup/schedule`
    );
    return response.data;
  }

  async updateBackupSchedule(
    projectId: string,
    clusterName: string,
    data: Record<string, any>
  ) {
    let response = await this.axios.patch(
      `/groups/${projectId}/clusters/${clusterName}/backup/schedule`,
      data
    );
    return response.data;
  }

  // ==================== Events / Activity Feed ====================

  async listProjectEvents(
    projectId: string,
    params?: {
      eventType?: string[];
      minDate?: string;
      maxDate?: string;
      itemsPerPage?: number;
      pageNum?: number;
    }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/events`, { params });
    return response.data;
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
  ) {
    let response = await this.axios.get(`/orgs/${orgId}/events`, { params });
    return response.data;
  }

  async getProjectEvent(projectId: string, eventId: string) {
    let response = await this.axios.get(`/groups/${projectId}/events/${eventId}`);
    return response.data;
  }

  // ==================== Third-Party Integrations ====================

  async listThirdPartyIntegrations(projectId: string) {
    let response = await this.axios.get(`/groups/${projectId}/integrations`);
    return response.data;
  }

  async getThirdPartyIntegration(projectId: string, integrationType: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/integrations/${integrationType}`
    );
    return response.data;
  }

  async configureWebhookIntegration(
    projectId: string,
    data: {
      url: string;
      secret?: string;
    }
  ) {
    let response = await this.axios.post(`/groups/${projectId}/integrations/WEBHOOK`, {
      type: 'WEBHOOK',
      ...data
    });
    return response.data;
  }

  async deleteThirdPartyIntegration(projectId: string, integrationType: string) {
    let response = await this.axios.delete(
      `/groups/${projectId}/integrations/${integrationType}`
    );
    return response.data;
  }

  // ==================== Network Peering ====================

  async listNetworkPeeringConnections(
    projectId: string,
    params?: { providerName?: string; itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/peers`, { params });
    return response.data;
  }

  async getNetworkPeeringConnection(projectId: string, peerId: string) {
    let response = await this.axios.get(`/groups/${projectId}/peers/${peerId}`);
    return response.data;
  }

  // ==================== Private Endpoints ====================

  async listPrivateEndpoints(projectId: string, cloudProvider: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/privateEndpoint/${cloudProvider}/endpointService`
    );
    return response.data;
  }

  // ==================== Atlas Search ====================

  async listSearchIndexes(
    projectId: string,
    clusterName: string,
    dbName: string,
    collectionName: string
  ) {
    let response = await this.axios.get(
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${dbName}/${collectionName}`
    );
    return response.data;
  }

  async getSearchIndex(projectId: string, clusterName: string, indexId: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${indexId}`
    );
    return response.data;
  }

  async createSearchIndex(
    projectId: string,
    clusterName: string,
    data: {
      collectionName: string;
      database: string;
      name: string;
      type?: string;
      definition?: Record<string, any>;
    }
  ) {
    let response = await this.axios.post(
      `/groups/${projectId}/clusters/${clusterName}/search/indexes`,
      data
    );
    return response.data;
  }

  async updateSearchIndex(
    projectId: string,
    clusterName: string,
    indexId: string,
    data: Record<string, any>
  ) {
    let response = await this.axios.patch(
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${indexId}`,
      data
    );
    return response.data;
  }

  async deleteSearchIndex(projectId: string, clusterName: string, indexId: string) {
    let response = await this.axios.delete(
      `/groups/${projectId}/clusters/${clusterName}/search/indexes/${indexId}`
    );
    return response.data;
  }

  // ==================== Custom Database Roles ====================

  async listCustomDatabaseRoles(projectId: string) {
    let response = await this.axios.get(`/groups/${projectId}/customDBRoles/roles`);
    return response.data;
  }

  async getCustomDatabaseRole(projectId: string, roleName: string) {
    let response = await this.axios.get(
      `/groups/${projectId}/customDBRoles/roles/${roleName}`
    );
    return response.data;
  }

  async createCustomDatabaseRole(
    projectId: string,
    data: {
      roleName: string;
      actions?: Array<{
        action: string;
        resources: Array<{ collection?: string; db?: string }>;
      }>;
      inheritedRoles?: Array<{ db: string; role: string }>;
    }
  ) {
    let response = await this.axios.post(`/groups/${projectId}/customDBRoles/roles`, data);
    return response.data;
  }

  async deleteCustomDatabaseRole(projectId: string, roleName: string) {
    let response = await this.axios.delete(
      `/groups/${projectId}/customDBRoles/roles/${roleName}`
    );
    return response.data;
  }

  // ==================== Monitoring ====================

  async listProcesses(
    projectId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/groups/${projectId}/processes`, { params });
    return response.data;
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
  ) {
    let response = await this.axios.get(
      `/groups/${projectId}/processes/${processId}/measurements`,
      { params }
    );
    return response.data;
  }

  async getProcessDiskMeasurements(
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
  ) {
    let response = await this.axios.get(
      `/groups/${projectId}/processes/${processId}/disks/${partitionName}/measurements`,
      { params }
    );
    return response.data;
  }

  async getProcessDatabases(
    projectId: string,
    processId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(
      `/groups/${projectId}/processes/${processId}/databases`,
      { params }
    );
    return response.data;
  }

  // ==================== Maintenance Windows ====================

  async getMaintenanceWindow(projectId: string) {
    let response = await this.axios.get(`/groups/${projectId}/maintenanceWindow`);
    return response.data;
  }

  async updateMaintenanceWindow(
    projectId: string,
    data: {
      dayOfWeek: number;
      hourOfDay: number;
      autoDeferOnceEnabled?: boolean;
    }
  ) {
    let response = await this.axios.patch(`/groups/${projectId}/maintenanceWindow`, data);
    return response.data;
  }

  // ==================== Encryption at Rest ====================

  async getEncryptionAtRest(projectId: string) {
    let response = await this.axios.get(`/groups/${projectId}/encryptionAtRest`);
    return response.data;
  }

  // ==================== Invoices ====================

  async listOrganizationInvoices(
    orgId: string,
    params?: { itemsPerPage?: number; pageNum?: number }
  ) {
    let response = await this.axios.get(`/orgs/${orgId}/invoices`, { params });
    return response.data;
  }

  async getOrganizationInvoice(orgId: string, invoiceId: string) {
    let response = await this.axios.get(`/orgs/${orgId}/invoices/${invoiceId}`);
    return response.data;
  }

  async getPendingInvoice(orgId: string) {
    let response = await this.axios.get(`/orgs/${orgId}/invoices/pending`);
    return response.data;
  }
}
