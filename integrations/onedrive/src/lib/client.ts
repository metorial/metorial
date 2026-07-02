import { buildMicrosoftGraphUploadBody } from '@slates/oauth-microsoft';
import { createAxios } from 'slates';

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: { user?: { displayName?: string; id?: string; email?: string } };
  lastModifiedBy?: { user?: { displayName?: string; id?: string; email?: string } };
  parentReference?: {
    driveId?: string;
    driveType?: string;
    id?: string;
    path?: string;
  };
  folder?: { childCount: number };
  file?: { mimeType: string; hashes?: Record<string, string> };
  image?: Record<string, any>;
  audio?: Record<string, any>;
  video?: Record<string, any>;
  photo?: Record<string, any>;
  [key: string]: any;
}

export interface Drive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
  owner?: {
    user?: { displayName?: string; id?: string; email?: string };
    group?: { displayName?: string; id?: string };
  };
  quota?: {
    total: number;
    used: number;
    remaining: number;
    deleted: number;
    state: string;
  };
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface Permission {
  id: string;
  roles: string[];
  grantedTo?: { user?: { displayName?: string; id?: string; email?: string } };
  grantedToIdentities?: Array<{
    user?: { displayName?: string; id?: string; email?: string };
  }>;
  grantedToV2?: Record<string, any>;
  link?: { type: string; scope: string; webUrl: string };
  invitation?: { email?: string };
  shareId?: string;
  expirationDateTime?: string;
}

export interface SharingLink {
  id: string;
  roles: string[];
  link: { type: string; scope: string; webUrl: string };
  expirationDateTime?: string;
}

export interface DeltaResponse {
  value: DriveItem[];
  deltaLink?: string;
  nextLink?: string;
}

