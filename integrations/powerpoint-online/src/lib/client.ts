import { createAxios } from 'slates';
import type {
  DriveItem,
  DriveItemVersion,
  Permission,
  Subscription,
  ThumbnailSet
} from './types';

export class GraphClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ─── Drive Item Resolution ───────────────────────────────────────

  private buildItemPath(
    itemId?: string,
    itemPath?: string,
    driveId?: string,
    siteId?: string
  ): string {
    let base: string;
    if (siteId) {
      base = `/sites/${siteId}/drive`;
    } else if (driveId) {
      base = `/drives/${driveId}`;
    } else {
      base = '/me/drive';
    }

    if (itemId) {
      return `${base}/items/${itemId}`;
    } else if (itemPath) {
      let normalizedPath = itemPath.startsWith('/') ? itemPath : `/${itemPath}`;
      return `${base}/root:${normalizedPath}:`;
    } else {
      return `${base}/root`;
    }
  }

  // ─── File Operations ─────────────────────────────────────────────

  async getItem(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
  }): Promise<DriveItem> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let response = await this.axios.get(path);
    return response.data;
  }

  async listChildren(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    top?: number;
    skipToken?: string;
  }): Promise<{ items: DriveItem[]; nextLink?: string }> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let queryParams: Record<string, string> = {};
    if (params.top) queryParams.$top = String(params.top);
    if (params.skipToken) queryParams.$skiptoken = params.skipToken;

    let response = await this.axios.get(`${path}/children`, { params: queryParams });
    return {
      items: response.data.value,
      nextLink: response.data['@odata.nextLink']
    };
  }

  async uploadSmallFile(params: {
    fileName: string;
    content: string;
    contentType?: string;
    parentId?: string;
    parentPath?: string;
    driveId?: string;
    siteId?: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
  }): Promise<DriveItem> {
    let base: string;
    if (params.siteId) {
      base = `/sites/${params.siteId}/drive`;
    } else if (params.driveId) {
      base = `/drives/${params.driveId}`;
    } else {
      base = '/me/drive';
    }

    let uploadPath: string;
    if (params.parentId) {
      uploadPath = `${base}/items/${params.parentId}:/${params.fileName}:/content`;
    } else if (params.parentPath) {
      let normalizedParent = params.parentPath.startsWith('/')
        ? params.parentPath
        : `/${params.parentPath}`;
      let fullPath = normalizedParent.endsWith('/')
        ? `${normalizedParent}${params.fileName}`
        : `${normalizedParent}/${params.fileName}`;
      uploadPath = `${base}/root:${fullPath}:/content`;
    } else {
      uploadPath = `${base}/root:/${params.fileName}:/content`;
    }

    let queryParams: Record<string, string> = {};
    if (params.conflictBehavior) {
      queryParams['@microsoft.graph.conflictBehavior'] = params.conflictBehavior;
    }

    // Decode base64 content to binary
    let binaryString = atob(params.content);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let response = await this.axios.put(uploadPath, bytes, {
      params: queryParams,
      headers: {
        'Content-Type':
          params.contentType ||
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }
    });

    return response.data;
  }

  async createUploadSession(params: {
    fileName: string;
    parentId?: string;
    parentPath?: string;
    driveId?: string;
    siteId?: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
    fileSize: number;
  }): Promise<{ uploadUrl: string; expirationDateTime: string }> {
    let base: string;
    if (params.siteId) {
      base = `/sites/${params.siteId}/drive`;
    } else if (params.driveId) {
      base = `/drives/${params.driveId}`;
    } else {
      base = '/me/drive';
    }

    let uploadPath: string;
    if (params.parentId) {
      uploadPath = `${base}/items/${params.parentId}:/${params.fileName}:/createUploadSession`;
    } else if (params.parentPath) {
      let normalizedParent = params.parentPath.startsWith('/')
        ? params.parentPath
        : `/${params.parentPath}`;
      let fullPath = normalizedParent.endsWith('/')
        ? `${normalizedParent}${params.fileName}`
        : `${normalizedParent}/${params.fileName}`;
      uploadPath = `${base}/root:${fullPath}:/createUploadSession`;
    } else {
      uploadPath = `${base}/root:/${params.fileName}:/createUploadSession`;
    }

    let body: Record<string, any> = {
      item: {
        '@microsoft.graph.conflictBehavior': params.conflictBehavior || 'rename',
        name: params.fileName
      }
    };

    let response = await this.axios.post(uploadPath, body);
    return {
      uploadUrl: response.data.uploadUrl,
      expirationDateTime: response.data.expirationDateTime
    };
  }

  async getDownloadUrl(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    format?: string;
  }): Promise<string> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let contentPath = `${path}/content`;
    let queryParams: Record<string, string> = {};
    if (params.format) {
      queryParams.format = params.format;
    }

    let response = await this.axios.get(contentPath, {
      params: queryParams,
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });

    // Graph API returns a 302 redirect with the download URL
    if (response.status === 302 && response.headers?.location) {
      return response.headers.location;
    }

    // If the response contains @microsoft.graph.downloadUrl
    if (response.data?.['@microsoft.graph.downloadUrl']) {
      return response.data['@microsoft.graph.downloadUrl'];
    }

    // If we get the item directly, it might have the download URL
    let itemResponse = await this.axios.get(path);
    if (itemResponse.data?.['@microsoft.graph.downloadUrl']) {
      return itemResponse.data['@microsoft.graph.downloadUrl'];
    }

    throw new Error('Unable to obtain download URL');
  }

  async deleteItem(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
  }): Promise<void> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    await this.axios.delete(path);
  }

  async moveItem(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    newParentId?: string;
    newParentDriveId?: string;
    newName?: string;
  }): Promise<DriveItem> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let body: Record<string, any> = {};

    if (params.newParentId) {
      let parentRef: Record<string, string> = { id: params.newParentId };
      if (params.newParentDriveId) {
        parentRef.driveId = params.newParentDriveId;
      }
      body.parentReference = parentRef;
    }

    if (params.newName) {
      body.name = params.newName;
    }

    let response = await this.axios.patch(path, body);
    return response.data;
  }

  async copyItem(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    newParentId?: string;
    newParentDriveId?: string;
    newName?: string;
  }): Promise<string> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let body: Record<string, any> = {};

    if (params.newParentId) {
      let parentRef: Record<string, string> = { id: params.newParentId };
      if (params.newParentDriveId) {
        parentRef.driveId = params.newParentDriveId;
      }
      body.parentReference = parentRef;
    }

    if (params.newName) {
      body.name = params.newName;
    }

    let response = await this.axios.post(`${path}/copy`, body, {
      validateStatus: (status: number) => status >= 200 && status < 400
    });

    // Copy returns a 202 with a monitor URL in the Location header
    return response.headers?.location || '';
  }

  async updateItem(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    name?: string;
    description?: string;
  }): Promise<DriveItem> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let body: Record<string, any> = {};

    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;

    let response = await this.axios.patch(path, body);
    return response.data;
  }

  // ─── Sharing & Permissions ───────────────────────────────────────

  async createSharingLink(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    linkType: 'view' | 'edit' | 'embed';
    scope?: 'anonymous' | 'organization' | 'users';
    password?: string;
    expirationDateTime?: string;
  }): Promise<Permission> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let body: Record<string, any> = {
      type: params.linkType
    };

    if (params.scope) body.scope = params.scope;
    if (params.password) body.password = params.password;
    if (params.expirationDateTime) body.expirationDateTime = params.expirationDateTime;

    let response = await this.axios.post(`${path}/createLink`, body);
    return response.data;
  }

  async inviteUsers(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
    recipients: { email: string }[];
    roles: string[];
    message?: string;
    requireSignIn?: boolean;
    sendInvitation?: boolean;
  }): Promise<Permission[]> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let body: Record<string, any> = {
      recipients: params.recipients,
      roles: params.roles,
      requireSignIn: params.requireSignIn ?? true,
      sendInvitation: params.sendInvitation ?? true
    };

    if (params.message) body.message = params.message;

    let response = await this.axios.post(`${path}/invite`, body);
    return response.data.value;
  }

  async listPermissions(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
  }): Promise<Permission[]> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let response = await this.axios.get(`${path}/permissions`);
    return response.data.value;
  }

  async deletePermission(params: {
    itemId: string;
    permissionId: string;
    driveId?: string;
    siteId?: string;
  }): Promise<void> {
    let path = this.buildItemPath(params.itemId, undefined, params.driveId, params.siteId);
    await this.axios.delete(`${path}/permissions/${params.permissionId}`);
  }

  // ─── Versions ────────────────────────────────────────────────────

  async listVersions(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
  }): Promise<DriveItemVersion[]> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let response = await this.axios.get(`${path}/versions`);
    return response.data.value;
  }

  async restoreVersion(params: {
    itemId: string;
    versionId: string;
    driveId?: string;
    siteId?: string;
  }): Promise<void> {
    let path = this.buildItemPath(params.itemId, undefined, params.driveId, params.siteId);
    await this.axios.post(`${path}/versions/${params.versionId}/restoreVersion`);
  }

  // ─── Thumbnails & Previews ──────────────────────────────────────

  async getThumbnails(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
  }): Promise<ThumbnailSet[]> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let response = await this.axios.get(`${path}/thumbnails`);
    return response.data.value;
  }

  async getPreviewUrl(params: {
    itemId?: string;
    itemPath?: string;
    driveId?: string;
    siteId?: string;
  }): Promise<{ getUrl: string; postUrl: string }> {
    let path = this.buildItemPath(
      params.itemId,
      params.itemPath,
      params.driveId,
      params.siteId
    );
    let response = await this.axios.post(`${path}/preview`, {});
    return {
      getUrl: response.data.getUrl || '',
      postUrl: response.data.postUrl || ''
    };
  }

  // ─── Search ──────────────────────────────────────────────────────

  async searchFiles(params: {
    query: string;
    driveId?: string;
    siteId?: string;
    top?: number;
    skipToken?: string;
  }): Promise<{ items: DriveItem[]; nextLink?: string }> {
    let base: string;
    if (params.siteId) {
      base = `/sites/${params.siteId}/drive`;
    } else if (params.driveId) {
      base = `/drives/${params.driveId}`;
    } else {
      base = '/me/drive';
    }

    let queryString: Record<string, string> = { q: params.query };
    if (params.top) queryString.$top = String(params.top);
    if (params.skipToken) queryString.$skiptoken = params.skipToken;

    let response = await this.axios.get(
      `${base}/root/search(q='${encodeURIComponent(params.query)}')`,
      {
        params: params.top ? { $top: String(params.top) } : undefined
      }
    );

    return {
      items: response.data.value,
      nextLink: response.data['@odata.nextLink']
    };
  }

  // ─── Subscriptions (Webhooks) ────────────────────────────────────

  async createSubscription(params: {
    resource: string;
    changeType: string;
    notificationUrl: string;
    expirationDateTime: string;
    clientState?: string;
  }): Promise<Subscription> {
    let body: Record<string, any> = {
      changeType: params.changeType,
      notificationUrl: params.notificationUrl,
      resource: params.resource,
      expirationDateTime: params.expirationDateTime
    };

    if (params.clientState) {
      body.clientState = params.clientState;
    }

    let response = await this.axios.post('/subscriptions', body);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<Subscription> {
    let response = await this.axios.patch(`/subscriptions/${subscriptionId}`, {
      expirationDateTime
    });
    return response.data;
  }

  // ─── Delta Queries ───────────────────────────────────────────────

  async getDelta(params: {
    driveId?: string;
    siteId?: string;
    itemId?: string;
    deltaLink?: string;
    token?: string;
  }): Promise<{ items: DriveItem[]; deltaLink?: string; nextLink?: string }> {
    let url: string;

    if (params.deltaLink) {
      // Use the full delta link from a previous response
      let response = await this.axios.get(params.deltaLink);
      return {
        items: response.data.value,
        deltaLink: response.data['@odata.deltaLink'],
        nextLink: response.data['@odata.nextLink']
      };
    }

    let base: string;
    if (params.siteId) {
      base = `/sites/${params.siteId}/drive`;
    } else if (params.driveId) {
      base = `/drives/${params.driveId}`;
    } else {
      base = '/me/drive';
    }

    if (params.itemId) {
      url = `${base}/items/${params.itemId}/delta`;
    } else {
      url = `${base}/root/delta`;
    }

    let queryParams: Record<string, string> = {};
    if (params.token) {
      queryParams.token = params.token;
    }

    let response = await this.axios.get(url, { params: queryParams });
    return {
      items: response.data.value,
      deltaLink: response.data['@odata.deltaLink'],
      nextLink: response.data['@odata.nextLink']
    };
  }

  // ─── Folder Operations ──────────────────────────────────────────

  async createFolder(params: {
    folderName: string;
    parentId?: string;
    parentPath?: string;
    driveId?: string;
    siteId?: string;
    conflictBehavior?: 'rename' | 'replace' | 'fail';
  }): Promise<DriveItem> {
    let path = this.buildItemPath(
      params.parentId,
      params.parentPath,
      params.driveId,
      params.siteId
    );

    let body: Record<string, any> = {
      name: params.folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': params.conflictBehavior || 'rename'
    };

    let response = await this.axios.post(`${path}/children`, body);
    return response.data;
  }
}
