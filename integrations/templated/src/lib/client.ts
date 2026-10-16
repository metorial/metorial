import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { rejectMergeResponse } from './files';

let axios = createAxios({
  baseURL: 'https://api.templated.io/v1'
});

axios.interceptors.response.use(
  response => response,
  error =>
    Promise.reject(
      buildApiServiceError(error, {
        providerLabel: 'Templated',
        reason: 'templated_api_error',
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      })
    )
);

let expectArray = (value: unknown): any[] => {
  if (!Array.isArray(value))
    throw createApiServiceError('Templated returned an unexpected list response.');
  return value;
};

export class Client {
  constructor(private token: string) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ==================== Account ====================

  async getAccount() {
    let response = await axios.get('/account', { headers: this.headers });
    return response.data;
  }

  // ==================== Templates ====================

  async listTemplates(params?: {
    query?: string;
    page?: number;
    limit?: number;
    width?: number;
    height?: number;
    tags?: string;
    externalId?: string;
    includeLayers?: boolean;
    includePages?: boolean;
  }) {
    let response = await axios.get('/templates', {
      headers: this.headers,
      params
    });
    return expectArray(response.data);
  }

  async getTemplate(
    templateId: string,
    params?: {
      includeLayers?: boolean;
      includePages?: boolean;
    }
  ) {
    let response = await axios.get(`/template/${encodeURIComponent(templateId)}`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async createTemplate(body: {
    name: string;
    width: number;
    height: number;
    layers?: any[];
    pages?: any[];
    duration?: number;
  }) {
    let response = await axios.post('/template', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    body: {
      name?: string;
      width?: number;
      height?: number;
      description?: string;
      externalId?: string;
      safeZoneWidth?: number;
      layers?: any[];
      pages?: any[];
    },
    replaceLayers?: boolean
  ) {
    let response = await axios.put(`/template/${encodeURIComponent(templateId)}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      params: replaceLayers !== undefined ? { replaceLayers } : undefined
    });
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    await axios.delete(`/template/${encodeURIComponent(templateId)}`, {
      headers: this.headers
    });
  }

  async duplicateTemplate(templateId: string, name?: string) {
    let response = await axios.post(
      `/template/${encodeURIComponent(templateId)}/duplicate`,
      {},
      {
        params: name ? { name } : undefined,
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async cloneTemplate(templateId: string) {
    let response = await axios.post(
      `/template/${encodeURIComponent(templateId)}/clone`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getTemplateLayers(templateId: string, includeLockedLayers?: boolean) {
    let response = await axios.get(`/template/${encodeURIComponent(templateId)}/layers`, {
      headers: this.headers,
      params: includeLockedLayers !== undefined ? { includeLockedLayers } : undefined
    });
    return expectArray(response.data);
  }

  async addTemplateTags(templateId: string, tags: string[]) {
    let response = await axios.post(`/template/${encodeURIComponent(templateId)}/tags`, tags, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async removeTemplateTags(templateId: string, tags: string[]) {
    let response = await axios.delete(`/template/${encodeURIComponent(templateId)}/tags`, {
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      data: tags
    });
    return response.data;
  }

  async listGalleryTemplates(params?: {
    query?: string;
    category?: string;
    tags?: string;
    page?: number;
    limit?: number;
    width?: number;
    height?: number;
    includeLayers?: boolean;
  }) {
    let response = await axios.get('/templates/gallery', {
      headers: this.headers,
      params
    });
    return expectArray(response.data);
  }

  async getTemplatePages(templateId: string, includeLockedLayers?: boolean) {
    let response = await axios.get(`/template/${encodeURIComponent(templateId)}/pages`, {
      headers: this.headers,
      params: includeLockedLayers !== undefined ? { includeLockedLayers } : undefined
    });
    return expectArray(response.data);
  }

  async createTemplateFromRender(renderId: string) {
    let response = await axios.post(
      `/template/from-render/${encodeURIComponent(renderId)}`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== Renders ====================

  async createRender(body: {
    template?: string;
    templates?: string[];
    format?: string;
    name?: string;
    externalId?: string;
    async?: boolean;
    webhookUrl?: string;
    transparent?: boolean;
    background?: string;
    width?: number;
    height?: number;
    scale?: number;
    flatten?: boolean;
    cmyk?: boolean;
    duration?: number;
    fps?: number;
    layers?: Record<string, any>;
    pages?: any[];
    merge?: boolean;
    zip?: boolean;
  }) {
    // Convert camelCase to snake_case for API compatibility
    let apiBody: Record<string, any> = {};
    if (body.template) apiBody.template = body.template;
    if (body.templates) apiBody.templates = body.templates;
    if (body.format) apiBody.format = body.format;
    if (body.name) apiBody.name = body.name;
    if (body.externalId) apiBody.external_id = body.externalId;
    if (body.async !== undefined) apiBody.async = body.async;
    if (body.webhookUrl) apiBody.webhook_url = body.webhookUrl;
    if (body.transparent !== undefined) apiBody.transparent = body.transparent;
    if (body.background) apiBody.background = body.background;
    if (body.width) apiBody.width = body.width;
    if (body.height) apiBody.height = body.height;
    if (body.scale) apiBody.scale = body.scale;
    if (body.flatten !== undefined) apiBody.flatten = body.flatten;
    if (body.cmyk !== undefined) apiBody.cmyk = body.cmyk;
    if (body.duration) apiBody.duration = body.duration;
    if (body.fps) apiBody.fps = body.fps;
    if (body.layers) apiBody.layers = body.layers;
    if (body.pages) apiBody.pages = body.pages;
    if (body.merge !== undefined) apiBody.merge = body.merge;
    if (body.zip !== undefined) apiBody.zip = body.zip;

    let response = await axios.post('/render', apiBody, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async listRenders() {
    let response = await axios.get('/renders', { headers: this.headers });
    return expectArray(response.data);
  }

  async getRender(renderId: string) {
    let response = await axios.get(`/render/${encodeURIComponent(renderId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteRender(renderId: string) {
    await axios.delete(`/render/${encodeURIComponent(renderId)}`, { headers: this.headers });
  }

  async duplicateRender(renderId: string) {
    let response = await axios.post(
      `/render/${encodeURIComponent(renderId)}/duplicate`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async mergeRenders(body: { ids: string[]; urls?: string[]; host?: boolean; name?: string }) {
    let response = await axios.post('/render/merge', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      responseType: body.host === true ? 'json' : 'stream',
      // Direct PDF limits are enforced while consuming the stream, after observing status.
      maxContentLength: body.host === true ? 50 * 1024 * 1024 : -1,
      ...(body.host === true ? {} : { validateStatus: () => true })
    });
    if (body.host !== true && (response.status < 200 || response.status >= 300)) {
      await rejectMergeResponse(response.data, response.status, response.statusText);
    }
    return response;
  }

  // ==================== Folders ====================

  async listFolders(params?: { query?: string; page?: number; limit?: number }) {
    let response = await axios.get('/folders', {
      headers: this.headers,
      params
    });
    return expectArray(response.data);
  }

  async createFolder(name: string) {
    let response = await axios.post(
      '/folder',
      { name },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async updateFolder(folderId: string, name: string) {
    let response = await axios.put(
      `/folder/${encodeURIComponent(folderId)}`,
      { name },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteFolder(folderId: string) {
    await axios.delete(`/folder/${encodeURIComponent(folderId)}`, { headers: this.headers });
  }

  async moveTemplateToFolder(folderId: string, templateId: string) {
    await axios.put(
      `/folder/${encodeURIComponent(folderId)}/template/${encodeURIComponent(templateId)}`,
      {},
      {
        headers: this.headers
      }
    );
  }

  async moveRenderToFolder(folderId: string, renderId: string) {
    await axios.put(
      `/folder/${encodeURIComponent(folderId)}/render/${encodeURIComponent(renderId)}`,
      {},
      {
        headers: this.headers
      }
    );
  }

  async listFolderTemplates(
    folderId: string,
    params?: {
      query?: string;
      page?: number;
      limit?: number;
      width?: number;
      height?: number;
      tags?: string;
      includeLayers?: boolean;
    }
  ) {
    let response = await axios.get(`/folder/${encodeURIComponent(folderId)}/templates`, {
      headers: this.headers,
      params
    });
    return expectArray(response.data);
  }

  async listFolderRenders(
    folderId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ) {
    let response = await axios.get(`/folder/${encodeURIComponent(folderId)}/renders`, {
      headers: this.headers,
      params
    });
    return expectArray(response.data);
  }

  // ==================== Uploads ====================

  async listUploads(params?: {
    query?: string;
    tags?: string;
    page?: number;
    limit?: number;
  }) {
    let response = await axios.get('/uploads', {
      headers: this.headers,
      params
    });
    return expectArray(response.data);
  }

  async deleteUploads(ids: string[]) {
    let queryString = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    let response = await axios.delete(`/uploads?${queryString}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== Fonts ====================

  async listFonts() {
    let response = await axios.get('/fonts', { headers: this.headers });
    return expectArray(response.data);
  }

  async deleteFonts(fontNames: string[]) {
    let queryString = fontNames.map(name => `fonts=${encodeURIComponent(name)}`).join('&');
    let response = await axios.delete(`/fonts?${queryString}`, {
      headers: this.headers
    });
    return response.data;
  }
}
