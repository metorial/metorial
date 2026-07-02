import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://api.templated.io/v1'
});

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
    return response.data;
  }

  async getTemplate(
    templateId: string,
    params?: {
      includeLayers?: boolean;
      includePages?: boolean;
    }
  ) {
    let response = await axios.get(`/template/${templateId}`, {
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
      layers?: any[];
      pages?: any[];
    },
    replaceLayers?: boolean
  ) {
    let response = await axios.put(`/template/${templateId}`, body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      params: replaceLayers !== undefined ? { replaceLayers } : undefined
    });
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    await axios.delete(`/template/${templateId}`, { headers: this.headers });
  }

  async duplicateTemplate(templateId: string, name?: string) {
    let response = await axios.post(
      `/template/${templateId}/duplicate`,
      name ? { name } : {},
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async cloneTemplate(templateId: string) {
    let response = await axios.post(
      `/template/${templateId}/clone`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getTemplateLayers(templateId: string, includeLockedLayers?: boolean) {
    let response = await axios.get(`/template/${templateId}/layers`, {
      headers: this.headers,
      params: includeLockedLayers !== undefined ? { includeLockedLayers } : undefined
    });
    return response.data;
  }

  async addTemplateTags(templateId: string, tags: string[]) {
    let response = await axios.post(`/template/${templateId}/tags`, tags, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async removeTemplateTags(templateId: string, tags: string[]) {
    let response = await axios.delete(`/template/${templateId}/tags`, {
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

    let response = await axios.post('/render', apiBody, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  async listRenders() {
    let response = await axios.get('/renders', { headers: this.headers });
    return response.data;
  }

  async getRender(renderId: string) {
    let response = await axios.get(`/render/${renderId}`, { headers: this.headers });
    return response.data;
  }

  async deleteRender(renderId: string) {
    await axios.delete(`/render/${renderId}`, { headers: this.headers });
  }

  async duplicateRender(renderId: string) {
    let response = await axios.post(
      `/render/${renderId}/duplicate`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async mergeRenders(body: { ids: string[]; urls?: string[]; host?: boolean }) {
    let response = await axios.post('/render/merge', body, {
      headers: { ...this.headers, 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ==================== Folders ====================

  async listFolders(params?: { query?: string; page?: number; limit?: number }) {
    let response = await axios.get('/folders', {
      headers: this.headers,
      params
    });
    return response.data;
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
      `/folder/${folderId}`,
      { name },
      {
        headers: { ...this.headers, 'Content-Type': 'application/json' }
      }
    );
    return response.data;
  }

  async deleteFolder(folderId: string) {
    await axios.delete(`/folder/${folderId}`, { headers: this.headers });
  }

  async moveTemplateToFolder(folderId: string, templateId: string) {
    await axios.put(
      `/folder/${folderId}/template/${templateId}`,
      {},
      {
        headers: this.headers
      }
    );
  }

  async moveRenderToFolder(folderId: string, renderId: string) {
    await axios.put(
      `/folder/${folderId}/render/${renderId}`,
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
    let response = await axios.get(`/folder/${folderId}/templates`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async listFolderRenders(
    folderId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ) {
    let response = await axios.get(`/folder/${folderId}/renders`, {
      headers: this.headers,
      params
    });
    return response.data;
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
    return response.data;
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
    return response.data;
  }

  async deleteFonts(fontNames: string[]) {
    let queryString = fontNames.map(name => `fonts=${encodeURIComponent(name)}`).join('&');
    let response = await axios.delete(`/fonts?${queryString}`, {
      headers: this.headers
    });
    return response.data;
  }
}
