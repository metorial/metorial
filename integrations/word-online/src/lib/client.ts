import { buildMicrosoftGraphUploadBody } from '@slates/oauth-microsoft';
import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  driveId?: string;
  siteId?: string;
}

export interface DriveItem {
  itemId: string;
  name: string;
  mimeType?: string;
  size?: number;
  webUrl?: string;
  createdAt?: string;
  modifiedAt?: string;
  createdBy?: string;
  modifiedBy?: string;
  parentPath?: string;
  parentId?: string;
  isFolder: boolean;
  downloadUrl?: string;
}

export interface DriveItemVersion {
  versionId: string;
  modifiedAt?: string;
  modifiedBy?: string;
  size?: number;
}

export interface Permission {
  permissionId: string;
  roles: string[];
  link?: {
    type: string;
    scope: string;
    webUrl: string;
  };
  grantedTo?: {
    displayName?: string;
    email?: string;
  };
}

export interface Subscription {
  subscriptionId: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState?: string;
}

let mapDriveItem = (item: any): DriveItem => ({
  itemId: item.id,
  name: item.name,
  mimeType: item.file?.mimeType,
  size: item.size,
  webUrl: item.webUrl,
  createdAt: item.createdDateTime,
  modifiedAt: item.lastModifiedDateTime,
  createdBy: item.createdBy?.user?.displayName,
  modifiedBy: item.lastModifiedBy?.user?.displayName,
  parentPath: item.parentReference?.path,
  parentId: item.parentReference?.id,
  isFolder: !!item.folder,
  downloadUrl: item['@microsoft.graph.downloadUrl']
});

export class Client {
  private axios;
  private driveId?: string;
  private siteId?: string;

