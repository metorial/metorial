import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  requestAxiosData
} from 'slates';

type SharePointClientOptions = {
  graphToken: string;
  sharepointToken?: string;
};

type RawSharePointSiteUser = {
  Id?: unknown;
  ID?: unknown;
  id?: unknown;
  LoginName?: unknown;
  loginName?: unknown;
  Email?: unknown;
  email?: unknown;
  Title?: unknown;
  title?: unknown;
};

type SharePointRestResponse = RawSharePointSiteUser & {
  d?: RawSharePointSiteUser & {
    GetByEmail?: RawSharePointSiteUser;
  };
};

export type SharePointSiteUser = {
  id: number;
  loginName: string;
  email: string;
  displayName: string;
};

let trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export let normalizeSharePointSiteUserEmail = (value: string) => {
  let email = value.trim();
  if (!email) {
    throw createApiServiceError('email is required.', {
      reason: 'sharepoint_site_user_email_required'
    });
  }

  if (email.length > 255) {
    throw createApiServiceError('email must be 255 characters or fewer.', {
      reason: 'sharepoint_site_user_email_too_long'
    });
  }

  return email;
};

export let getSharePointHostnameFromWebUrl = (webUrl: string) => {
  try {
    return new URL(webUrl).hostname;
  } catch (error) {
    throw createApiServiceError('SharePoint site webUrl is not a valid URL.', {
      reason: 'sharepoint_site_web_url_invalid',
      parent: error
    });
  }
};

