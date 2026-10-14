import { createApiServiceError, createAxios, pickDefined } from 'slates';
import { optimizelyErrorMapping } from './api-errors';

export class CmsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      errorMapping: optimizelyErrorMapping,
      timeout: 30000,
      baseURL: 'https://api.cms.optimizely.com/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }
    });
  }

  async listContent(params?: {
    page?: number;
    pageSize?: number;
    contentType?: string;
    parentKey?: string;
  }) {
    if (!params?.parentKey)
      throw createApiServiceError('parentKey is required to list content in a CMS container.');
    let response = await this.axios.get(
      `/content/${encodeURIComponent(params.parentKey)}/items`,
      {
        params: {
          pageIndex: params.page === undefined ? undefined : params.page - 1,
          pageSize: params.pageSize,
          contentTypes: params.contentType
        }
      }
    );
    return response.data;
  }

  private async resolveVersion(
    contentKey: string,
    params?: { locale?: string; version?: string }
  ) {
    if (params?.version) return params.version;
    let response = await this.axios.get(
      `/content/${encodeURIComponent(contentKey)}/versions`,
      {
        params: { locales: params?.locale, pageSize: 10000 }
      }
    );
    let items = response.data.items;
    let versions = Array.isArray(items)
      ? items
      : items && typeof items === 'object'
        ? Object.values(items)
        : [];
    if (versions.length !== 1 || typeof versions[0]?.version !== 'string') {
      throw createApiServiceError(
        'Provide version to select the CMS content version explicitly. Multiple or no versions were found for this content and locale.'
      );
    }
    return versions[0].version;
  }

  async getContent(contentKey: string, params?: { locale?: string; version?: string }) {
    let path = `/content/${encodeURIComponent(contentKey)}`;
    if (params?.version || params?.locale) {
      let version = await this.resolveVersion(contentKey, params);
      path += `/versions/${encodeURIComponent(version)}`;
    }
    let response = await this.axios.get(path);
    return response.data;
  }

  async createContent(data: {
    name: string;
    contentType: string;
    parentKey?: string;
    locale?: string;
    properties?: Record<string, any>;
    status?: string;
  }) {
    if (data.status && !['draft', 'published'].includes(data.status)) {
      throw createApiServiceError(
        'CMS status is read-only. Create a draft or use published to publish its initial version.'
      );
    }
    let response = await this.axios.post('/content', {
      contentType: data.contentType,
      container: data.parentKey,
      initialVersion: {
        displayName: data.name,
        locale: data.locale,
        properties: data.properties
      }
    });
    if (data.status === 'published') {
      let version = response.data.initialVersion?.version;
      if (!response.data.key || !version)
        throw createApiServiceError(
          'CMS created the content without returning its key and initial version. Retrieve them before publishing.'
        );
      return this.publishContent(response.data.key, { version });
    }
    return response.data;
  }

  async updateContent(
    contentKey: string,
    data: { name?: string; properties?: Record<string, any>; status?: string },
    params?: { locale?: string; version?: string }
  ) {
    if (data.status && data.status !== 'published')
      throw createApiServiceError(
        'CMS status is read-only. Omit status when editing a draft, or use published to publish the updated version.'
      );
    let version = await this.resolveVersion(contentKey, params);
    let response = await this.axios.patch(
      `/content/${encodeURIComponent(contentKey)}/versions/${encodeURIComponent(version)}`,
      pickDefined({ displayName: data.name, properties: data.properties }),
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );
    if (data.status === 'published') return this.publishContent(contentKey, { version });
    return response.status === 204 ? this.getContent(contentKey, { version }) : response.data;
  }

  async deleteContent(contentKey: string) {
    let response = await this.axios.delete(`/content/${encodeURIComponent(contentKey)}`);
    return response.data;
  }

  async publishContent(contentKey: string, params?: { locale?: string; version?: string }) {
    let version = await this.resolveVersion(contentKey, params);
    let response = await this.axios.post(
      `/content/${encodeURIComponent(contentKey)}/versions/${encodeURIComponent(version)}:publish`
    );
    return response.status === 204 ? this.getContent(contentKey, { version }) : response.data;
  }

  async listContentTypes(params?: { page?: number; pageSize?: number }) {
    let response = await this.axios.get('/contenttypes', {
      params: {
        pageIndex: params?.page === undefined ? undefined : params.page - 1,
        pageSize: params?.pageSize
      }
    });
    return response.data;
  }

  async getContentType(contentTypeKey: string) {
    let response = await this.axios.get(`/contenttypes/${encodeURIComponent(contentTypeKey)}`);
    return response.data;
  }

  async listSites() {
    let response = await this.axios.get('/sites');
    return response.data;
  }

  async getSite(siteId: string) {
    let response = await this.axios.get(`/sites/${encodeURIComponent(siteId)}`);
    return response.data;
  }
}
