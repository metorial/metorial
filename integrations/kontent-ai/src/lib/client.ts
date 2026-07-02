import { createAxios } from 'slates';
import type {
  Asset,
  Collection,
  ContentItem,
  ContentType,
  FileReference,
  KontentWebhook,
  Language,
  LanguageVariant,
  PatchOperation,
  TaxonomyGroup,
  Workflow
} from './types';

export class ManagementClient {
  private axios;

  constructor(params: { token: string; environmentId: string }) {
    this.axios = createAxios({
      baseURL: `https://manage.kontent.ai/v2/projects/${params.environmentId}`,
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Content Items ───

  async listContentItems(
    continuationToken?: string
  ): Promise<{ items: ContentItem[]; continuationToken?: string }> {
    let headers: Record<string, string> = {};
    if (continuationToken) {
      headers['x-continuation'] = continuationToken;
    }
    let response = await this.axios.get('/items', { headers });
    return {
      items: response.data.items || response.data || [],
      continuationToken:
        response.headers?.['x-continuation'] ||
        response.data?.pagination?.continuation_token ||
        undefined
    };
  }

  async getContentItem(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<ContentItem> {
    let path = this.buildIdentifierPath('/items', identifier, identifierType);
    let response = await this.axios.get(path);
    return response.data;
  }

  async createContentItem(data: {
    name: string;
    codename?: string;
    type: { codename: string };
    externalId?: string;
    collection?: { codename: string };
  }): Promise<ContentItem> {
    let body: any = {
      name: data.name,
      type: data.type
    };
    if (data.codename) body.codename = data.codename;
    if (data.externalId) body.external_id = data.externalId;
    if (data.collection) body.collection = data.collection;
    let response = await this.axios.post('/items', body);
    return response.data;
  }

  async upsertContentItem(
    externalId: string,
    data: {
      name: string;
      codename?: string;
      type?: { codename: string };
      collection?: { codename: string };
    }
  ): Promise<ContentItem> {
    let body: any = { name: data.name };
    if (data.codename) body.codename = data.codename;
    if (data.type) body.type = data.type;
    if (data.collection) body.collection = data.collection;
    let response = await this.axios.put(
      `/items/external-id/${encodeURIComponent(externalId)}`,
      body
    );
    return response.data;
  }

  async deleteContentItem(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<void> {
    let path = this.buildIdentifierPath('/items', identifier, identifierType);
    await this.axios.delete(path);
  }

  // ─── Language Variants ───

  async listLanguageVariants(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<LanguageVariant[]> {
    let path = `${this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType)}/variants`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async getLanguageVariant(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string
  ): Promise<LanguageVariant> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async upsertLanguageVariant(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string,
    elements: Array<{ element: { codename: string }; value: any }>
  ): Promise<LanguageVariant> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}`;
    let response = await this.axios.put(path, { elements });
    return response.data;
  }

  async deleteLanguageVariant(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}`;
    await this.axios.delete(path);
  }

  // ─── Workflow ───

  async listWorkflows(): Promise<Workflow[]> {
    let response = await this.axios.get('/workflows');
    return response.data;
  }

  async changeWorkflowStep(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string,
    workflowStepIdentifier: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}/workflow/${workflowStepIdentifier}`;
    await this.axios.put(path);
  }

  async publishVariant(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string,
    scheduledTo?: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}/publish`;
    let body = scheduledTo ? { scheduled_to: scheduledTo } : undefined;
    await this.axios.put(path, body);
  }

  async unpublishAndArchiveVariant(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string,
    scheduledTo?: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}/unpublish-and-archive`;
    let body = scheduledTo ? { scheduled_to: scheduledTo } : undefined;
    await this.axios.put(path, body);
  }

  async createNewVersion(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}/new-version`;
    await this.axios.put(path);
  }

  async cancelScheduledPublish(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}/cancel-scheduled-publish`;
    await this.axios.put(path);
  }

  async cancelScheduledUnpublish(
    itemIdentifier: string,
    itemIdentifierType: 'id' | 'codename' | 'external_id',
    languageCodename: string
  ): Promise<void> {
    let path =
      this.buildIdentifierPath('/items', itemIdentifier, itemIdentifierType) +
      `/variants/codename/${languageCodename}/cancel-scheduled-unpublish`;
    await this.axios.put(path);
  }

  // ─── Content Types ───

  async listContentTypes(
    continuationToken?: string
  ): Promise<{ types: ContentType[]; continuationToken?: string }> {
    let headers: Record<string, string> = {};
    if (continuationToken) {
      headers['x-continuation'] = continuationToken;
    }
    let response = await this.axios.get('/types', { headers });
    return {
      types: response.data.types || response.data || [],
      continuationToken:
        response.headers?.['x-continuation'] ||
        response.data?.pagination?.continuation_token ||
        undefined
    };
  }

  async getContentType(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<ContentType> {
    let path = this.buildIdentifierPath('/types', identifier, identifierType);
    let response = await this.axios.get(path);
    return response.data;
  }

  async createContentType(data: {
    name: string;
    codename?: string;
    externalId?: string;
    elements: any[];
    contentGroups?: any[];
  }): Promise<ContentType> {
    let body: any = {
      name: data.name,
      elements: data.elements
    };
    if (data.codename) body.codename = data.codename;
    if (data.externalId) body.external_id = data.externalId;
    if (data.contentGroups) body.content_groups = data.contentGroups;
    let response = await this.axios.post('/types', body);
    return response.data;
  }

  async modifyContentType(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id',
    operations: PatchOperation[]
  ): Promise<ContentType> {
    let path = this.buildIdentifierPath('/types', identifier, identifierType);
    let response = await this.axios.patch(path, operations);
    return response.data;
  }

  async deleteContentType(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<void> {
    let path = this.buildIdentifierPath('/types', identifier, identifierType);
    await this.axios.delete(path);
  }

  // ─── Assets ───

  async listAssets(
    continuationToken?: string
  ): Promise<{ assets: Asset[]; continuationToken?: string }> {
    let headers: Record<string, string> = {};
    if (continuationToken) {
      headers['x-continuation'] = continuationToken;
    }
    let response = await this.axios.get('/assets', { headers });
    return {
      assets: response.data.assets || response.data || [],
      continuationToken:
        response.headers?.['x-continuation'] ||
        response.data?.pagination?.continuation_token ||
        undefined
    };
  }

  async getAsset(
    identifier: string,
    identifierType: 'id' | 'external_id' = 'id'
  ): Promise<Asset> {
    let path =
      identifierType === 'external_id'
        ? `/assets/external-id/${encodeURIComponent(identifier)}`
        : `/assets/${identifier}`;
    let response = await this.axios.get(path);
    return response.data;
  }

  async uploadBinaryFile(
    fileName: string,
    contentType: string,
    fileData: Buffer | ArrayBuffer
  ): Promise<FileReference> {
    let response = await this.axios.post(`/files/${encodeURIComponent(fileName)}`, fileData, {
      headers: {
        'Content-Type': contentType,

        'Content-Length': String(
          fileData instanceof Buffer ? fileData.length : fileData.byteLength
        )
      }
    });
    return response.data;
  }

  async createAsset(data: {
    fileReference: FileReference;
    title?: string;
    externalId?: string;
    descriptions?: Array<{ language: { codename: string }; description: string }>;
    folder?: { id?: string; external_id?: string };
  }): Promise<Asset> {
    let body: any = {
      file_reference: data.fileReference
    };
    if (data.title) body.title = data.title;
    if (data.externalId) body.external_id = data.externalId;
    if (data.descriptions) body.descriptions = data.descriptions;
    if (data.folder) body.folder = data.folder;
    let response = await this.axios.post('/assets', body);
    return response.data;
  }

  async updateAsset(
    assetId: string,
    data: {
      title?: string;
      descriptions?: Array<{ language: { codename: string }; description: string }>;
      folder?: { id?: string; external_id?: string };
    }
  ): Promise<Asset> {
    let body: any = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.descriptions) body.descriptions = data.descriptions;
    if (data.folder) body.folder = data.folder;
    let response = await this.axios.put(`/assets/${assetId}`, body);
    return response.data;
  }

  async deleteAsset(
    identifier: string,
    identifierType: 'id' | 'external_id' = 'id'
  ): Promise<void> {
    let path =
      identifierType === 'external_id'
        ? `/assets/external-id/${encodeURIComponent(identifier)}`
        : `/assets/${identifier}`;
    await this.axios.delete(path);
  }

  // ─── Taxonomy Groups ───

  async listTaxonomyGroups(): Promise<TaxonomyGroup[]> {
    let response = await this.axios.get('/taxonomies');
    return response.data.taxonomies || response.data || [];
  }

  async getTaxonomyGroup(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<TaxonomyGroup> {
    let path = this.buildIdentifierPath('/taxonomies', identifier, identifierType);
    let response = await this.axios.get(path);
    return response.data;
  }

  async createTaxonomyGroup(data: {
    name: string;
    codename?: string;
    externalId?: string;
    terms: any[];
  }): Promise<TaxonomyGroup> {
    let body: any = {
      name: data.name,
      terms: data.terms
    };
    if (data.codename) body.codename = data.codename;
    if (data.externalId) body.external_id = data.externalId;
    let response = await this.axios.post('/taxonomies', body);
    return response.data;
  }

  async modifyTaxonomyGroup(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id',
    operations: PatchOperation[]
  ): Promise<TaxonomyGroup> {
    let path = this.buildIdentifierPath('/taxonomies', identifier, identifierType);
    let response = await this.axios.patch(path, operations);
    return response.data;
  }

  async deleteTaxonomyGroup(
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id' = 'id'
  ): Promise<void> {
    let path = this.buildIdentifierPath('/taxonomies', identifier, identifierType);
    await this.axios.delete(path);
  }

  // ─── Languages ───

  async listLanguages(): Promise<Language[]> {
    let response = await this.axios.get('/languages');
    return response.data.languages || response.data || [];
  }

  async addLanguage(data: {
    name: string;
    codename: string;
    externalId?: string;
    isActive?: boolean;
    fallbackLanguage?: { codename: string };
  }): Promise<Language> {
    let body: any = {
      name: data.name,
      codename: data.codename
    };
    if (data.externalId) body.external_id = data.externalId;
    if (data.isActive !== undefined) body.is_active = data.isActive;
    if (data.fallbackLanguage) body.fallback_language = data.fallbackLanguage;
    let response = await this.axios.post('/languages', body);
    return response.data;
  }

  async modifyLanguage(codename: string, operations: PatchOperation[]): Promise<Language> {
    let response = await this.axios.patch(`/languages/codename/${codename}`, operations);
    return response.data;
  }

  // ─── Collections ───

  async listCollections(): Promise<Collection[]> {
    let response = await this.axios.get('/collections');
    return response.data.collections || response.data || [];
  }

  // ─── Spaces ───

  async listSpaces(): Promise<any[]> {
    let response = await this.axios.get('/spaces');
    return response.data || [];
  }

  // ─── Webhooks ───

  async listWebhooks(): Promise<KontentWebhook[]> {
    let response = await this.axios.get('/webhooks');
    return response.data || [];
  }

  async getWebhook(webhookId: string): Promise<KontentWebhook> {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    url: string;
    triggers: any;
    secret?: string;
    headers?: Array<{ key: string; value: string }>;
    enabled?: boolean;
  }): Promise<KontentWebhook> {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  async enableWebhook(webhookId: string): Promise<void> {
    await this.axios.put(`/webhooks/${webhookId}/enable`);
  }

  async disableWebhook(webhookId: string): Promise<void> {
    await this.axios.put(`/webhooks/${webhookId}/disable`);
  }

  // ─── Environment info ───

  async getEnvironment(): Promise<any> {
    let response = await this.axios.get('/');
    return response.data;
  }

  // ─── Helpers ───

  private buildIdentifierPath(
    basePath: string,
    identifier: string,
    identifierType: 'id' | 'codename' | 'external_id'
  ): string {
    switch (identifierType) {
      case 'codename':
        return `${basePath}/codename/${identifier}`;
      case 'external_id':
        return `${basePath}/external-id/${encodeURIComponent(identifier)}`;
      default:
        return `${basePath}/${identifier}`;
    }
  }
}
