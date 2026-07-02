import { createAxios } from 'slates';
import { tableauApiError, tableauServiceError } from './errors';

export interface TableauClientConfig {
  serverUrl: string;
  apiVersion: string;
  siteId: string;
  token: string;
  userId?: string;
  expiresAt?: string;
}

export type ViewExportFormat = 'csv' | 'image' | 'pdf';

export interface ViewExportOptions {
  maxAgeMinutes?: number;
  filters?: Record<string, string | number | boolean>;
  imageResolution?: 'high';
  vizHeight?: number;
  vizWidth?: number;
  pdfPageType?: string;
  pdfOrientation?: 'Portrait' | 'Landscape';
}

export interface CollectionItemInput {
  contentLuid: string;
  contentType: string;
  contentName?: string;
}

let applyTableauErrorInterceptor = (http: ReturnType<typeof createAxios>) => {
  http.interceptors.response.use(
    response => response,
    error => Promise.reject(tableauApiError(error))
  );
};

let buildViewExportParams = (options?: ViewExportOptions) => {
  let params: Record<string, string> = {};

  if (options?.maxAgeMinutes !== undefined) {
    params.maxAge = String(options.maxAgeMinutes);
  }
  if (options?.imageResolution !== undefined) {
    params.resolution = options.imageResolution;
  }
  if (options?.vizHeight !== undefined) {
    params.vizHeight = String(options.vizHeight);
  }
  if (options?.vizWidth !== undefined) {
    params.vizWidth = String(options.vizWidth);
  }
  if (options?.pdfPageType !== undefined) {
    params.type = options.pdfPageType;
  }
  if (options?.pdfOrientation !== undefined) {
    params.orientation = options.pdfOrientation;
  }

  for (let [field, value] of Object.entries(options?.filters || {})) {
    params[`vf_${field}`] = String(value);
  }

  return params;
};

let encodeResponseData = (data: unknown) => Buffer.from(data as any).toString('base64');

let unwrapCollection = (result: any) => result?.collection ?? result;

let assertCollectionBatchSucceeded = (result: any, action: string) => {
  let errors = Array.isArray(result?.errors) ? result.errors : [];
  if (errors.length === 0) return;

  let details = errors
    .map((error: any) => error?.errorMessage || error?.message || error?.errorCode)
    .filter(Boolean)
    .join('; ');
  throw tableauServiceError(
    `Tableau collection ${action} failed${details ? `: ${details}` : '.'}`
  );
};

export class TableauClient {
  private http: ReturnType<typeof createAxios>;
  private resourceHttp: ReturnType<typeof createAxios>;
  private siteId: string;
  private userId?: string;

