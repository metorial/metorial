import { createAxios } from 'slates';

export interface CreateImageParams {
  html?: string;
  css?: string;
  url?: string;
  googleFonts?: string;
  msDelay?: number;
  deviceScale?: number;
  renderWhenReady?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  selector?: string;
  fullScreen?: boolean;
  colorScheme?: string;
  timezone?: string;
  blockConsentBanners?: boolean;
  templateId?: string;
  templateVersion?: number;
  templateValues?: Record<string, string>;
}

export interface ImageResult {
  imageId: string;
  url: string;
}

export interface ImageListItem {
  imageId: string;
  url: string;
  createdAt: string;
  html?: string;
  css?: string;
  googleFonts?: string;
  msDelay?: number;
  deviceScale?: number;
  selector?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  templateId?: string;
  templateVersion?: number;
}

export interface CreateTemplateParams {
  html: string;
  css?: string;
  name?: string;
  description?: string;
  googleFonts?: string;
  selector?: string;
  msDelay?: number;
  deviceScale?: number;
  renderWhenReady?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  colorScheme?: string;
  timezone?: string;
}

export interface TemplateResult {
  templateId: string;
  templateVersion: number;
}

export interface TemplateListItem {
  templateId: string;
  name?: string;
  description?: string;
  html: string;
  css?: string;
  googleFonts?: string;
  msDelay?: number;
  deviceScale?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  renderCount?: number;
  createdAt?: string;
}

export class Client {
  private axios;

  constructor(credentials: { userId: string; token: string }) {
    this.axios = createAxios({
      baseURL: 'https://hcti.io/v1',
      auth: {
        username: credentials.userId,
        password: credentials.token
      }
    });
  }

  async createImage(params: CreateImageParams): Promise<ImageResult> {
    let body: Record<string, unknown> = {};

    if (params.templateId) {
      if (params.templateValues) {
        body.template_values = params.templateValues;
      }
    } else {
      if (params.html) body.html = params.html;
      if (params.css) body.css = params.css;
      if (params.url) body.url = params.url;
    }

    if (params.googleFonts) body.google_fonts = params.googleFonts;
    if (params.msDelay !== undefined) body.ms_delay = params.msDelay;
    if (params.deviceScale !== undefined) body.device_scale = params.deviceScale;
    if (params.renderWhenReady !== undefined) body.render_when_ready = params.renderWhenReady;
    if (params.viewportWidth !== undefined) body.viewport_width = params.viewportWidth;
    if (params.viewportHeight !== undefined) body.viewport_height = params.viewportHeight;
    if (params.selector) body.selector = params.selector;
    if (params.fullScreen !== undefined) body.full_screen = params.fullScreen;
    if (params.colorScheme) body.color_scheme = params.colorScheme;
    if (params.timezone) body.timezone = params.timezone;
    if (params.blockConsentBanners !== undefined)
      body.block_consent_banners = params.blockConsentBanners;

    let endpoint = '/image';
    if (params.templateId) {
      endpoint = `/image/${params.templateId}`;
      if (params.templateVersion !== undefined) {
        endpoint += `/${params.templateVersion}`;
      }
    }

    let response = await this.axios.post(endpoint, body);
    let data = response.data as { url: string; id: string };

    return {
      imageId: data.id,
      url: data.url
    };
  }

  async listImages(page?: number, perPage?: number): Promise<ImageListItem[]> {
    let params: Record<string, unknown> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;

    let response = await this.axios.get('/image', { params });
    let items = response.data as Record<string, unknown>[];

    return items.map(item => this.mapImageItem(item));
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.axios.delete(`/image/${imageId}`);
  }

  async deleteImagesBatch(imageIds: string[]): Promise<void> {
    await this.axios.delete('/image/batch', {
      data: { ids: imageIds }
    });
  }

