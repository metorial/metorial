import { createAxios } from 'slates';
import { getFetchBaseUrl, getMgmtBaseUrl } from './urls';

export interface FetchClientConfig {
  token: string;
  guid: string;
  locale: string;
  region: string;
  apiType?: 'fetch' | 'preview';
}

export interface MgmtClientConfig {
  token: string;
  guid: string;
  locale: string;
  region: string;
}

// --- Content Fetch API Client ---

export class FetchClient {
  private axios;
  private guid: string;
  private locale: string;
  private apiType: string;

  constructor(config: FetchClientConfig) {
    this.guid = config.guid;
    this.locale = config.locale;
    this.apiType = config.apiType || 'fetch';
    this.axios = createAxios({
      baseURL: getFetchBaseUrl(config.region),
      headers: {
        APIKey: config.token
      }
    });
  }

  private basePath(): string {
    return `/${this.guid}/${this.apiType}/${this.locale}`;
  }

  async getContentItem(contentId: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/item/${contentId}`);
    return response.data;
  }

  async getContentList(
    referenceName: string,
    params?: {
      skip?: number;
      take?: number;
      sort?: string;
      direction?: string;
      filter?: string;
      fields?: string;
      contentLinkDepth?: number;
      expandAllContentLinks?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/list/${referenceName}`, {
      params
    });
    return response.data;
  }

  async getPage(pageId: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/page/${pageId}`);
    return response.data;
  }

  async getSitemapFlat(channelName: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/sitemap/flat/${channelName}`);
    return response.data;
  }

  async getSitemapNested(channelName: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/sitemap/nested/${channelName}`);
    return response.data;
  }

  async syncContentItems(syncToken: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/sync/items`, {
      params: { syncToken, pageSize }
    });
    return response.data;
  }

  async syncPages(syncToken: string, pageSize?: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/sync/pages`, {
      params: { syncToken, pageSize }
    });
    return response.data;
  }

  async getContentModels(): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/models`);
    return response.data;
  }

  async executeGraphQL(query: string, variables?: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/graphql`, {
      query,
      variables
    });
    return response.data;
  }
}

// --- Content Management API Client ---

export class MgmtClient {
  private axios;
  private guid: string;
  private locale: string;

  constructor(config: MgmtClientConfig) {
    this.guid = config.guid;
    this.locale = config.locale;
    this.axios = createAxios({
      baseURL: getMgmtBaseUrl(config.region),
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Cache-Control': 'no-cache'
      }
    });
  }

  private basePath(): string {
    return `/api/v1/instance/${this.guid}`;
  }

  private localePath(): string {
    return `${this.basePath()}/${this.locale}`;
  }

  // -- Content Items --

  async getContentItem(contentId: number): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}`);
    return response.data;
  }

  async saveContentItem(item: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.localePath()}/item`, item);
    return response.data;
  }

  async saveContentItemsBulk(items: Record<string, any>[]): Promise<any> {
    let response = await this.axios.post(`${this.localePath()}/item/multi`, items);
    return response.data;
  }

  async deleteContentItem(contentId: number, comments?: string): Promise<any> {
    let response = await this.axios.delete(`${this.localePath()}/item/${contentId}`, {
      params: { comments }
    });
    return response.data;
  }

  async publishContentItem(contentId: number, comments?: string): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/publish`, {
      params: { comments }
    });
    return response.data;
  }

  async unpublishContentItem(contentId: number, comments?: string): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/unpublish`, {
      params: { comments }
    });
    return response.data;
  }

  async requestApproval(contentId: number, comments?: string): Promise<any> {
    let response = await this.axios.get(
      `${this.localePath()}/item/${contentId}/request-approval`,
      {
        params: { comments }
      }
    );
    return response.data;
  }

  async approveContentItem(contentId: number, comments?: string): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/approve`, {
      params: { comments }
    });
    return response.data;
  }

  async declineContentItem(contentId: number, comments?: string): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/decline`, {
      params: { comments }
    });
    return response.data;
  }

  async batchWorkflow(contentIds: number[], operation: string): Promise<any> {
    let response = await this.axios.post(`${this.localePath()}/item/batch-workflow`, null, {
      params: {
        contentIDs: contentIds.join(','),
        operation
      }
    });
    return response.data;
  }

  async getContentList(
    referenceName: string,
    params?: {
      skip?: number;
      take?: number;
      sort?: string;
      direction?: string;
      filter?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/list/${referenceName}`, {
      params
    });
    return response.data;
  }

  async getContentHistory(
    contentId: number,
    params?: { take?: number; skip?: number }
  ): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/history`, {
      params
    });
    return response.data;
  }

  async getContentComments(
    contentId: number,
    params?: { take?: number; skip?: number }
  ): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/comments`, {
      params
    });
    return response.data;
  }

  // -- Pages --

  async getPage(pageId: number): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/page/${pageId}`);
    return response.data;
  }

  async savePage(page: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.localePath()}/page`, page);
    return response.data;
  }

  async deletePage(pageId: number): Promise<any> {
    let response = await this.axios.delete(`${this.localePath()}/page/${pageId}`);
    return response.data;
  }

  async publishPage(pageId: number): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/page/${pageId}/publish`);
    return response.data;
  }

  async unpublishPage(pageId: number): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/page/${pageId}/unpublish`);
    return response.data;
  }

  async getSitemap(): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/sitemap`);
    return response.data;
  }

  async getPageTemplates(): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/page/templates`);
    return response.data;
  }

  async getPageTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/page/template/${templateId}`);
    return response.data;
  }

  async savePageTemplate(template: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.localePath()}/page/template`, template);
    return response.data;
  }

  async deletePageTemplate(templateId: number): Promise<any> {
    let response = await this.axios.delete(`${this.localePath()}/page/template/${templateId}`);
    return response.data;
  }

  // -- Assets / Media --

  async listAssets(params?: {
    search?: string;
    pageSize?: number;
    recordOffset?: number;
    galleryID?: number;
  }): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/asset/list`, { params });
    return response.data;
  }

  async getAsset(mediaId: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/asset/${mediaId}`);
    return response.data;
  }

  async getAssetByUrl(url: string): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/asset`, { params: { url } });
    return response.data;
  }

  async deleteAsset(mediaId: number): Promise<any> {
    let response = await this.axios.delete(`${this.basePath()}/asset/delete/${mediaId}`);
    return response.data;
  }

  async moveAsset(mediaId: number, destinationFolder: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/move/${mediaId}`, {
      folder: destinationFolder
    });
    return response.data;
  }

  async createFolder(folderName: string, parentFolder?: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/folder`, {
      name: folderName,
      parentFolder
    });
    return response.data;
  }

  async deleteFolder(folderPath: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/folder/delete`, {
      folder: folderPath
    });
    return response.data;
  }

  async renameFolder(folderPath: string, newName: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/folder/rename`, {
      folder: folderPath,
      newName
    });
    return response.data;
  }

  async listGalleries(): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/asset/galleries`);
    return response.data;
  }

  async getGallery(galleryId: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/asset/gallery/${galleryId}`);
    return response.data;
  }

  async saveGallery(gallery: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/gallery`, gallery);
    return response.data;
  }

  async deleteGallery(galleryId: number): Promise<any> {
    let response = await this.axios.delete(`${this.basePath()}/asset/gallery/${galleryId}`);
    return response.data;
  }

  // -- Content Models --

  async listContentModels(includeDefaults?: boolean): Promise<any> {
    let response = await this.axios.get(
      `${this.basePath()}/model/list/${includeDefaults ?? false}`
    );
    return response.data;
  }

  async listPageModules(includeDefaults?: boolean): Promise<any> {
    let response = await this.axios.get(
      `${this.basePath()}/model/list-page-modules/${includeDefaults ?? false}`
    );
    return response.data;
  }

  async getModel(idOrReferenceName: string | number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/model/${idOrReferenceName}`);
    return response.data;
  }

  async saveModel(model: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/model`, model);
    return response.data;
  }

  async deleteModel(modelId: number): Promise<any> {
    let response = await this.axios.delete(`${this.basePath()}/model/${modelId}`);
    return response.data;
  }

  // -- Containers --

  async listContainers(): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/container/list`);
    return response.data;
  }

  async getContainer(idOrReferenceName: string | number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/container/${idOrReferenceName}`);
    return response.data;
  }

  async saveContainer(container: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/container`, container);
    return response.data;
  }

  async deleteContainer(containerId: number): Promise<any> {
    let response = await this.axios.delete(`${this.basePath()}/container/${containerId}`);
    return response.data;
  }

  // -- Webhooks --

  async listWebhooks(): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/webhook/list`);
    return response.data;
  }

  async getWebhook(webhookId: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/webhook/${webhookId}`);
    return response.data;
  }

  async saveWebhook(webhook: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/webhook`, webhook);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<any> {
    let response = await this.axios.delete(`${this.basePath()}/webhook/${webhookId}`);
    return response.data;
  }

  // -- Users --

  async listUsers(): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/user/list`);
    return response.data;
  }

  async saveUser(user: Record<string, any>): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/user/save`, user);
    return response.data;
  }

  async deleteUser(userId: number): Promise<any> {
    let response = await this.axios.delete(`${this.basePath()}/user/delete/${userId}`);
    return response.data;
  }

  // -- Instance --

  async getLocales(): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/locales`);
    return response.data;
  }

  // -- Batches --

  async getBatch(batchId: number): Promise<any> {
    let response = await this.axios.get(`${this.basePath()}/batch/${batchId}`);
    return response.data;
  }

  async publishBatch(batchId: number): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/batch/${batchId}/publish`);
    return response.data;
  }

  async unpublishBatch(batchId: number): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/batch/${batchId}/unpublish`);
    return response.data;
  }
}
