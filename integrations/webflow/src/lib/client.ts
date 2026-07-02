import { createAxios } from 'slates';

let BASE_URL = 'https://api.webflow.com/v2';

export class WebflowClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sites ──────────────────────────────────────────

  async listSites(): Promise<any> {
    let response = await this.http.get('/sites');
    return response.data;
  }

  async getSite(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}`);
    return response.data;
  }

  async publishSite(
    siteId: string,
    customDomains?: string[],
    publishToWebflowSubdomain?: boolean
  ): Promise<any> {
    let body: any = {};
    if (customDomains) body.customDomains = customDomains;
    if (publishToWebflowSubdomain !== undefined)
      body.publishToWebflowSubdomain = publishToWebflowSubdomain;
    let response = await this.http.post(`/sites/${siteId}/publish`, body);
    return response.data;
  }

  async listCustomDomains(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/custom_domains`);
    return response.data;
  }

  // ── Collections ────────────────────────────────────

  async listCollections(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/collections`);
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.http.get(`/collections/${collectionId}`);
    return response.data;
  }

  async createCollection(
    siteId: string,
    data: { displayName: string; singularName?: string; slug?: string }
  ): Promise<any> {
    let response = await this.http.post(`/sites/${siteId}/collections`, data);
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<any> {
    let response = await this.http.delete(`/collections/${collectionId}`);
    return response.data;
  }

  // ── Collection Fields ──────────────────────────────

  async createCollectionField(collectionId: string, data: any): Promise<any> {
    let response = await this.http.post(`/collections/${collectionId}/fields`, data);
    return response.data;
  }

  async updateCollectionField(collectionId: string, fieldId: string, data: any): Promise<any> {
    let response = await this.http.patch(
      `/collections/${collectionId}/fields/${fieldId}`,
      data
    );
    return response.data;
  }

  async deleteCollectionField(collectionId: string, fieldId: string): Promise<any> {
    let response = await this.http.delete(`/collections/${collectionId}/fields/${fieldId}`);
    return response.data;
  }

  // ── Collection Items ───────────────────────────────

  async listCollectionItems(
    collectionId: string,
    params: { offset?: number; limit?: number; sortBy?: string; sortOrder?: string } = {}
  ): Promise<any> {
    let response = await this.http.get(`/collections/${collectionId}/items`, { params });
    return response.data;
  }

  async listCollectionItemsLive(
    collectionId: string,
    params: { offset?: number; limit?: number; sortBy?: string; sortOrder?: string } = {}
  ): Promise<any> {
    let response = await this.http.get(`/collections/${collectionId}/items/live`, { params });
    return response.data;
  }

  async getCollectionItem(collectionId: string, itemId: string): Promise<any> {
    let response = await this.http.get(`/collections/${collectionId}/items/${itemId}`);
    return response.data;
  }

  async getCollectionItemLive(collectionId: string, itemId: string): Promise<any> {
    let response = await this.http.get(`/collections/${collectionId}/items/${itemId}/live`);
    return response.data;
  }

  async createCollectionItem(
    collectionId: string,
    data: { fieldData: Record<string, any>; isArchived?: boolean; isDraft?: boolean }
  ): Promise<any> {
    let response = await this.http.post(`/collections/${collectionId}/items`, data);
    return response.data;
  }

  async updateCollectionItem(
    collectionId: string,
    itemId: string,
    data: { fieldData?: Record<string, any>; isArchived?: boolean; isDraft?: boolean }
  ): Promise<any> {
    let response = await this.http.patch(`/collections/${collectionId}/items/${itemId}`, data);
    return response.data;
  }

  async deleteCollectionItem(collectionId: string, itemId: string): Promise<any> {
    let response = await this.http.delete(`/collections/${collectionId}/items/${itemId}`);
    return response.data;
  }

  async publishCollectionItems(collectionId: string, itemIds: string[]): Promise<any> {
    let response = await this.http.post(`/collections/${collectionId}/items/publish`, {
      itemIds
    });
    return response.data;
  }

  // ── Pages ──────────────────────────────────────────

  async listPages(
    siteId: string,
    params: { offset?: number; limit?: number; locale?: string } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/pages`, { params });
    return response.data;
  }

  async getPageMetadata(pageId: string): Promise<any> {
    let response = await this.http.get(`/pages/${pageId}`);
    return response.data;
  }

  async updatePageSettings(
    pageId: string,
    data: { title?: string; slug?: string; description?: string; openGraph?: any; seo?: any }
  ): Promise<any> {
    let response = await this.http.patch(`/pages/${pageId}`, data);
    return response.data;
  }

  async getPageContent(pageId: string): Promise<any> {
    let response = await this.http.get(`/pages/${pageId}/dom`);
    return response.data;
  }

  // ── Forms ──────────────────────────────────────────

  async listForms(
    siteId: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/forms`, { params });
    return response.data;
  }

  async getForm(formId: string): Promise<any> {
    let response = await this.http.get(`/forms/${formId}`);
    return response.data;
  }

  async listFormSubmissions(
    formId: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<any> {
    let response = await this.http.get(`/forms/${formId}/submissions`, { params });
    return response.data;
  }

  async getFormSubmission(formId: string, submissionId: string): Promise<any> {
    let response = await this.http.get(`/forms/${formId}/submissions/${submissionId}`);
    return response.data;
  }

  // ── Ecommerce ──────────────────────────────────────

  async listProducts(
    siteId: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/products`, { params });
    return response.data;
  }

  async getProduct(siteId: string, productId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/products/${productId}`);
    return response.data;
  }

  async createProduct(siteId: string, data: { product: any; sku?: any }): Promise<any> {
    let response = await this.http.post(`/sites/${siteId}/products`, data);
    return response.data;
  }

  async updateProduct(
    siteId: string,
    productId: string,
    data: { product?: any; sku?: any }
  ): Promise<any> {
    let response = await this.http.patch(`/sites/${siteId}/products/${productId}`, data);
    return response.data;
  }

  async listOrders(
    siteId: string,
    params: { offset?: number; limit?: number; status?: string } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/orders`, { params });
    return response.data;
  }

  async getOrder(siteId: string, orderId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/orders/${orderId}`);
    return response.data;
  }

  async updateOrder(siteId: string, orderId: string, data: any): Promise<any> {
    let response = await this.http.patch(`/sites/${siteId}/orders/${orderId}`, data);
    return response.data;
  }

  async getInventory(collectionId: string, itemId: string): Promise<any> {
    let response = await this.http.get(
      `/collections/${collectionId}/items/${itemId}/inventory`
    );
    return response.data;
  }

  async updateInventory(
    collectionId: string,
    itemId: string,
    data: { inventoryType?: string; quantity?: number }
  ): Promise<any> {
    let response = await this.http.patch(
      `/collections/${collectionId}/items/${itemId}/inventory`,
      data
    );
    return response.data;
  }

  // ── Users ──────────────────────────────────────────

  async listUsers(
    siteId: string,
    params: { offset?: number; limit?: number; sort?: string } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/users`, { params });
    return response.data;
  }

  async getUser(siteId: string, userId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/users/${userId}`);
    return response.data;
  }

  async inviteUser(
    siteId: string,
    data: { email: string; accessGroups?: string[] }
  ): Promise<any> {
    let response = await this.http.post(`/sites/${siteId}/users/invite`, data);
    return response.data;
  }

  async updateUser(
    siteId: string,
    userId: string,
    data: { accessGroups?: string[] }
  ): Promise<any> {
    let response = await this.http.patch(`/sites/${siteId}/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(siteId: string, userId: string): Promise<any> {
    let response = await this.http.delete(`/sites/${siteId}/users/${userId}`);
    return response.data;
  }

  async listAccessGroups(
    siteId: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/accessgroups`, { params });
    return response.data;
  }

  // ── Assets ─────────────────────────────────────────

  async listAssets(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/assets`);
    return response.data;
  }

  async getAsset(assetId: string): Promise<any> {
    let response = await this.http.get(`/assets/${assetId}`);
    return response.data;
  }

  async deleteAsset(assetId: string): Promise<any> {
    let response = await this.http.delete(`/assets/${assetId}`);
    return response.data;
  }

  async listAssetFolders(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/asset_folders`);
    return response.data;
  }

  async getAssetFolder(assetFolderId: string): Promise<any> {
    let response = await this.http.get(`/asset_folders/${assetFolderId}`);
    return response.data;
  }

  async createAssetFolder(
    siteId: string,
    data: { displayName: string; parentFolder?: string }
  ): Promise<any> {
    let response = await this.http.post(`/sites/${siteId}/asset_folders`, data);
    return response.data;
  }

  // ── Custom Code ────────────────────────────────────

  async listSiteCustomCode(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/custom_code`);
    return response.data;
  }

  async upsertSiteCustomCode(siteId: string, data: { scripts: any[] }): Promise<any> {
    let response = await this.http.put(`/sites/${siteId}/custom_code`, data);
    return response.data;
  }

  async deleteSiteCustomCode(siteId: string): Promise<any> {
    let response = await this.http.delete(`/sites/${siteId}/custom_code`);
    return response.data;
  }

  async listPageCustomCode(pageId: string): Promise<any> {
    let response = await this.http.get(`/pages/${pageId}/custom_code`);
    return response.data;
  }

  async upsertPageCustomCode(pageId: string, data: { scripts: any[] }): Promise<any> {
    let response = await this.http.put(`/pages/${pageId}/custom_code`, data);
    return response.data;
  }

  async deletePageCustomCode(pageId: string): Promise<any> {
    let response = await this.http.delete(`/pages/${pageId}/custom_code`);
    return response.data;
  }

  async listRegisteredScripts(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/registered_scripts`);
    return response.data;
  }

  async registerScript(
    siteId: string,
    data: {
      sourceUrl?: string;
      integrityHash?: string;
      version: string;
      displayName: string;
      canCopy?: boolean;
      hostedLocation?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(`/sites/${siteId}/registered_scripts`, data);
    return response.data;
  }

  // ── Webhooks ───────────────────────────────────────

  async listWebhooks(siteId: string): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/webhooks`);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(
    siteId: string,
    data: { triggerType: string; url: string; filter?: any }
  ): Promise<any> {
    let response = await this.http.post(`/sites/${siteId}/webhooks`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // ── Comments ───────────────────────────────────────

  async listComments(
    siteId: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/comments`, { params });
    return response.data;
  }

  // ── Components ─────────────────────────────────────

  async listComponents(
    siteId: string,
    params: { offset?: number; limit?: number } = {}
  ): Promise<any> {
    let response = await this.http.get(`/sites/${siteId}/components`, { params });
    return response.data;
  }

  // ── Token Info ─────────────────────────────────────

  async getAuthorizedUser(): Promise<any> {
    let response = await this.http.get('/token/authorized_by');
    return response.data;
  }

  async getTokenInfo(): Promise<any> {
    let response = await this.http.get('/token/introspect');
    return response.data;
  }
}
