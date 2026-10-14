import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import { getFetchBaseUrl, getMgmtBaseUrl } from './urls';

export interface FetchClientConfig {
  token: string;
  guid: string;
  locale: string;
  region: string;
  authMethod?: 'api_key' | 'oauth';
  apiType?: 'fetch' | 'preview';
}

export interface MgmtClientConfig {
  token: string;
  guid: string;
  locale: string;
  region: string;
  authMethod?: 'api_key' | 'oauth';
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
    this.axios = createAuthenticatedAxios({
      baseURL: getFetchBaseUrl(config.region),
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Agility CMS',
          reason: 'agility_api_error'
        }),
      headers: {
        APIKey: config.token
      }
    });
    if (config.authMethod === 'oauth') {
      let management = createAuthenticatedAxios({
        baseURL: getMgmtBaseUrl(config.region),
        authHeader: { value: `Bearer ${config.token}` },
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Agility CMS',
            reason: 'agility_api_error'
          })
      });
      let apiKeyPromise: Promise<string> | undefined;
      this.axios.interceptors.request.use(async request => {
        apiKeyPromise ??= management
          .get(`/oauth/get${this.apiType === 'preview' ? 'preview' : 'fetch'}key`, {
            params: { guid: this.guid }
          })
          .then(response => {
            if (typeof response.data !== 'string' || !response.data) {
              throw createApiServiceError('Agility CMS did not return a content API key.');
            }
            return response.data;
          });
        try {
          request.headers.set('APIKey', await apiKeyPromise);
        } catch (error) {
          apiKeyPromise = undefined;
          throw error;
        }
        return request;
      });
    }
  }

  private basePath(): string {
    return `/${encodeURIComponent(this.guid)}/${this.apiType}/${encodeURIComponent(this.locale)}`;
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

export interface BatchResult {
  batchId: number;
  completed: boolean;
  itemIds: number[];
}

export class MgmtClient {
  private axios;
  private guid: string;
  private locale: string;

  constructor(config: MgmtClientConfig) {
    if (config.authMethod === 'api_key') {
      throw createApiServiceError(
        'This operation requires an Agility CMS OAuth connection. Fetch and preview API keys only read content.'
      );
    }
    this.guid = config.guid;
    this.locale = config.locale;
    this.axios = createAuthenticatedAxios({
      baseURL: getMgmtBaseUrl(config.region),
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Agility CMS',
          reason: 'agility_api_error'
        }),
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Cache-Control': 'no-cache'
      }
    });
  }

  private basePath(): string {
    return `/api/v1/instance/${encodeURIComponent(this.guid)}`;
  }

  private localePath(): string {
    return `${this.basePath()}/${encodeURIComponent(this.locale)}`;
  }

  async getCurrentUser(): Promise<Record<string, any>> {
    let response = await this.axios.get('/api/v1/users/me');
    return response.data;
  }

  async getBatch(batchId: number): Promise<Record<string, any>> {
    let response = await this.axios.get(`${this.basePath()}/batch/${batchId}`, {
      params: { expandItems: true }
    });
    return response.data;
  }

  private async waitForBatch(batchId: unknown): Promise<BatchResult> {
    if (typeof batchId !== 'number' || !Number.isInteger(batchId) || batchId <= 0) {
      throw createApiServiceError(
        'Agility CMS did not return a valid batch ID for the queued write.'
      );
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        let batch = await this.getBatch(batchId);
        if (batch.abortYN || batch.errorData || batch.batchState === 4) {
          throw createApiServiceError(
            `Agility CMS batch ${batchId} failed: ${batch.errorData || batch.statusMessage || 'The batch was aborted or deleted.'}`
          );
        }
        if (batch.batchState === 3) {
          let items = Array.isArray(batch.items) ? batch.items : [];
          let failedItem = items.find(item => item.errorMessage || item.itemID < 0);
          if (failedItem) {
            throw createApiServiceError(
              `Agility CMS batch ${batchId} failed: ${failedItem.errorMessage || 'An item could not be processed.'}`
            );
          }
          return {
            batchId,
            completed: true,
            itemIds: items
              .map(item => item.itemID)
              .filter(id => typeof id === 'number' && id > 0)
          };
        }
      } catch (error) {
        let status = getApiErrorStatus(error);
        if (isApiErrorRecord(error) && isApiErrorRecord(error.data)) {
          status ??= error.data.upstreamStatus as number | undefined;
        }
        if (String(status) !== '404') throw error;
      }
      if (attempt < 19) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return { batchId, completed: false, itemIds: [] };
  }

  // -- Content Items --

  async getContentItem(contentId: number): Promise<any> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}`);
    return response.data;
  }

  async saveContentItem(item: Record<string, any>): Promise<BatchResult> {
    let response = await this.axios.post(`${this.localePath()}/item`, item);
    return this.waitForBatch(response.data);
  }

  async saveContentItemsBulk(items: Record<string, any>[]): Promise<BatchResult> {
    let response = await this.axios.post(`${this.localePath()}/item/multi`, items);
    return this.waitForBatch(response.data);
  }

  async deleteContentItem(contentId: number, comments?: string): Promise<BatchResult> {
    let response = await this.axios.delete(`${this.localePath()}/item/${contentId}`, {
      params: { comments }
    });
    return this.waitForBatch(response.data);
  }

  async publishContentItem(contentId: number, comments?: string): Promise<BatchResult> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/publish`, {
      params: { comments }
    });
    return this.waitForBatch(response.data);
  }

  async unpublishContentItem(contentId: number, comments?: string): Promise<BatchResult> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/unpublish`, {
      params: { comments }
    });
    return this.waitForBatch(response.data);
  }

  async requestApproval(contentId: number, comments?: string): Promise<BatchResult> {
    let response = await this.axios.get(
      `${this.localePath()}/item/${contentId}/request-approval`,
      {
        params: { comments }
      }
    );
    return this.waitForBatch(response.data);
  }

  async approveContentItem(contentId: number, comments?: string): Promise<BatchResult> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/approve`, {
      params: { comments }
    });
    return this.waitForBatch(response.data);
  }

  async declineContentItem(contentId: number, comments?: string): Promise<BatchResult> {
    let response = await this.axios.get(`${this.localePath()}/item/${contentId}/decline`, {
      params: { comments }
    });
    return this.waitForBatch(response.data);
  }

  async batchWorkflow(
    contentIds: number[],
    operation: 'publish' | 'unpublish' | 'approve' | 'decline' | 'request-approval'
  ): Promise<BatchResult> {
    let response = await this.axios.post(`${this.localePath()}/item/batch-workflow`, null, {
      params: {
        contentIDs: contentIds.join(','),
        operation: {
          publish: 'Publish',
          unpublish: 'Unpublish',
          approve: 'Approve',
          decline: 'Decline',
          'request-approval': 'RequestApproval'
        }[operation]
      }
    });
    return this.waitForBatch(response.data);
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

  async savePage(page: Record<string, any>, parentPageId?: number): Promise<BatchResult> {
    let response = await this.axios.post(`${this.localePath()}/page`, page, {
      params: { parentPageID: parentPageId }
    });
    return this.waitForBatch(response.data);
  }

  async deletePage(pageId: number): Promise<BatchResult> {
    let response = await this.axios.delete(`${this.localePath()}/page/${pageId}`);
    return this.waitForBatch(response.data);
  }

  async publishPage(pageId: number): Promise<BatchResult> {
    let response = await this.axios.get(`${this.localePath()}/page/${pageId}/publish`);
    return this.waitForBatch(response.data);
  }

  async unpublishPage(pageId: number): Promise<BatchResult> {
    let response = await this.axios.get(`${this.localePath()}/page/${pageId}/unpublish`);
    return this.waitForBatch(response.data);
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
    let response = await this.axios.get(`${this.basePath()}/asset/list`, {
      params: {
        ...params,
        pageSize: params?.pageSize ?? 20,
        recordOffset: params?.recordOffset ?? 0
      }
    });
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
    let response = await this.axios.post(`${this.basePath()}/asset/move/${mediaId}`, null, {
      params: { newFolder: destinationFolder }
    });
    return response.data;
  }

  async createFolder(folderName: string, parentFolder?: string): Promise<any> {
    let originKey = parentFolder
      ? `${parentFolder.replace(/\/$/, '')}/${folderName}`
      : folderName;
    let response = await this.axios.post(`${this.basePath()}/asset/folder`, null, {
      params: { originKey }
    });
    return response.data;
  }

  async deleteFolder(folderPath: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/folder/delete`, null, {
      params: { originKey: folderPath, mediaID: 0 }
    });
    return response.data;
  }

  async renameFolder(folderPath: string, newName: string): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/asset/folder/rename`, null, {
      params: { folderName: folderPath, newFolderName: newName, mediaID: 0 }
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
    let response = await this.axios.get(
      `${this.basePath()}/model/${encodeURIComponent(String(idOrReferenceName))}`
    );
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

  async publishBatch(batchId: number): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/batch/${batchId}/publish`);
    return response.data;
  }

  async unpublishBatch(batchId: number): Promise<any> {
    let response = await this.axios.post(`${this.basePath()}/batch/${batchId}/unpublish`);
    return response.data;
  }
}