  constructor(config: TableauClientConfig) {
    let baseUrl = config.serverUrl.replace(/\/+$/, '');
    this.siteId = config.siteId;
    this.userId = config.userId;

    this.http = createAxios({
      baseURL: `${baseUrl}/api/${config.apiVersion}`,
      headers: {
        'X-Tableau-Auth': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.resourceHttp = createAxios({
      baseURL: `${baseUrl}/api/-`,
      headers: {
        'X-Tableau-Auth': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    applyTableauErrorInterceptor(this.http);
    applyTableauErrorInterceptor(this.resourceHttp);

    if (config.expiresAt && Date.parse(config.expiresAt) <= Date.now()) {
      throw tableauServiceError(
        'Tableau credentials token is expired. Reconnect the Tableau authentication profile to get a fresh token.'
      );
    }
  }

  // --- Workbooks ---

  async queryWorkbooks(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/workbooks`, {
      params: queryParams
    });
    return response.data;
  }

  async getWorkbook(workbookId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/workbooks/${workbookId}`);
    return response.data.workbook;
  }

  async updateWorkbook(
    workbookId: string,
    updates: {
      name?: string;
      description?: string;
      projectId?: string;
      ownerUserId?: string;
      showTabs?: boolean;
    }
  ): Promise<any> {
    let workbook: Record<string, any> = {};
    if (updates.name !== undefined) workbook.name = updates.name;
    if (updates.description !== undefined) workbook.description = updates.description;
    if (updates.showTabs !== undefined) workbook.showTabs = updates.showTabs;
    if (updates.projectId) workbook.project = { id: updates.projectId };
    if (updates.ownerUserId) workbook.owner = { id: updates.ownerUserId };

    let response = await this.http.put(`/sites/${this.siteId}/workbooks/${workbookId}`, {
      workbook
    });
    return response.data.workbook;
  }

  async deleteWorkbook(workbookId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/workbooks/${workbookId}`);
  }

  async getWorkbookConnections(workbookId: string): Promise<any> {
    let response = await this.http.get(
      `/sites/${this.siteId}/workbooks/${workbookId}/connections`
    );
    return response.data;
  }

  async queryViewsForWorkbook(workbookId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/workbooks/${workbookId}/views`);
    return response.data;
  }

  async addTagsToWorkbook(workbookId: string, tags: string[]): Promise<any> {
    let response = await this.http.put(`/sites/${this.siteId}/workbooks/${workbookId}/tags`, {
      tags: { tag: tags.map(t => ({ label: t })) }
    });
    return response.data;
  }

  async deleteTagFromWorkbook(workbookId: string, tagName: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/workbooks/${workbookId}/tags/${tagName}`);
  }

  // --- Data Sources ---

  async queryDatasources(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/datasources`, {
      params: queryParams
    });
    return response.data;
  }

  async getDatasource(datasourceId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/datasources/${datasourceId}`);
    return response.data.datasource;
  }

  async updateDatasource(
    datasourceId: string,
    updates: {
      name?: string;
      description?: string;
      projectId?: string;
      ownerUserId?: string;
      isCertified?: boolean;
      certificationNote?: string;
    }
  ): Promise<any> {
    let datasource: Record<string, any> = {};
    if (updates.name !== undefined) datasource.name = updates.name;
    if (updates.description !== undefined) datasource.description = updates.description;
    if (updates.isCertified !== undefined) datasource.isCertified = updates.isCertified;
    if (updates.certificationNote !== undefined)
      datasource.certificationNote = updates.certificationNote;
    if (updates.projectId) datasource.project = { id: updates.projectId };
    if (updates.ownerUserId) datasource.owner = { id: updates.ownerUserId };

    let response = await this.http.put(`/sites/${this.siteId}/datasources/${datasourceId}`, {
      datasource
    });
    return response.data.datasource;
  }

  async deleteDatasource(datasourceId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/datasources/${datasourceId}`);
  }

  async getDatasourceConnections(datasourceId: string): Promise<any> {
    let response = await this.http.get(
      `/sites/${this.siteId}/datasources/${datasourceId}/connections`
    );
    return response.data;
  }

  async refreshDatasource(datasourceId: string): Promise<any> {
    let response = await this.http.post(
      `/sites/${this.siteId}/datasources/${datasourceId}/refresh`,
      {}
    );
    return response.data.job;
  }

  // --- Views ---

  async queryViews(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/views`, { params: queryParams });
    return response.data;
  }

  async getViewData(viewId: string, options?: ViewExportOptions): Promise<string> {
    let response = await this.http.get(`/sites/${this.siteId}/views/${viewId}/data`, {
      params: buildViewExportParams(options),
      responseType: 'text',
      headers: { Accept: '*/*' }
    });
    return response.data;
  }

  async exportView(
    viewId: string,
    format: ViewExportFormat,
    options?: ViewExportOptions
  ): Promise<{
    data: string;
    contentType: string;
    encoding: 'text' | 'base64';
  }> {
    if (format === 'csv') {
      let data = await this.getViewData(viewId, options);
      return {
        data,
        contentType: 'text/csv',
        encoding: 'text'
      };
    }

    let endpoint = format === 'image' ? 'image' : 'pdf';
    let contentType = format === 'image' ? 'image/png' : 'application/pdf';
    let response = await this.http.get(`/sites/${this.siteId}/views/${viewId}/${endpoint}`, {
      params: buildViewExportParams(options),
      responseType: 'arraybuffer',
      headers: { Accept: '*/*' }
    });

    return {
      data: encodeResponseData(response.data),
      contentType,
      encoding: 'base64'
    };
  }

  // --- Custom Views ---

  async queryCustomViews(params?: { pageSize?: number; pageNumber?: number }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);

    let response = await this.http.get(`/sites/${this.siteId}/customviews`, {
      params: queryParams
    });
    return response.data;
  }

  async getCustomView(customViewId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/customviews/${customViewId}`);
    return response.data.customView;
  }

  async updateCustomView(
    customViewId: string,
    updates: {
      name?: string;
      ownerUserId?: string;
    }
  ): Promise<any> {
    let customView: Record<string, any> = {};
    if (updates.name !== undefined) customView.name = updates.name;
    if (updates.ownerUserId) customView.owner = { id: updates.ownerUserId };

    let response = await this.http.put(`/sites/${this.siteId}/customviews/${customViewId}`, {
      customView
    });
    return response.data.customView;
  }

  async deleteCustomView(customViewId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/customviews/${customViewId}`);
  }

  async exportCustomView(
    customViewId: string,
    format: ViewExportFormat,
    options?: ViewExportOptions
  ): Promise<{
    data: string;
    contentType: string;
    encoding: 'text' | 'base64';
  }> {
    let endpoint = format === 'csv' ? 'data' : format;
    let contentType =
      format === 'csv' ? 'text/csv' : format === 'image' ? 'image/png' : 'application/pdf';
    let response = await this.http.get(
      `/sites/${this.siteId}/customviews/${customViewId}/${endpoint}`,
      {
        params: buildViewExportParams(options),
        responseType: format === 'csv' ? 'text' : 'arraybuffer',
        headers: { Accept: '*/*' }
      }
    );

    return {
      data: format === 'csv' ? response.data : encodeResponseData(response.data),
      contentType,
      encoding: format === 'csv' ? 'text' : 'base64'
    };
  }

  // --- Users ---

  async queryUsers(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/users`, { params: queryParams });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/users/${userId}`);
    return response.data.user;
  }

  async addUser(name: string, siteRole: string, authSetting?: string): Promise<any> {
    let user: Record<string, any> = { name, siteRole };
    if (authSetting) user.authSetting = authSetting;

    let response = await this.http.post(`/sites/${this.siteId}/users`, { user });
    return response.data.user;
  }

  async updateUser(
    userId: string,
    updates: {
      fullName?: string;
      email?: string;
      siteRole?: string;
      authSetting?: string;
    }
  ): Promise<any> {
    let user: Record<string, any> = {};
    if (updates.fullName !== undefined) user.fullName = updates.fullName;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.siteRole !== undefined) user.siteRole = updates.siteRole;
    if (updates.authSetting !== undefined) user.authSetting = updates.authSetting;

    let response = await this.http.put(`/sites/${this.siteId}/users/${userId}`, { user });
    return response.data.user;
  }

  async removeUser(userId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/users/${userId}`);
  }

  // --- Groups ---

  async queryGroups(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/groups`, {
      params: queryParams
    });
    return response.data;
  }

  async createGroup(name: string, minimumSiteRole?: string): Promise<any> {
    let group: Record<string, any> = { name };
    if (minimumSiteRole) group.minimumSiteRole = minimumSiteRole;

    let response = await this.http.post(`/sites/${this.siteId}/groups`, { group });
    return response.data.group;
  }

  async updateGroup(
    groupId: string,
    updates: {
      name?: string;
      minimumSiteRole?: string;
    }
  ): Promise<any> {
    let group: Record<string, any> = {};
    if (updates.name !== undefined) group.name = updates.name;
    if (updates.minimumSiteRole !== undefined) group.minimumSiteRole = updates.minimumSiteRole;

    let response = await this.http.put(`/sites/${this.siteId}/groups/${groupId}`, { group });
    return response.data.group;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/groups/${groupId}`);
  }

  async addUserToGroup(groupId: string, userId: string): Promise<any> {
    let response = await this.http.post(`/sites/${this.siteId}/groups/${groupId}/users`, {
      user: { id: userId }
    });
    return response.data.user;
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/groups/${groupId}/users/${userId}`);
  }

  async getUsersInGroup(
    groupId: string,
    params?: {
      pageSize?: number;
      pageNumber?: number;
    }
  ): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);

    let response = await this.http.get(`/sites/${this.siteId}/groups/${groupId}/users`, {
      params: queryParams
    });
    return response.data;
  }

  // --- Projects ---

  async queryProjects(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/projects`, {
      params: queryParams
    });
    return response.data;
  }

  async createProject(
    name: string,
    opts?: {
      description?: string;
      parentProjectId?: string;
      contentPermissions?: string;
    }
  ): Promise<any> {
    let project: Record<string, any> = { name };
    if (opts?.description) project.description = opts.description;
    if (opts?.parentProjectId) project.parentProjectId = opts.parentProjectId;
    if (opts?.contentPermissions) project.contentPermissions = opts.contentPermissions;

    let response = await this.http.post(`/sites/${this.siteId}/projects`, { project });
    return response.data.project;
  }

  async updateProject(
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      parentProjectId?: string;
      contentPermissions?: string;
    }
  ): Promise<any> {
    let project: Record<string, any> = {};
    if (updates.name !== undefined) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.parentProjectId !== undefined)
      project.parentProjectId = updates.parentProjectId;
    if (updates.contentPermissions !== undefined)
      project.contentPermissions = updates.contentPermissions;

    let response = await this.http.put(`/sites/${this.siteId}/projects/${projectId}`, {
      project
    });
    return response.data.project;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/projects/${projectId}`);
  }

  // --- Permissions ---

  async queryPermissions(resourceType: string, resourceId: string): Promise<any> {
    let response = await this.http.get(
      `/sites/${this.siteId}/${resourceType}/${resourceId}/permissions`
    );
    return response.data.permissions;
  }

  async addPermissions(
    resourceType: string,
    resourceId: string,
    permissions: {
      granteeType: 'user' | 'group';
      granteeId: string;
      capabilities: { name: string; mode: 'Allow' | 'Deny' }[];
    }[]
  ): Promise<any> {
    let granteeCapabilities = permissions.map(p => {
      let grantee =
        p.granteeType === 'user'
          ? { user: { id: p.granteeId } }
          : { group: { id: p.granteeId } };

      return {
        ...grantee,
        capabilities: {
          capability: p.capabilities
        }
      };
    });

    let response = await this.http.put(
      `/sites/${this.siteId}/${resourceType}/${resourceId}/permissions`,
      {
        permissions: { granteeCapabilities }
      }
    );
    return response.data.permissions;
  }

  async deletePermission(
    resourceType: string,
    resourceId: string,
    granteeType: 'users' | 'groups',
    granteeId: string,
    capabilityName: string,
    capabilityMode: 'Allow' | 'Deny'
  ): Promise<void> {
    await this.http.delete(
      `/sites/${this.siteId}/${resourceType}/${resourceId}/permissions/${granteeType}/${granteeId}/${capabilityName}/${capabilityMode}`
    );
  }

  // --- Jobs ---

  async queryJobs(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;

    let response = await this.http.get(`/sites/${this.siteId}/jobs`, { params: queryParams });
    return response.data;
  }

  async getJob(jobId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/jobs/${jobId}`);
    return response.data.job;
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.http.put(`/sites/${this.siteId}/jobs/${jobId}`, {});
  }

  // --- Schedules ---

  async querySchedules(): Promise<any> {
    let response = await this.http.get(`/schedules`);
    return response.data;
  }

  // --- Favorites ---

  async addFavorite(
    userId: string,
    favoriteType: string,
    resourceId: string,
    label: string
  ): Promise<any> {
    let favorite: Record<string, any> = { label };
    favorite[favoriteType] = { id: resourceId };

    let response = await this.http.put(`/sites/${this.siteId}/favorites/${userId}`, {
      favorite
    });
    return response.data;
  }

  async deleteFavorite(
    userId: string,
    favoriteType: string,
    resourceId: string
  ): Promise<void> {
    await this.http.delete(
      `/sites/${this.siteId}/favorites/${userId}/${favoriteType}/${resourceId}`
    );
  }

  async getFavorites(userId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/favorites/${userId}`);
    return response.data;
  }

  // --- Flows ---

  async queryFlows(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.http.get(`/sites/${this.siteId}/flows`, { params: queryParams });
    return response.data;
  }

  async getFlow(flowId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/flows/${flowId}`);
    return response.data.flow;
  }

  async updateFlow(
    flowId: string,
    updates: {
      name?: string;
      description?: string;
      projectId?: string;
      ownerUserId?: string;
    }
  ): Promise<any> {
    let flow: Record<string, any> = {};
    if (updates.name !== undefined) flow.name = updates.name;
    if (updates.description !== undefined) flow.description = updates.description;
    if (updates.projectId) flow.project = { id: updates.projectId };
    if (updates.ownerUserId) flow.owner = { id: updates.ownerUserId };

    let response = await this.http.put(`/sites/${this.siteId}/flows/${flowId}`, { flow });
    return response.data.flow;
  }

  async deleteFlow(flowId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/flows/${flowId}`);
  }

  async runFlow(flowId: string): Promise<any> {
    let response = await this.http.post(`/sites/${this.siteId}/flows/${flowId}/run`, {});
    return response.data.job;
  }

  // --- Extract Refresh ---

  async refreshWorkbook(workbookId: string): Promise<any> {
    let response = await this.http.post(
      `/sites/${this.siteId}/workbooks/${workbookId}/refresh`,
      {}
    );
    return response.data.job;
  }

  // --- Webhooks ---

  async listWebhooks(): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/webhooks`);
    return response.data;
  }

  async createWebhook(name: string, eventName: string, destinationUrl: string): Promise<any> {
    let response = await this.http.post(`/sites/${this.siteId}/webhooks`, {
      webhook: {
        'webhook-destination-http': {
          method: 'POST',
          url: destinationUrl
        },
        'webhook-source': {
          'webhook-source-event-name': eventName
        },
        name
      }
    });
    return response.data.webhook;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/webhooks/${webhookId}`);
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/webhooks/${webhookId}`);
    return response.data.webhook;
  }

  // --- Data-Driven Alerts ---

  async queryAlerts(params?: { pageSize?: number; pageNumber?: number }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);

    let response = await this.http.get(`/sites/${this.siteId}/dataAlerts`, {
      params: queryParams
    });
    return response.data;
  }

  async getAlert(alertId: string): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}/dataAlerts/${alertId}`);
    return response.data.dataAlert;
  }

  async deleteAlert(alertId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/dataAlerts/${alertId}`);
  }

  async addUserToAlert(alertId: string, userId: string): Promise<void> {
    await this.http.post(`/sites/${this.siteId}/dataAlerts/${alertId}/users`, {
      user: { id: userId }
    });
  }

  async removeUserFromAlert(alertId: string, userId: string): Promise<void> {
    await this.http.delete(`/sites/${this.siteId}/dataAlerts/${alertId}/users/${userId}`);
  }

  // --- Collections ---

  async queryCollections(params?: {
    pageSize?: number;
    pageNumber?: number;
    filter?: string;
    sort?: string;
  }): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.resourceHttp.get(`/collections`, {
      params: queryParams
    });
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.resourceHttp.get(`/collections/${collectionId}`);
    return unwrapCollection(response.data);
  }

  async createCollection(name: string, description?: string): Promise<any> {
    let collection: Record<string, any> = { name };
    if (description) collection.description = description;

    let response = await this.resourceHttp.post(`/collections`, collection);
    return response.data;
  }

  async updateCollection(
    collectionId: string,
    updates: {
      name?: string;
      description?: string;
      ownerId?: string;
    }
  ): Promise<any> {
    let current = await this.getCollection(collectionId);
    let ownerLuid = updates.ownerId ?? this.userId;

    if (!ownerLuid) {
      throw tableauServiceError(
        'ownerId is required to update a collection when the authenticated Tableau user ID is unavailable.'
      );
    }

    let collection: Record<string, any> = { luid: collectionId };
    if (updates.name !== undefined) {
      collection.name = updates.name;
    } else if (typeof current.name === 'string') {
      collection.name = current.name;
    }
    if (updates.description !== undefined) {
      collection.description = updates.description;
    } else if (typeof current.description === 'string') {
      collection.description = current.description;
    }
    collection.ownerLuid = ownerLuid;

    let response = await this.resourceHttp.post(`/collections/batchUpdate`, [collection]);
    assertCollectionBatchSucceeded(response.data, 'update');
    return await this.getCollection(collectionId);
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.resourceHttp.delete(`/collections/${collectionId}`);
  }

  async listCollectionItems(
    collectionId: string,
    params?: {
      pageSize?: number;
      pageNumber?: number;
      filter?: string;
      sort?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.pageNumber) queryParams.pageNumber = String(params.pageNumber);
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.sort) queryParams.sort = params.sort;

    let response = await this.resourceHttp.get(`/collections/${collectionId}/items`, {
      params: queryParams
    });
    return response.data;
  }

  async addItemsToCollection(
    collectionId: string,
    items: CollectionItemInput[]
  ): Promise<any> {
    let response = await this.resourceHttp.post(
      `/collections/${collectionId}/items/batchCreate`,
      {
        items
      }
    );
    assertCollectionBatchSucceeded(response.data, 'add items');
    return response.data;
  }

  async removeItemsFromCollection(
    collectionId: string,
    items: CollectionItemInput[]
  ): Promise<any> {
    let response = await this.resourceHttp.post(
      `/collections/${collectionId}/items/batchDelete`,
      {
        items
      }
    );
    assertCollectionBatchSucceeded(response.data, 'remove items');
    return response.data;
  }

  // --- Site ---

  async getSiteInfo(): Promise<any> {
    let response = await this.http.get(`/sites/${this.siteId}`);
    return response.data.site;
  }
}