let escapeODataString = (value: string) => value.replace(/'/g, "''");

let sharePointRestApiError = (error: unknown, operation = 'SharePoint REST request') =>
  buildApiServiceError(error, {
    providerLabel: 'SharePoint REST',
    reason: 'sharepoint_rest_api_error',
    operation,
    detailKeys: ['message', 'error', 'error_description', 'code', 'value'],
    nestedKeys: ['error', 'details', 'errors']
  });

let unwrapSharePointSiteUser = (data: SharePointRestResponse): RawSharePointSiteUser =>
  data.d?.GetByEmail ?? data.d ?? data;

let optionalString = (value: unknown) => (typeof value === 'string' ? value : '');

let requiredString = (value: unknown, field: string) => {
  if (typeof value === 'string' && value) return value;

  throw createApiServiceError(`SharePoint REST response did not include ${field}.`, {
    reason: 'sharepoint_rest_response_invalid'
  });
};

let mapSharePointSiteUser = (data: SharePointRestResponse): SharePointSiteUser => {
  let user = unwrapSharePointSiteUser(data);
  let rawId = user.Id ?? user.ID ?? user.id;
  let id =
    typeof rawId === 'number'
      ? rawId
      : typeof rawId === 'string'
        ? Number.parseInt(rawId, 10)
        : Number.NaN;

  if (!Number.isInteger(id)) {
    throw createApiServiceError('SharePoint REST response did not include a numeric Id.', {
      reason: 'sharepoint_rest_response_invalid'
    });
  }

  return {
    id,
    loginName: requiredString(user.LoginName ?? user.loginName, 'LoginName'),
    email: optionalString(user.Email ?? user.email),
    displayName: optionalString(user.Title ?? user.title)
  };
};

let buildRootUploadPath = (driveId: string, parentPath: string, fileName: string) => {
  let normalizedParentPath = trimSlashes(parentPath);
  let relativePath = normalizedParentPath ? `${normalizedParentPath}/${fileName}` : fileName;
  return `/drives/${driveId}/root:/${relativePath}:/content`;
};

let getLocationHeader = (headers: any) =>
  headers?.location ??
  headers?.Location ??
  headers?.get?.('location') ??
  headers?.get?.('Location');

export class SharePointClient {
  private http: ReturnType<typeof createAxios>;
  private sharepointToken?: string;

  constructor(options: string | SharePointClientOptions) {
    let graphToken = typeof options === 'string' ? options : options.graphToken;
    this.sharepointToken =
      typeof options === 'string' ? undefined : options.sharepointToken?.trim();
    this.http = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${graphToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  private sharepointHttp(siteWebUrl: string) {
    if (!this.sharepointToken) {
      throw createApiServiceError(
        'SharePoint REST access token is missing. Reconnect SharePoint auth so site user lookups can use the SharePoint REST API.',
        { reason: 'sharepoint_rest_token_missing' }
      );
    }

    return createAuthenticatedAxios({
      baseURL: siteWebUrl.replace(/\/+$/, ''),
      authHeader: { value: `Bearer ${this.sharepointToken}` },
      headers: {
        Accept: 'application/json;odata=nometadata'
      },
      errorAdapter: error => sharePointRestApiError(error)
    });
  }

  // ─── Sites ──────────────────────────────────────────────────────

  async getSite(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}`);
    return response.data as any;
  }

  async getSiteByHostnameAndPath(hostname: string, path?: string) {
    let url = path ? `/sites/${hostname}:/${path}` : `/sites/${hostname}`;
    let response = await this.http.get(url);
    return response.data as any;
  }

  async searchSites(query: string) {
    let response = await this.http.get('/sites', {
      params: { search: query }
    });
    return response.data as any;
  }

  async getRootSite() {
    let response = await this.http.get('/sites/root');
    return response.data as any;
  }

  async listSubsites(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/sites`);
    return response.data as any;
  }

  async getSiteUserByEmail(siteWebUrl: string, email: string) {
    let normalizedEmail = normalizeSharePointSiteUserEmail(email);
    let encodedEmail = encodeURIComponent(escapeODataString(normalizedEmail));
    let data = await requestAxiosData<SharePointRestResponse>(
      'get SharePoint site user by email',
      () =>
        this.sharepointHttp(siteWebUrl).get(
          `/_api/web/siteusers/GetByEmail('${encodedEmail}')`
        ),
      error => sharePointRestApiError(error, 'get SharePoint site user by email')
    );

    return mapSharePointSiteUser(data);
  }

  // ─── Drives (Document Libraries) ───────────────────────────────

  async listDrives(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/drives`);
    return response.data as any;
  }

  async getDrive(driveId: string) {
    let response = await this.http.get(`/drives/${driveId}`);
    return response.data as any;
  }

  async getDefaultDrive(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/drive`);
    return response.data as any;
  }

  // ─── Drive Items (Files & Folders) ─────────────────────────────

  async listDriveItems(driveId: string, folderId?: string) {
    let path = folderId
      ? `/drives/${driveId}/items/${folderId}/children`
      : `/drives/${driveId}/root/children`;
    let response = await this.http.get(path);
    return response.data as any;
  }

  async getDriveItem(driveId: string, itemId: string) {
    let response = await this.http.get(`/drives/${driveId}/items/${itemId}`);
    return response.data as any;
  }

  async getDriveItemByPath(driveId: string, itemPath: string) {
    let normalizedPath = trimSlashes(itemPath);
    let response = await this.http.get(
      normalizedPath ? `/drives/${driveId}/root:/${normalizedPath}` : `/drives/${driveId}/root`
    );
    return response.data as any;
  }

  async createFolder(driveId: string, parentId: string, name: string) {
    let path =
      parentId === 'root'
        ? `/drives/${driveId}/root/children`
        : `/drives/${driveId}/items/${parentId}/children`;
    let response = await this.http.post(path, {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    });
    return response.data as any;
  }

  async uploadSmallFile(
    driveId: string,
    parentPath: string,
    fileName: string,
    content: string
  ) {
    let response = await this.http.put(
      buildRootUploadPath(driveId, parentPath, fileName),
      content,
      {
        headers: { 'Content-Type': 'application/octet-stream' }
      }
    );
    return response.data as any;
  }

  async uploadSmallFileToFolder(
    driveId: string,
    folderId: string,
    fileName: string,
    content: string
  ) {
    let response = await this.http.put(
      `/drives/${driveId}/items/${folderId}:/${fileName}:/content`,
      content,
      {
        headers: { 'Content-Type': 'application/octet-stream' }
      }
    );
    return response.data as any;
  }

  async getFileContent(driveId: string, itemId: string) {
    let response = await this.http.get(`/drives/${driveId}/items/${itemId}/content`, {
      responseType: 'text'
    });
    return response.data as string;
  }

  async getFileDownloadUrl(driveId: string, itemId: string) {
    let response = await this.http.get(`/drives/${driveId}/items/${itemId}`);
    let data = response.data as any;
    return data['@microsoft.graph.downloadUrl'] as string;
  }

  async deleteDriveItem(driveId: string, itemId: string) {
    await this.http.delete(`/drives/${driveId}/items/${itemId}`);
  }

  async moveDriveItem(driveId: string, itemId: string, newParentId: string, newName?: string) {
    let body: any = {
      parentReference: { id: newParentId }
    };
    if (newName) {
      body.name = newName;
    }
    let response = await this.http.patch(`/drives/${driveId}/items/${itemId}`, body);
    return response.data as any;
  }

  async copyDriveItem(
    driveId: string,
    itemId: string,
    newParentDriveId: string,
    newParentId: string,
    newName?: string
  ) {
    let body: any = {
      parentReference: {
        driveId: newParentDriveId,
        id: newParentId
      }
    };
    if (newName) {
      body.name = newName;
    }
    let response = await this.http.post(`/drives/${driveId}/items/${itemId}/copy`, body);
    return {
      copyMonitorUrl: getLocationHeader(response.headers)
    };
  }

  async renameDriveItem(driveId: string, itemId: string, newName: string) {
    let response = await this.http.patch(`/drives/${driveId}/items/${itemId}`, {
      name: newName
    });
    return response.data as any;
  }

  async listDriveItemVersions(driveId: string, itemId: string) {
    let response = await this.http.get(`/drives/${driveId}/items/${itemId}/versions`);
    return response.data as any;
  }

  async searchDriveItems(driveId: string, query: string) {
    let response = await this.http.get(
      `/drives/${driveId}/root/search(q='${encodeURIComponent(query)}')`
    );
    return response.data as any;
  }

  // ─── Lists ──────────────────────────────────────────────────────

  async listLists(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/lists`);
    return response.data as any;
  }

  async getList(siteId: string, listId: string) {
    let response = await this.http.get(`/sites/${siteId}/lists/${listId}`, {
      params: { expand: 'columns' }
    });
    return response.data as any;
  }

  async createList(
    siteId: string,
    displayName: string,
    template: string,
    columns?: Array<{ name: string; type: string; description?: string }>
  ) {
    let body: any = {
      displayName,
      list: { template }
    };
    if (columns && columns.length > 0) {
      body.columns = columns.map(col => {
        let colDef: any = {
          name: col.name,
          description: col.description
        };
        switch (col.type) {
          case 'text':
            colDef.text = {};
            break;
          case 'number':
            colDef.number = {};
            break;
          case 'boolean':
            colDef.boolean = {};
            break;
          case 'dateTime':
            colDef.dateTime = {};
            break;
          case 'choice':
            colDef.choice = {};
            break;
          case 'currency':
            colDef.currency = {};
            break;
          default:
            colDef.text = {};
        }
        return colDef;
      });
    }
    let response = await this.http.post(`/sites/${siteId}/lists`, body);
    return response.data as any;
  }

  async updateList(
    siteId: string,
    listId: string,
    updates: { displayName?: string; description?: string }
  ) {
    let response = await this.http.patch(`/sites/${siteId}/lists/${listId}`, updates);
    return response.data as any;
  }

  async deleteList(siteId: string, listId: string) {
    await this.http.delete(`/sites/${siteId}/lists/${listId}`);
  }

  // ─── List Items ─────────────────────────────────────────────────

  async listListItems(
    siteId: string,
    listId: string,
    params?: {
      expand?: string;
      top?: number;
      filter?: string;
      orderby?: string;
      skipToken?: string;
      allowUnindexedQuery?: boolean;
    }
  ) {
    let headers: Record<string, string> = {};
    if (params?.allowUnindexedQuery) {
      headers.Prefer = 'HonorNonIndexedQueriesWarningMayFailRandomly';
    }

    if (params?.skipToken) {
      let response = await this.http.get(params.skipToken, { headers });
      return response.data as any;
    }

    let queryParams: any = {};
    if (params?.expand) queryParams.$expand = params.expand;
    if (params?.top) queryParams.$top = params.top;
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderby) queryParams.$orderby = params.orderby;

    let response = await this.http.get(`/sites/${siteId}/lists/${listId}/items`, {
      params: queryParams,
      headers
    });
    return response.data as any;
  }

  async getListItem(siteId: string, listId: string, itemId: string) {
    let response = await this.http.get(`/sites/${siteId}/lists/${listId}/items/${itemId}`, {
      params: { expand: 'fields' }
    });
    return response.data as any;
  }

  async createListItem(siteId: string, listId: string, fields: Record<string, any>) {
    let response = await this.http.post(`/sites/${siteId}/lists/${listId}/items`, {
      fields
    });
    return response.data as any;
  }

  async updateListItem(
    siteId: string,
    listId: string,
    itemId: string,
    fields: Record<string, any>
  ) {
    let response = await this.http.patch(
      `/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
      fields
    );
    return response.data as any;
  }

  async deleteListItem(siteId: string, listId: string, itemId: string) {
    await this.http.delete(`/sites/${siteId}/lists/${listId}/items/${itemId}`);
  }

  // ─── List Columns ───────────────────────────────────────────────

  async listColumns(siteId: string, listId: string) {
    let response = await this.http.get(`/sites/${siteId}/lists/${listId}/columns`);
    return response.data as any;
  }

  async createColumn(
    siteId: string,
    listId: string,
    column: {
      name: string;
      description?: string;
      type: string;
      required?: boolean;
      choices?: string[];
    }
  ) {
    let body: any = {
      name: column.name,
      description: column.description,
      required: column.required
    };

    switch (column.type) {
      case 'text':
        body.text = {};
        break;
      case 'number':
        body.number = {};
        break;
      case 'boolean':
        body.boolean = {};
        break;
      case 'dateTime':
        body.dateTime = { format: 'dateOnly' };
        break;
      case 'choice':
        body.choice = { choices: column.choices || [] };
        break;
      case 'currency':
        body.currency = {};
        break;
      case 'personOrGroup':
        body.personOrGroup = {};
        break;
      default:
        body.text = {};
    }

    let response = await this.http.post(`/sites/${siteId}/lists/${listId}/columns`, body);
    return response.data as any;
  }

  async deleteColumn(siteId: string, listId: string, columnId: string) {
    await this.http.delete(`/sites/${siteId}/lists/${listId}/columns/${columnId}`);
  }

  async updateColumn(
    siteId: string,
    listId: string,
    columnId: string,
    updates: { description?: string; required?: boolean }
  ) {
    let response = await this.http.patch(
      `/sites/${siteId}/lists/${listId}/columns/${columnId}`,
      updates
    );
    return response.data as any;
  }

  // ─── Permissions ────────────────────────────────────────────────

  async listSitePermissions(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/permissions`);
    return response.data as any;
  }

  async getDriveItemPermissions(driveId: string, itemId: string) {
    let response = await this.http.get(`/drives/${driveId}/items/${itemId}/permissions`);
    return response.data as any;
  }

  async createSharingLink(
    driveId: string,
    itemId: string,
    type: string,
    scope: string,
    expirationDateTime?: string,
    password?: string
  ) {
    let body: any = { type, scope };
    if (expirationDateTime) body.expirationDateTime = expirationDateTime;
    if (password) body.password = password;

    let response = await this.http.post(`/drives/${driveId}/items/${itemId}/createLink`, body);
    return response.data as any;
  }

  async inviteToItem(
    driveId: string,
    itemId: string,
    recipients: Array<{ email: string }>,
    roles: string[],
    message?: string,
    requireSignIn?: boolean,
    sendInvitation?: boolean
  ) {
    let body: any = {
      recipients: recipients.map(r => ({ email: r.email })),
      roles,
      requireSignIn: requireSignIn ?? true,
      sendInvitation: sendInvitation ?? true
    };
    if (message) body.message = message;

    let response = await this.http.post(`/drives/${driveId}/items/${itemId}/invite`, body);
    return response.data as any;
  }

  async deletePermission(driveId: string, itemId: string, permissionId: string) {
    await this.http.delete(`/drives/${driveId}/items/${itemId}/permissions/${permissionId}`);
  }

  // ─── Content Types ──────────────────────────────────────────────

  async listContentTypes(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/contentTypes`);
    return response.data as any;
  }

  async getContentType(siteId: string, contentTypeId: string) {
    let response = await this.http.get(`/sites/${siteId}/contentTypes/${contentTypeId}`);
    return response.data as any;
  }

  async listSiteColumns(siteId: string) {
    let response = await this.http.get(`/sites/${siteId}/columns`);
    return response.data as any;
  }

  // ─── Search ─────────────────────────────────────────────────────

  async search(query: string, entityTypes: string[], from?: number, size?: number) {
    let body: any = {
      requests: [
        {
          entityTypes,
          query: { queryString: query },
          from: from || 0,
          size: size || 25
        }
      ]
    };

    let response = await this.http.post('/search/query', body);
    return response.data as any;
  }

  // ─── Subscriptions (Graph Change Notifications) ─────────────────

  async createSubscription(
    resource: string,
    changeType: string,
    notificationUrl: string,
    expirationDateTime: string,
    clientState?: string
  ) {
    let body: any = {
      changeType,
      notificationUrl,
      resource,
      expirationDateTime
    };
    if (clientState) body.clientState = clientState;

    let response = await this.http.post('/subscriptions', body);
    return response.data as any;
  }

  async updateSubscription(subscriptionId: string, expirationDateTime: string) {
    let response = await this.http.patch(`/subscriptions/${subscriptionId}`, {
      expirationDateTime
    });
    return response.data as any;
  }

  async deleteSubscription(subscriptionId: string) {
    await this.http.delete(`/subscriptions/${subscriptionId}`);
  }

  async getSubscription(subscriptionId: string) {
    let response = await this.http.get(`/subscriptions/${subscriptionId}`);
    return response.data as any;
  }

  // ─── Delta Queries ──────────────────────────────────────────────

  async getDelta(driveId: string, deltaToken?: string) {
    let url = deltaToken ? deltaToken : `/drives/${driveId}/root/delta`;
    let response = await this.http.get(url);
    return response.data as any;
  }

  async getListItemsDelta(siteId: string, listId: string, deltaToken?: string) {
    let url = deltaToken ? deltaToken : `/sites/${siteId}/lists/${listId}/items/delta`;
    let response = await this.http.get(url);
    return response.data as any;
  }
}
