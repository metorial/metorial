import { createAxios } from 'slates';

export interface GrafanaClientConfig {
  instanceUrl: string;
  token: string;
  organizationId?: string;
}

export class GrafanaClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: GrafanaClientConfig) {
    let baseUrl = config.instanceUrl.replace(/\/+$/, '');
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.token.startsWith('Basic ')) {
      headers.Authorization = config.token;
    } else {
      headers.Authorization = `Bearer ${config.token}`;
    }

    if (config.organizationId) {
      headers['X-Grafana-Org-Id'] = config.organizationId;
    }

    this.axios = createAxios({
      baseURL: baseUrl,
      headers
    });
  }

  // ---- Dashboards ----

  async searchDashboards(
    params: {
      query?: string;
      tag?: string[];
      type?: 'dash-db' | 'dash-folder';
      folderUIDs?: string[];
      starred?: boolean;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params.query) queryParams.query = params.query;
    if (params.tag?.length) queryParams.tag = params.tag;
    if (params.type) queryParams.type = params.type;
    if (params.folderUIDs?.length) queryParams.folderUIDs = params.folderUIDs;
    if (params.starred !== undefined) queryParams.starred = params.starred;
    if (params.limit) queryParams.limit = params.limit;
    if (params.page) queryParams.page = params.page;

    let response = await this.axios.get('/api/search', { params: queryParams });
    return response.data;
  }

  async getDashboard(uid: string): Promise<any> {
    let response = await this.axios.get(`/api/dashboards/uid/${uid}`);
    return response.data;
  }

  async createOrUpdateDashboard(
    dashboard: any,
    options: {
      folderUid?: string;
      overwrite?: boolean;
      message?: string;
    } = {}
  ): Promise<any> {
    let body: Record<string, any> = {
      dashboard,
      overwrite: options.overwrite ?? false
    };
    if (options.folderUid) body.folderUid = options.folderUid;
    if (options.message) body.message = options.message;

    let response = await this.axios.post('/api/dashboards/db', body);
    return response.data;
  }

  async deleteDashboard(uid: string): Promise<any> {
    let response = await this.axios.delete(`/api/dashboards/uid/${uid}`);
    return response.data;
  }

  // ---- Folders ----

  async listFolders(params: { limit?: number; page?: number } = {}): Promise<any[]> {
    let response = await this.axios.get('/api/folders', { params });
    return response.data;
  }

  async getFolder(uid: string): Promise<any> {
    let response = await this.axios.get(`/api/folders/${uid}`);
    return response.data;
  }

  async createFolder(title: string, uid?: string, parentUid?: string): Promise<any> {
    let body: Record<string, any> = { title };
    if (uid) body.uid = uid;
    if (parentUid) body.parentUid = parentUid;

    let response = await this.axios.post('/api/folders', body);
    return response.data;
  }

  async updateFolder(uid: string, title: string, version?: number): Promise<any> {
    let body: Record<string, any> = { title };
    if (version !== undefined) body.version = version;

    let response = await this.axios.put(`/api/folders/${uid}`, body);
    return response.data;
  }

  async deleteFolder(uid: string, forceDeleteRules?: boolean): Promise<any> {
    let params: Record<string, any> = {};
    if (forceDeleteRules) params.forceDeleteRules = true;

    let response = await this.axios.delete(`/api/folders/${uid}`, { params });
    return response.data;
  }

  // ---- Data Sources ----

  async listDataSources(): Promise<any[]> {
    let response = await this.axios.get('/api/datasources');
    return response.data;
  }

  async getDataSource(uid: string): Promise<any> {
    let response = await this.axios.get(`/api/datasources/uid/${uid}`);
    return response.data;
  }

  async createDataSource(dataSource: {
    name: string;
    type: string;
    access?: string;
    url?: string;
    isDefault?: boolean;
    jsonData?: Record<string, any>;
    secureJsonData?: Record<string, any>;
  }): Promise<any> {
    let body = {
      access: 'proxy',
      ...dataSource
    };
    let response = await this.axios.post('/api/datasources', body);
    return response.data;
  }

  async updateDataSource(uid: string, dataSource: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/api/datasources/uid/${uid}`, dataSource);
    return response.data;
  }

  async deleteDataSource(uid: string): Promise<any> {
    let response = await this.axios.delete(`/api/datasources/uid/${uid}`);
    return response.data;
  }

  // ---- Alert Rules ----

  async listAlertRules(): Promise<any[]> {
    let response = await this.axios.get('/api/v1/provisioning/alert-rules');
    return response.data;
  }

  async getAlertRule(uid: string): Promise<any> {
    let response = await this.axios.get(`/api/v1/provisioning/alert-rules/${uid}`);
    return response.data;
  }

  async createAlertRule(rule: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v1/provisioning/alert-rules', rule, {
      headers: { 'X-Disable-Provenance': 'true' }
    });
    return response.data;
  }

  async updateAlertRule(uid: string, rule: Record<string, any>): Promise<any> {
    let response = await this.axios.put(`/api/v1/provisioning/alert-rules/${uid}`, rule, {
      headers: { 'X-Disable-Provenance': 'true' }
    });
    return response.data;
  }

  async deleteAlertRule(uid: string): Promise<any> {
    let response = await this.axios.delete(`/api/v1/provisioning/alert-rules/${uid}`);
    return response.data;
  }

  // ---- Contact Points ----

  async listContactPoints(): Promise<any[]> {
    let response = await this.axios.get('/api/v1/provisioning/contact-points');
    return response.data;
  }

  async createContactPoint(contactPoint: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v1/provisioning/contact-points', contactPoint, {
      headers: { 'X-Disable-Provenance': 'true' }
    });
    return response.data;
  }

  async updateContactPoint(uid: string, contactPoint: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/api/v1/provisioning/contact-points/${uid}`,
      contactPoint,
      {
        headers: { 'X-Disable-Provenance': 'true' }
      }
    );
    return response.data;
  }

  async deleteContactPoint(uid: string): Promise<any> {
    let response = await this.axios.delete(`/api/v1/provisioning/contact-points/${uid}`);
    return response.data;
  }

  // ---- Notification Policies ----

  async getNotificationPolicyTree(): Promise<any> {
    let response = await this.axios.get('/api/v1/provisioning/policies');
    return response.data;
  }

  async updateNotificationPolicyTree(policies: Record<string, any>): Promise<any> {
    let response = await this.axios.put('/api/v1/provisioning/policies', policies, {
      headers: { 'X-Disable-Provenance': 'true' }
    });
    return response.data;
  }

  // ---- Mute Timings ----

  async listMuteTimings(): Promise<any[]> {
    let response = await this.axios.get('/api/v1/provisioning/mute-timings');
    return response.data;
  }

  async createMuteTiming(timing: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/api/v1/provisioning/mute-timings', timing, {
      headers: { 'X-Disable-Provenance': 'true' }
    });
    return response.data;
  }

  async updateMuteTiming(name: string, timing: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/api/v1/provisioning/mute-timings/${encodeURIComponent(name)}`,
      timing,
      {
        headers: { 'X-Disable-Provenance': 'true' }
      }
    );
    return response.data;
  }

  async deleteMuteTiming(name: string): Promise<any> {
    let response = await this.axios.delete(
      `/api/v1/provisioning/mute-timings/${encodeURIComponent(name)}`
    );
    return response.data;
  }

  // ---- Annotations ----

  async findAnnotations(
    params: {
      from?: number;
      to?: number;
      limit?: number;
      alertId?: number;
      dashboardUid?: string;
      panelId?: number;
      userId?: number;
      type?: 'alert' | 'annotation';
      tags?: string[];
    } = {}
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params.from !== undefined) queryParams.from = params.from;
    if (params.to !== undefined) queryParams.to = params.to;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.alertId !== undefined) queryParams.alertId = params.alertId;
    if (params.dashboardUid) queryParams.dashboardUID = params.dashboardUid;
    if (params.panelId !== undefined) queryParams.panelId = params.panelId;
    if (params.userId !== undefined) queryParams.userId = params.userId;
    if (params.type) queryParams.type = params.type;
    if (params.tags?.length) queryParams.tags = params.tags;

    let response = await this.axios.get('/api/annotations', { params: queryParams });
    return response.data;
  }

  async createAnnotation(annotation: {
    text: string;
    dashboardUID?: string;
    panelId?: number;
    time?: number;
    timeEnd?: number;
    tags?: string[];
  }): Promise<any> {
    let response = await this.axios.post('/api/annotations', annotation);
    return response.data;
  }

  async updateAnnotation(
    annotationId: number,
    annotation: {
      text?: string;
      time?: number;
      timeEnd?: number;
      tags?: string[];
    }
  ): Promise<any> {
    let response = await this.axios.patch(`/api/annotations/${annotationId}`, annotation);
    return response.data;
  }

  async deleteAnnotation(annotationId: number): Promise<any> {
    let response = await this.axios.delete(`/api/annotations/${annotationId}`);
    return response.data;
  }

  // ---- Snapshots ----

  async listSnapshots(query?: string, limit?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (query) params.query = query;
    if (limit) params.limit = limit;

    let response = await this.axios.get('/api/dashboard/snapshots', { params });
    return response.data;
  }

  async getSnapshot(key: string): Promise<any> {
    let response = await this.axios.get(`/api/snapshots/${key}`);
    return response.data;
  }

  async createSnapshot(snapshot: {
    dashboard: any;
    name?: string;
    expires?: number;
    external?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/api/snapshots', snapshot);
    return response.data;
  }

  async deleteSnapshot(key: string): Promise<any> {
    let response = await this.axios.delete(`/api/snapshots/${key}`);
    return response.data;
  }

  // ---- Teams ----

  async searchTeams(
    params: { query?: string; page?: number; perPage?: number } = {}
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.query) queryParams.query = params.query;
    if (params.page) queryParams.page = params.page;
    if (params.perPage) queryParams.perpage = params.perPage;

    let response = await this.axios.get('/api/teams/search', { params: queryParams });
    return response.data;
  }

  async getTeam(teamId: number): Promise<any> {
    let response = await this.axios.get(`/api/teams/${teamId}`);
    return response.data;
  }

  async createTeam(name: string, email?: string): Promise<any> {
    let body: Record<string, any> = { name };
    if (email) body.email = email;

    let response = await this.axios.post('/api/teams', body);
    return response.data;
  }

  async updateTeam(teamId: number, name: string, email?: string): Promise<any> {
    let body: Record<string, any> = { name };
    if (email) body.email = email;

    let response = await this.axios.put(`/api/teams/${teamId}`, body);
    return response.data;
  }

  async deleteTeam(teamId: number): Promise<any> {
    let response = await this.axios.delete(`/api/teams/${teamId}`);
    return response.data;
  }

  async getTeamMembers(teamId: number): Promise<any[]> {
    let response = await this.axios.get(`/api/teams/${teamId}/members`);
    return response.data;
  }

  async addTeamMember(teamId: number, userId: number): Promise<any> {
    let response = await this.axios.post(`/api/teams/${teamId}/members`, { userId });
    return response.data;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<any> {
    let response = await this.axios.delete(`/api/teams/${teamId}/members/${userId}`);
    return response.data;
  }

  // ---- Organization ----

  async getCurrentOrg(): Promise<any> {
    let response = await this.axios.get('/api/org');
    return response.data;
  }

  async getOrgUsers(): Promise<any[]> {
    let response = await this.axios.get('/api/org/users');
    return response.data;
  }

  async addOrgUser(loginOrEmail: string, role: string): Promise<any> {
    let response = await this.axios.post('/api/org/users', { loginOrEmail, role });
    return response.data;
  }

  async updateOrgUserRole(userId: number, role: string): Promise<any> {
    let response = await this.axios.patch(`/api/org/users/${userId}`, { role });
    return response.data;
  }

  async removeOrgUser(userId: number): Promise<any> {
    let response = await this.axios.delete(`/api/org/users/${userId}`);
    return response.data;
  }

  // ---- Playlists ----

  async listPlaylists(): Promise<any[]> {
    let response = await this.axios.get('/api/playlists');
    return response.data;
  }

  async getPlaylist(uid: string): Promise<any> {
    let response = await this.axios.get(`/api/playlists/${uid}`);
    return response.data;
  }

  async createPlaylist(playlist: {
    name: string;
    interval: string;
    items: Array<{ type: string; value: string }>;
  }): Promise<any> {
    let response = await this.axios.post('/api/playlists', playlist);
    return response.data;
  }

  async updatePlaylist(
    uid: string,
    playlist: {
      name: string;
      interval: string;
      items: Array<{ type: string; value: string }>;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/api/playlists/${uid}`, playlist);
    return response.data;
  }

  async deletePlaylist(uid: string): Promise<any> {
    let response = await this.axios.delete(`/api/playlists/${uid}`);
    return response.data;
  }

  // ---- Service Accounts ----

  async listServiceAccounts(): Promise<any> {
    let response = await this.axios.get('/api/serviceaccounts/search');
    return response.data;
  }

  async getServiceAccount(serviceAccountId: number): Promise<any> {
    let response = await this.axios.get(`/api/serviceaccounts/${serviceAccountId}`);
    return response.data;
  }

  async createServiceAccount(name: string, role: string): Promise<any> {
    let response = await this.axios.post('/api/serviceaccounts', { name, role });
    return response.data;
  }

  async deleteServiceAccount(serviceAccountId: number): Promise<any> {
    let response = await this.axios.delete(`/api/serviceaccounts/${serviceAccountId}`);
    return response.data;
  }

  async listServiceAccountTokens(serviceAccountId: number): Promise<any[]> {
    let response = await this.axios.get(`/api/serviceaccounts/${serviceAccountId}/tokens`);
    return response.data;
  }

  async createServiceAccountToken(
    serviceAccountId: number,
    name: string,
    secondsToLive?: number
  ): Promise<any> {
    let body: Record<string, any> = { name };
    if (secondsToLive !== undefined) body.secondsToLive = secondsToLive;

    let response = await this.axios.post(
      `/api/serviceaccounts/${serviceAccountId}/tokens`,
      body
    );
    return response.data;
  }

  async deleteServiceAccountToken(serviceAccountId: number, tokenId: number): Promise<any> {
    let response = await this.axios.delete(
      `/api/serviceaccounts/${serviceAccountId}/tokens/${tokenId}`
    );
    return response.data;
  }
}