  async createTemplate(params: CreateTemplateParams): Promise<TemplateResult> {
    let body: Record<string, unknown> = {
      html: params.html
    };

    if (params.css) body.css = params.css;
    if (params.name) body.name = params.name;
    if (params.description) body.description = params.description;
    if (params.googleFonts) body.google_fonts = params.googleFonts;
    if (params.selector) body.selector = params.selector;
    if (params.msDelay !== undefined) body.ms_delay = params.msDelay;
    if (params.deviceScale !== undefined) body.device_scale = params.deviceScale;
    if (params.renderWhenReady !== undefined) body.render_when_ready = params.renderWhenReady;
    if (params.viewportWidth !== undefined) body.viewport_width = params.viewportWidth;
    if (params.viewportHeight !== undefined) body.viewport_height = params.viewportHeight;
    if (params.colorScheme) body.color_scheme = params.colorScheme;
    if (params.timezone) body.timezone = params.timezone;

    let response = await this.axios.post('/template', body);
    let data = response.data as { template_id: string; template_version: number };

    return {
      templateId: data.template_id,
      templateVersion: data.template_version
    };
  }

  async updateTemplate(
    templateId: string,
    params: CreateTemplateParams
  ): Promise<TemplateResult> {
    let body: Record<string, unknown> = {
      html: params.html
    };

    if (params.css) body.css = params.css;
    if (params.name) body.name = params.name;
    if (params.description) body.description = params.description;
    if (params.googleFonts) body.google_fonts = params.googleFonts;
    if (params.selector) body.selector = params.selector;
    if (params.msDelay !== undefined) body.ms_delay = params.msDelay;
    if (params.deviceScale !== undefined) body.device_scale = params.deviceScale;
    if (params.renderWhenReady !== undefined) body.render_when_ready = params.renderWhenReady;
    if (params.viewportWidth !== undefined) body.viewport_width = params.viewportWidth;
    if (params.viewportHeight !== undefined) body.viewport_height = params.viewportHeight;
    if (params.colorScheme) body.color_scheme = params.colorScheme;
    if (params.timezone) body.timezone = params.timezone;

    let response = await this.axios.post(`/template/${templateId}`, body);
    let data = response.data as { template_id: string; template_version: number };

    return {
      templateId: data.template_id,
      templateVersion: data.template_version
    };
  }

  async listTemplates(): Promise<TemplateListItem[]> {
    let response = await this.axios.get('/template');
    let items = response.data as Record<string, unknown>[];

    return items.map(item => ({
      templateId: item.template_id as string,
      name: item.name as string | undefined,
      description: item.description as string | undefined,
      html: item.html as string,
      css: item.css as string | undefined,
      googleFonts: item.google_fonts as string | undefined,
      msDelay: item.ms_delay as number | undefined,
      deviceScale: item.device_scale as number | undefined,
      viewportWidth: item.viewport_width as number | undefined,
      viewportHeight: item.viewport_height as number | undefined,
      renderCount: item.render_count as number | undefined,
      createdAt: item.created_at as string | undefined
    }));
  }

  async getTemplateVersions(templateId: string): Promise<TemplateListItem[]> {
    let response = await this.axios.get(`/template/${templateId}`);
    let items = response.data as Record<string, unknown>[];

    return items.map(item => ({
      templateId: item.template_id as string,
      name: item.name as string | undefined,
      description: item.description as string | undefined,
      html: item.html as string,
      css: item.css as string | undefined,
      googleFonts: item.google_fonts as string | undefined,
      msDelay: item.ms_delay as number | undefined,
      deviceScale: item.device_scale as number | undefined,
      viewportWidth: item.viewport_width as number | undefined,
      viewportHeight: item.viewport_height as number | undefined,
      renderCount: item.render_count as number | undefined,
      createdAt: item.created_at as string | undefined
    }));
  }

  private mapImageItem(item: Record<string, unknown>): ImageListItem {
    return {
      imageId: item.id as string,
      url: item.url as string,
      createdAt: item.created_at as string,
      html: item.html as string | undefined,
      css: item.css as string | undefined,
      googleFonts: item.google_fonts as string | undefined,
      msDelay: item.ms_delay as number | undefined,
      deviceScale: item.device_scale as number | undefined,
      selector: item.selector as string | undefined,
      viewportWidth: item.viewport_width as number | undefined,
      viewportHeight: item.viewport_height as number | undefined,
      templateId: item.template_id as string | undefined,
      templateVersion: item.template_version as number | undefined
    };
  }
}