  constructor(config: ClientConfig) {
    this.driveId = config.driveId;
    this.siteId = config.siteId;
    this.axios = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private get drivePath(): string {
    if (this.driveId) {
      return `/drives/${this.driveId}`;
    }
    if (this.siteId) {
      return `/sites/${this.siteId}/drive`;
    }
    return '/me/drive';
  }

  // === File/Item Operations ===

  async getItem(itemId: string): Promise<DriveItem> {
    let response = await this.axios.get(`${this.drivePath}/items/${itemId}`);
    return mapDriveItem(response.data);
  }

  async getItemByPath(path: string): Promise<DriveItem> {
    let encodedPath = path.startsWith('/') ? path : `/${path}`;
    let response = await this.axios.get(`${this.drivePath}/root:${encodedPath}`);
    return mapDriveItem(response.data);
  }

  async listChildren(folderId?: string): Promise<DriveItem[]> {
    let endpoint = folderId
      ? `${this.drivePath}/items/${folderId}/children`
      : `${this.drivePath}/root/children`;
    let items: DriveItem[] = [];
    let url: string | null = endpoint;

    while (url) {
      let response: any = await this.axios.get(url);
      let data: any = response.data;
      items.push(...(data.value || []).map(mapDriveItem));
      url = data['@odata.nextLink'] || null;
    }

    return items;
  }

  async searchFiles(query: string): Promise<DriveItem[]> {
    let response = await this.axios.get(
      `${this.drivePath}/root/search(q='${encodeURIComponent(query)}')`
    );
    return (response.data.value || []).map(mapDriveItem);
  }

  async uploadSmallFile(
    parentId: string,
    fileName: string,
    content: string,
    contentType: string = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ): Promise<DriveItem> {
    let response = await this.axios.put(
      `${this.drivePath}/items/${parentId}:/${fileName}:/content`,
      buildMicrosoftGraphUploadBody(fileName, content, contentType),
      {
        headers: { 'Content-Type': contentType }
      }
    );
    return mapDriveItem(response.data);
  }

  async uploadSmallFileByPath(
    folderPath: string,
    fileName: string,
    content: string,
    contentType: string = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ): Promise<DriveItem> {
    let path = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    let fullPath = `${path}${fileName}`;
    let encodedPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
    let response = await this.axios.put(
      `${this.drivePath}/root:${encodedPath}:/content`,
      buildMicrosoftGraphUploadBody(fileName, content, contentType),
      {
        headers: { 'Content-Type': contentType }
      }
    );
    return mapDriveItem(response.data);
  }

  async createUploadSession(
    parentId: string,
    fileName: string
  ): Promise<{ uploadUrl: string }> {
    let response = await this.axios.post(
      `${this.drivePath}/items/${parentId}:/${fileName}:/createUploadSession`,
      {
        item: {
          '@microsoft.graph.conflictBehavior': 'rename',
          name: fileName
        }
      }
    );
    return { uploadUrl: response.data.uploadUrl };
  }

  async getDownloadUrl(itemId: string): Promise<string> {
    let response = await this.axios.get(`${this.drivePath}/items/${itemId}`, {
      headers: { Accept: 'application/json' }
    });
    return response.data['@microsoft.graph.downloadUrl'];
  }

  async convertToPdf(itemId: string): Promise<string> {
    let response = await this.axios.get(
      `${this.drivePath}/items/${itemId}/content?format=pdf`,
      { maxRedirects: 0, validateStatus: (status: number) => status >= 200 && status < 400 }
    );
    // The API returns a 302 redirect to the download URL
    if (response.status === 302 || response.headers.location) {
      return response.headers.location;
    }
    // If no redirect, the response itself contains the content
    return response.request?.responseURL || response.data;
  }

  // === File Management ===

  async deleteItem(itemId: string): Promise<void> {
    await this.axios.delete(`${this.drivePath}/items/${itemId}`);
  }

  async renameItem(itemId: string, newName: string): Promise<DriveItem> {
    let response = await this.axios.patch(`${this.drivePath}/items/${itemId}`, {
      name: newName
    });
    return mapDriveItem(response.data);
  }

  async moveItem(itemId: string, newParentId: string, newName?: string): Promise<DriveItem> {
    let body: any = {
      parentReference: { id: newParentId }
    };
    if (newName) {
      body.name = newName;
    }
    let response = await this.axios.patch(`${this.drivePath}/items/${itemId}`, body);
    return mapDriveItem(response.data);
  }

  async copyItem(itemId: string, newParentId: string, newName?: string): Promise<string> {
    let body: any = {
      parentReference: { driveId: this.driveId, id: newParentId }
    };
    if (newName) {
      body.name = newName;
    }
    let response = await this.axios.post(`${this.drivePath}/items/${itemId}/copy`, body);
    // Copy returns a Location header with the monitor URL
    return response.headers.location || response.data?.id || '';
  }

  async createFolder(parentId: string, folderName: string): Promise<DriveItem> {
    let endpoint = parentId
      ? `${this.drivePath}/items/${parentId}/children`
      : `${this.drivePath}/root/children`;
    let response = await this.axios.post(endpoint, {
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    });
    return mapDriveItem(response.data);
  }

  // === Sharing & Permissions ===

  async createSharingLink(
    itemId: string,
    linkType: 'view' | 'edit',
    scope: 'anonymous' | 'organization' = 'anonymous'
  ): Promise<Permission> {
    let response = await this.axios.post(`${this.drivePath}/items/${itemId}/createLink`, {
      type: linkType,
      scope
    });
    let perm = response.data;
    return {
      permissionId: perm.id,
      roles: perm.roles || [],
      link: perm.link
        ? {
            type: perm.link.type,
            scope: perm.link.scope,
            webUrl: perm.link.webUrl
          }
        : undefined
    };
  }

  async inviteUser(
    itemId: string,
    email: string,
    roles: string[],
    message?: string
  ): Promise<Permission[]> {
    let response = await this.axios.post(`${this.drivePath}/items/${itemId}/invite`, {
      recipients: [{ email }],
      roles,
      requireSignIn: true,
      sendInvitation: true,
      message: message || undefined
    });
    return (response.data.value || []).map((perm: any) => ({
      permissionId: perm.id,
      roles: perm.roles || [],
      grantedTo: perm.grantedTo?.user
        ? {
            displayName: perm.grantedTo.user.displayName,
            email: perm.grantedTo.user.email
          }
        : undefined
    }));
  }

  async listPermissions(itemId: string): Promise<Permission[]> {
    let response = await this.axios.get(`${this.drivePath}/items/${itemId}/permissions`);
    return (response.data.value || []).map((perm: any) => ({
      permissionId: perm.id,
      roles: perm.roles || [],
      link: perm.link
        ? {
            type: perm.link.type,
            scope: perm.link.scope,
            webUrl: perm.link.webUrl
          }
        : undefined,
      grantedTo: perm.grantedTo?.user
        ? {
            displayName: perm.grantedTo.user.displayName,
            email: perm.grantedTo.user.email
          }
        : undefined
    }));
  }

  async deletePermission(itemId: string, permissionId: string): Promise<void> {
    await this.axios.delete(`${this.drivePath}/items/${itemId}/permissions/${permissionId}`);
  }

  // === Version History ===

  async listVersions(itemId: string): Promise<DriveItemVersion[]> {
    let response = await this.axios.get(`${this.drivePath}/items/${itemId}/versions`);
    return (response.data.value || []).map((v: any) => ({
      versionId: v.id,
      modifiedAt: v.lastModifiedDateTime,
      modifiedBy: v.lastModifiedBy?.user?.displayName,
      size: v.size
    }));
  }

  async restoreVersion(itemId: string, versionId: string): Promise<void> {
    await this.axios.post(
      `${this.drivePath}/items/${itemId}/versions/${versionId}/restoreVersion`
    );
  }

  // === Preview ===

  async getPreviewUrl(itemId: string): Promise<{ getUrl: string; postUrl: string }> {
    let response = await this.axios.post(`${this.drivePath}/items/${itemId}/preview`, {});
    return {
      getUrl: response.data.getUrl || '',
      postUrl: response.data.postUrl || ''
    };
  }

  // === Check-In / Check-Out ===

  async checkOut(itemId: string): Promise<void> {
    await this.axios.post(`${this.drivePath}/items/${itemId}/checkout`);
  }

  async checkIn(itemId: string, comment?: string): Promise<void> {
    await this.axios.post(`${this.drivePath}/items/${itemId}/checkin`, {
      comment: comment || ''
    });
  }

  // === Thumbnails ===

  async getThumbnails(itemId: string): Promise<any[]> {
    let response = await this.axios.get(`${this.drivePath}/items/${itemId}/thumbnails`);
    return response.data.value || [];
  }

  // === Delta Query ===

  async getDelta(deltaLink?: string): Promise<{ items: DriveItem[]; deltaLink: string }> {
    let url = deltaLink || `${this.drivePath}/root/delta`;
    let items: DriveItem[] = [];
    let nextDeltaLink = '';

    while (url) {
      let response = await this.axios.get(url);
      let data = response.data;
      items.push(...(data.value || []).map(mapDriveItem));

      if (data['@odata.nextLink']) {
        url = data['@odata.nextLink'];
      } else {
        nextDeltaLink = data['@odata.deltaLink'] || '';
        url = '';
      }
    }

    return { items, deltaLink: nextDeltaLink };
  }

  // === Subscriptions (Webhooks) ===

  async createSubscription(
    notificationUrl: string,
    resource: string,
    changeType: string,
    expirationMinutes: number = 4230,
    clientState?: string
  ): Promise<Subscription> {
    let expirationDateTime = new Date(
      Date.now() + expirationMinutes * 60 * 1000
    ).toISOString();
    let response = await this.axios.post('/subscriptions', {
      changeType,
      notificationUrl,
      resource,
      expirationDateTime,
      clientState: clientState || undefined
    });
    let sub = response.data;
    return {
      subscriptionId: sub.id,
      resource: sub.resource,
      changeType: sub.changeType,
      notificationUrl: sub.notificationUrl,
      expirationDateTime: sub.expirationDateTime,
      clientState: sub.clientState
    };
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/subscriptions/${subscriptionId}`);
  }

  async renewSubscription(
    subscriptionId: string,
    expirationMinutes: number = 4230
  ): Promise<Subscription> {
    let expirationDateTime = new Date(
      Date.now() + expirationMinutes * 60 * 1000
    ).toISOString();
    let response = await this.axios.patch(`/subscriptions/${subscriptionId}`, {
      expirationDateTime
    });
    let sub = response.data;
    return {
      subscriptionId: sub.id,
      resource: sub.resource,
      changeType: sub.changeType,
      notificationUrl: sub.notificationUrl,
      expirationDateTime: sub.expirationDateTime,
      clientState: sub.clientState
    };
  }
}