export interface SubscriptionResponse {
  id: string;
  resource: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
}

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // --- Drive operations ---

  async listDrives(): Promise<Drive[]> {
    let response = await this.api.get('/me/drives');
    return response.data.value;
  }

  async getDrive(driveId?: string): Promise<Drive> {
    let path = driveId ? `/drives/${driveId}` : '/me/drive';
    let response = await this.api.get(path);
    return response.data;
  }

  // --- Item operations ---

  async listChildren(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
    top?: number;
    skipToken?: string;
    orderBy?: string;
    filter?: string;
    select?: string[];
  }): Promise<{ items: DriveItem[]; nextLink?: string }> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/children');

    let params: Record<string, string> = {};
    if (opts.top) params.$top = String(opts.top);
    if (opts.skipToken) params.$skiptoken = opts.skipToken;
    if (opts.orderBy) params.$orderby = opts.orderBy;
    if (opts.filter) params.$filter = opts.filter;
    if (opts.select?.length) params.$select = opts.select.join(',');

    let response = await this.api.get(path, { params });
    return {
      items: response.data.value,
      nextLink: response.data['@odata.nextLink']
    };
  }

  async getItem(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
    select?: string[];
  }): Promise<DriveItem> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath);

    let params: Record<string, string> = {};
    if (opts.select?.length) params.$select = opts.select.join(',');

    let response = await this.api.get(path, { params });
    return response.data;
  }

  async getItemContent(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
    format?: string;
  }): Promise<{ downloadUrl: string }> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/content');

    let params: Record<string, string> = {};
    if (opts.format) params.format = opts.format;

    let response = await this.api.get(path, {
      params,
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });

    let downloadUrl = response.headers.location || response.request?.responseURL || '';
    return { downloadUrl };
  }

  async uploadSmallFile(opts: {
    driveId?: string;
    parentId?: string;
    parentPath?: string;
    fileName: string;
    content: string;
    contentType?: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
  }): Promise<DriveItem> {
    let basePath: string;
    if (opts.parentPath) {
      let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
      basePath = `${drivePart}/root:${opts.parentPath.startsWith('/') ? '' : '/'}${opts.parentPath}/${opts.fileName}:/content`;
    } else if (opts.parentId) {
      let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
      basePath = `${drivePart}/items/${opts.parentId}:/${opts.fileName}:/content`;
    } else {
      let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
      basePath = `${drivePart}/root:/${opts.fileName}:/content`;
    }

    let params: Record<string, string> = {};
    if (opts.conflictBehavior)
      params['@microsoft.graph.conflictBehavior'] = opts.conflictBehavior;

    let response = await this.api.put(
      basePath,
      buildMicrosoftGraphUploadBody(opts.fileName, opts.content, opts.contentType),
      {
        params,
        headers: {
          'Content-Type': opts.contentType || 'application/octet-stream'
        }
      }
    );

    return response.data;
  }

  async createUploadSession(opts: {
    driveId?: string;
    parentId?: string;
    parentPath?: string;
    fileName: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
  }): Promise<{ uploadUrl: string; expirationDateTime: string }> {
    let basePath: string;
    if (opts.parentPath) {
      let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
      basePath = `${drivePart}/root:${opts.parentPath.startsWith('/') ? '' : '/'}${opts.parentPath}/${opts.fileName}:/createUploadSession`;
    } else if (opts.parentId) {
      let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
      basePath = `${drivePart}/items/${opts.parentId}:/${opts.fileName}:/createUploadSession`;
    } else {
      let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
      basePath = `${drivePart}/root:/${opts.fileName}:/createUploadSession`;
    }

    let body: Record<string, any> = {};
    if (opts.conflictBehavior) {
      body.item = { '@microsoft.graph.conflictBehavior': opts.conflictBehavior };
    }

    let response = await this.api.post(basePath, body);
    return {
      uploadUrl: response.data.uploadUrl,
      expirationDateTime: response.data.expirationDateTime
    };
  }

  async createFolder(opts: {
    driveId?: string;
    parentId?: string;
    parentPath?: string;
    folderName: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
  }): Promise<DriveItem> {
    let path = this.buildItemPath(opts.driveId, opts.parentId, opts.parentPath, '/children');

    let body: Record<string, any> = {
      name: opts.folderName,
      folder: {}
    };
    if (opts.conflictBehavior) {
      body['@microsoft.graph.conflictBehavior'] = opts.conflictBehavior;
    }

    let response = await this.api.post(path, body);
    return response.data;
  }

  async copyItem(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
    destinationDriveId?: string;
    destinationFolderId: string;
    newName?: string;
  }): Promise<{ monitorUrl: string }> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/copy');

    let body: Record<string, any> = {
      parentReference: {
        id: opts.destinationFolderId
      }
    };
    if (opts.destinationDriveId) {
      body.parentReference.driveId = opts.destinationDriveId;
    }
    if (opts.newName) {
      body.name = opts.newName;
    }

    let response = await this.api.post(path, body);
    return { monitorUrl: response.headers.location || '' };
  }

  async moveItem(opts: {
    driveId?: string;
    itemId: string;
    destinationFolderId?: string;
    destinationDriveId?: string;
    newName?: string;
  }): Promise<DriveItem> {
    let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
    let path = `${drivePart}/items/${opts.itemId}`;

    let body: Record<string, any> = {};
    if (opts.destinationFolderId) {
      body.parentReference = { id: opts.destinationFolderId };
      if (opts.destinationDriveId) {
        body.parentReference.driveId = opts.destinationDriveId;
      }
    }
    if (opts.newName) {
      body.name = opts.newName;
    }

    let response = await this.api.patch(path, body);
    return response.data;
  }

  async deleteItem(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
  }): Promise<void> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath);
    await this.api.delete(path);
  }

  // --- Search ---

  async search(opts: {
    driveId?: string;
    query: string;
    top?: number;
    skipToken?: string;
  }): Promise<{ items: DriveItem[]; nextLink?: string }> {
    let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
    let path = `${drivePart}/root/search(q='${encodeURIComponent(opts.query)}')`;

    let params: Record<string, string> = {};
    if (opts.top) params.$top = String(opts.top);
    if (opts.skipToken) params.$skiptoken = opts.skipToken;

    let response = await this.api.get(path, { params });
    return {
      items: response.data.value,
      nextLink: response.data['@odata.nextLink']
    };
  }

  // --- Sharing & Permissions ---

  async createSharingLink(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
    type: 'view' | 'edit' | 'embed';
    scope?: 'anonymous' | 'organization' | 'users';
    expirationDateTime?: string;
    password?: string;
  }): Promise<SharingLink> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/createLink');

    let body: Record<string, any> = {
      type: opts.type
    };
    if (opts.scope) body.scope = opts.scope;
    if (opts.expirationDateTime) body.expirationDateTime = opts.expirationDateTime;
    if (opts.password) body.password = opts.password;

    let response = await this.api.post(path, body);
    return response.data;
  }

  async listPermissions(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
  }): Promise<Permission[]> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/permissions');
    let response = await this.api.get(path);
    return response.data.value;
  }

  async addPermission(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
    recipients: Array<{ email: string }>;
    roles: string[];
    message?: string;
    requireSignIn?: boolean;
    sendInvitation?: boolean;
  }): Promise<Permission[]> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/invite');

    let body: Record<string, any> = {
      recipients: recipients(opts.recipients),
      roles: opts.roles,
      requireSignIn: opts.requireSignIn !== false,
      sendInvitation: opts.sendInvitation !== false
    };
    if (opts.message) body.message = opts.message;

    let response = await this.api.post(path, body);
    return response.data.value;
  }

  async removePermission(opts: {
    driveId?: string;
    itemId: string;
    permissionId: string;
  }): Promise<void> {
    let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
    let path = `${drivePart}/items/${opts.itemId}/permissions/${opts.permissionId}`;
    await this.api.delete(path);
  }

  // --- Delta (Change Tracking) ---

  async getDelta(opts: {
    driveId?: string;
    deltaLink?: string;
    top?: number;
  }): Promise<DeltaResponse> {
    if (opts.deltaLink) {
      let response = await this.api.get(opts.deltaLink);
      return {
        value: response.data.value,
        deltaLink: response.data['@odata.deltaLink'],
        nextLink: response.data['@odata.nextLink']
      };
    }

    let drivePart = opts.driveId ? `/drives/${opts.driveId}` : '/me/drive';
    let path = `${drivePart}/root/delta`;

    let params: Record<string, string> = {};
    if (opts.top) params.$top = String(opts.top);

    let response = await this.api.get(path, { params });
    return {
      value: response.data.value,
      deltaLink: response.data['@odata.deltaLink'],
      nextLink: response.data['@odata.nextLink']
    };
  }

  // --- Subscriptions (Webhooks) ---

  async createSubscription(opts: {
    notificationUrl: string;
    resource: string;
    changeType: string;
    expirationDateTime: string;
    clientState?: string;
    includeSecurityWebhooks?: boolean;
  }): Promise<SubscriptionResponse> {
    let headers: Record<string, string> = {};
    if (opts.includeSecurityWebhooks) {
      headers.Prefer = 'includesecuritywebhooks';
    }

    let response = await this.api.post(
      '/subscriptions',
      {
        changeType: opts.changeType,
        notificationUrl: opts.notificationUrl,
        resource: opts.resource,
        expirationDateTime: opts.expirationDateTime,
        clientState: opts.clientState
      },
      { headers }
    );

    return response.data;
  }

  async updateSubscription(
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<SubscriptionResponse> {
    let response = await this.api.patch(`/subscriptions/${subscriptionId}`, {
      expirationDateTime
    });
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.api.delete(`/subscriptions/${subscriptionId}`);
  }

  // --- Thumbnails ---

  async getThumbnails(opts: { driveId?: string; itemId?: string; itemPath?: string }): Promise<
    Array<{
      id: string;
      small?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      large?: { url: string; width: number; height: number };
    }>
  > {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/thumbnails');
    let response = await this.api.get(path);
    return response.data.value;
  }

  // --- Preview ---

  async getPreview(opts: {
    driveId?: string;
    itemId?: string;
    itemPath?: string;
  }): Promise<{ getUrl: string; postUrl: string; postParameters: string }> {
    let path = this.buildItemPath(opts.driveId, opts.itemId, opts.itemPath, '/preview');
    let response = await this.api.post(path, {});
    return response.data;
  }

  // --- Helpers ---

  private buildItemPath(
    driveId?: string,
    itemId?: string,
    itemPath?: string,
    suffix: string = ''
  ): string {
    let drivePart = driveId ? `/drives/${driveId}` : '/me/drive';

    if (itemPath) {
      let normalizedPath = itemPath.startsWith('/') ? itemPath : `/${itemPath}`;
      if (suffix === '/children') {
        return `${drivePart}/root:${normalizedPath}:/children`;
      }
      if (suffix) {
        return `${drivePart}/root:${normalizedPath}:${suffix}`;
      }
      return `${drivePart}/root:${normalizedPath}`;
    }

    if (itemId) {
      return `${drivePart}/items/${itemId}${suffix}`;
    }

    return `${drivePart}/root${suffix}`;
  }
}

// Helper function
let recipients = (list: Array<{ email: string }>) =>
  list.map(r => ({ '@odata.type': 'microsoft.graph.driveRecipient', email: r.email }));
