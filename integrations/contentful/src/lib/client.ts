import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  spaceId: string;
  environmentId: string;
  region: 'us' | 'eu';
}

let getCmaBaseUrl = (region: 'us' | 'eu') =>
  region === 'eu' ? 'https://api.eu.contentful.com' : 'https://api.contentful.com';

let getCdaBaseUrl = (region: 'us' | 'eu') =>
  region === 'eu' ? 'https://cdn.eu.contentful.com' : 'https://cdn.contentful.com';

let getCpaBaseUrl = (_region: 'us' | 'eu') => 'https://preview.contentful.com';

export class ContentfulClient {
  private cma: ReturnType<typeof createAxios>;
  private cda: ReturnType<typeof createAxios>;
  private cpa: ReturnType<typeof createAxios>;
  private spaceId: string;
  private environmentId: string;

  constructor(config: ClientConfig) {
    this.spaceId = config.spaceId;
    this.environmentId = config.environmentId;

    this.cma = createAxios({
      baseURL: getCmaBaseUrl(config.region),
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/vnd.contentful.management.v1+json'
      }
    });

    this.cda = createAxios({
      baseURL: getCdaBaseUrl(config.region),
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });

    this.cpa = createAxios({
      baseURL: getCpaBaseUrl(config.region),
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  private envPath(path: string = '') {
    return `/spaces/${this.spaceId}/environments/${this.environmentId}${path}`;
  }

  private spacePath(path: string = '') {
    return `/spaces/${this.spaceId}${path}`;
  }

  // --- Entries (CMA) ---

  async getEntries(params?: Record<string, string | number | boolean>) {
    let response = await this.cma.get(this.envPath('/entries'), { params });
    return response.data;
  }

  async getEntry(entryId: string) {
    let response = await this.cma.get(this.envPath(`/entries/${entryId}`));
    return response.data;
  }

  async createEntry(contentTypeId: string, fields: Record<string, any>) {
    let response = await this.cma.post(
      this.envPath('/entries'),
      { fields },
      { headers: { 'X-Contentful-Content-Type': contentTypeId } }
    );
    return response.data;
  }

  async updateEntry(entryId: string, fields: Record<string, any>, version: number) {
    let response = await this.cma.put(
      this.envPath(`/entries/${entryId}`),
      { fields },
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async publishEntry(entryId: string, version: number) {
    let response = await this.cma.put(this.envPath(`/entries/${entryId}/published`), null, {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async unpublishEntry(entryId: string, version: number) {
    let response = await this.cma.delete(this.envPath(`/entries/${entryId}/published`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async archiveEntry(entryId: string, version: number) {
    let response = await this.cma.put(this.envPath(`/entries/${entryId}/archived`), null, {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async unarchiveEntry(entryId: string, version: number) {
    let response = await this.cma.delete(this.envPath(`/entries/${entryId}/archived`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async deleteEntry(entryId: string, version: number) {
    await this.cma.delete(this.envPath(`/entries/${entryId}`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
  }

  // --- Entries (CDA) ---

  async getPublishedEntries(params?: Record<string, string | number | boolean>) {
    let response = await this.cda.get(this.envPath('/entries'), { params });
    return response.data;
  }

  async getPublishedEntry(entryId: string) {
    let response = await this.cda.get(this.envPath(`/entries/${entryId}`));
    return response.data;
  }

  // --- Preview Entries (CPA) ---

  async getPreviewEntries(params?: Record<string, string | number | boolean>) {
    let response = await this.cpa.get(this.envPath('/entries'), { params });
    return response.data;
  }

  async getPreviewEntry(entryId: string) {
    let response = await this.cpa.get(this.envPath(`/entries/${entryId}`));
    return response.data;
  }

  // --- Assets (CMA) ---

  async getAssets(params?: Record<string, string | number | boolean>) {
    let response = await this.cma.get(this.envPath('/assets'), { params });
    return response.data;
  }

  async getAsset(assetId: string) {
    let response = await this.cma.get(this.envPath(`/assets/${assetId}`));
    return response.data;
  }

  async createAsset(fields: Record<string, any>) {
    let response = await this.cma.post(this.envPath('/assets'), { fields });
    return response.data;
  }

  async updateAsset(assetId: string, fields: Record<string, any>, version: number) {
    let response = await this.cma.put(
      this.envPath(`/assets/${assetId}`),
      { fields },
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async processAsset(assetId: string, locale: string, version: number) {
    await this.cma.put(this.envPath(`/assets/${assetId}/files/${locale}/process`), null, {
      headers: { 'X-Contentful-Version': String(version) }
    });
  }

  async publishAsset(assetId: string, version: number) {
    let response = await this.cma.put(this.envPath(`/assets/${assetId}/published`), null, {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async unpublishAsset(assetId: string, version: number) {
    let response = await this.cma.delete(this.envPath(`/assets/${assetId}/published`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async archiveAsset(assetId: string, version: number) {
    let response = await this.cma.put(this.envPath(`/assets/${assetId}/archived`), null, {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async unarchiveAsset(assetId: string, version: number) {
    let response = await this.cma.delete(this.envPath(`/assets/${assetId}/archived`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async deleteAsset(assetId: string, version: number) {
    await this.cma.delete(this.envPath(`/assets/${assetId}`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
  }

  // --- Content Types (CMA) ---

  async getContentTypes(params?: Record<string, string | number | boolean>) {
    let response = await this.cma.get(this.envPath('/content_types'), { params });
    return response.data;
  }

  async getContentType(contentTypeId: string) {
    let response = await this.cma.get(this.envPath(`/content_types/${contentTypeId}`));
    return response.data;
  }

  async createContentType(data: {
    name: string;
    description?: string;
    displayField?: string;
    fields: any[];
  }) {
    let response = await this.cma.post(this.envPath('/content_types'), data);
    return response.data;
  }

  async updateContentType(
    contentTypeId: string,
    data: {
      name: string;
      description?: string;
      displayField?: string;
      fields: any[];
    },
    version: number
  ) {
    let response = await this.cma.put(this.envPath(`/content_types/${contentTypeId}`), data, {
      headers: { 'X-Contentful-Version': String(version) }
    });
    return response.data;
  }

  async publishContentType(contentTypeId: string, version: number) {
    let response = await this.cma.put(
      this.envPath(`/content_types/${contentTypeId}/published`),
      null,
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async unpublishContentType(contentTypeId: string, version: number) {
    let response = await this.cma.delete(
      this.envPath(`/content_types/${contentTypeId}/published`),
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async deleteContentType(contentTypeId: string) {
    await this.cma.delete(this.envPath(`/content_types/${contentTypeId}`));
  }

  // --- Tags ---

  async getTags(params?: Record<string, string | number | boolean>) {
    let response = await this.cma.get(this.envPath('/tags'), { params });
    return response.data;
  }

  async getTag(tagId: string) {
    let response = await this.cma.get(this.envPath(`/tags/${tagId}`));
    return response.data;
  }

  async createTag(tagId: string, name: string, visibility?: string) {
    let response = await this.cma.put(this.envPath(`/tags/${tagId}`), {
      name,
      sys: { id: tagId, type: 'Tag', visibility: visibility || 'private' }
    });
    return response.data;
  }

  async updateTag(tagId: string, name: string, version: number) {
    let response = await this.cma.put(
      this.envPath(`/tags/${tagId}`),
      { name, sys: { id: tagId, type: 'Tag' } },
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async deleteTag(tagId: string, version: number) {
    await this.cma.delete(this.envPath(`/tags/${tagId}`), {
      headers: { 'X-Contentful-Version': String(version) }
    });
  }

  // --- Locales ---

  async getLocales() {
    let response = await this.cma.get(this.envPath('/locales'));
    return response.data;
  }

  async getLocale(localeId: string) {
    let response = await this.cma.get(this.envPath(`/locales/${localeId}`));
    return response.data;
  }

  async createLocale(data: {
    name: string;
    code: string;
    fallbackCode?: string;
    optional?: boolean;
    contentDeliveryApi?: boolean;
    contentManagementApi?: boolean;
  }) {
    let response = await this.cma.post(this.envPath('/locales'), data);
    return response.data;
  }

  async deleteLocale(localeId: string) {
    await this.cma.delete(this.envPath(`/locales/${localeId}`));
  }

  // --- Environments ---

  async getEnvironments() {
    let response = await this.cma.get(this.spacePath('/environments'));
    return response.data;
  }

  async getEnvironment(environmentId: string) {
    let response = await this.cma.get(this.spacePath(`/environments/${environmentId}`));
    return response.data;
  }

  async createEnvironment(environmentId: string, name: string) {
    let response = await this.cma.put(this.spacePath(`/environments/${environmentId}`), {
      name
    });
    return response.data;
  }

  async deleteEnvironment(environmentId: string) {
    await this.cma.delete(this.spacePath(`/environments/${environmentId}`));
  }

  // --- Space ---

  async getSpace() {
    let response = await this.cma.get(`/spaces/${this.spaceId}`);
    return response.data;
  }

  // --- Webhooks ---

  async getWebhooks() {
    let response = await this.cma.get(this.spacePath('/webhook_definitions'));
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.cma.get(this.spacePath(`/webhook_definitions/${webhookId}`));
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    url: string;
    topics: string[];
    headers?: { key: string; value: string }[];
    httpBasicUsername?: string;
    httpBasicPassword?: string;
    filters?: any[];
    transformation?: { method?: string; contentType?: string; body?: string };
    active?: boolean;
  }) {
    let response = await this.cma.post(this.spacePath('/webhook_definitions'), data);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      name: string;
      url: string;
      topics: string[];
      headers?: { key: string; value: string }[];
      filters?: any[];
      transformation?: { method?: string; contentType?: string; body?: string };
      active?: boolean;
    },
    version: number
  ) {
    let response = await this.cma.put(
      this.spacePath(`/webhook_definitions/${webhookId}`),
      data,
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.cma.delete(this.spacePath(`/webhook_definitions/${webhookId}`));
  }

  // --- Sync ---

  async sync(params: { initial?: boolean; syncToken?: string; type?: string }) {
    let queryParams: Record<string, string> = {};
    if (params.initial) {
      queryParams.initial = 'true';
      if (params.type) {
        queryParams.type = params.type;
      }
    } else if (params.syncToken) {
      queryParams.sync_token = params.syncToken;
    }
    let response = await this.cda.get(this.envPath('/sync'), { params: queryParams });
    return response.data;
  }

  // --- Releases ---

  async getReleases(params?: Record<string, string | number | boolean>) {
    let response = await this.cma.get(this.envPath('/releases'), { params });
    return response.data;
  }

  async getRelease(releaseId: string) {
    let response = await this.cma.get(this.envPath(`/releases/${releaseId}`));
    return response.data;
  }

  async createRelease(data: {
    title: string;
    description?: string;
    entities: { sys: { linkType: string; type: string; id: string } }[];
  }) {
    let response = await this.cma.post(this.envPath('/releases'), data);
    return response.data;
  }

  async publishRelease(releaseId: string, version: number) {
    let response = await this.cma.put(
      this.envPath(`/releases/${releaseId}/actions/publish`),
      null,
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async unpublishRelease(releaseId: string, version: number) {
    let response = await this.cma.put(
      this.envPath(`/releases/${releaseId}/actions/unpublish`),
      null,
      { headers: { 'X-Contentful-Version': String(version) } }
    );
    return response.data;
  }

  async deleteRelease(releaseId: string) {
    await this.cma.delete(this.envPath(`/releases/${releaseId}`));
  }

  // --- Scheduled Actions ---

  async getScheduledActions(params?: Record<string, string | number | boolean>) {
    let response = await this.cma.get(this.spacePath('/scheduled_actions'), {
      params: { ...params, 'environment.sys.id': this.environmentId }
    });
    return response.data;
  }

  async createScheduledAction(data: {
    entity: { sys: { type: string; linkType: string; id: string } };
    environment: { sys: { type: string; linkType: string; id: string } };
    action: string;
    scheduledFor: { datetime: string; timezone?: string };
  }) {
    let response = await this.cma.post(this.spacePath('/scheduled_actions'), data);
    return response.data;
  }

  async cancelScheduledAction(scheduledActionId: string) {
    let response = await this.cma.delete(
      this.spacePath(`/scheduled_actions/${scheduledActionId}`)
    );
    return response.data;
  }
}
