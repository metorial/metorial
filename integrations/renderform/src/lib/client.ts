import { createAxios } from 'slates';

let BASE_URL = 'https://get.renderform.io';

export interface RenderRequest {
  template: string;
  data?: Record<string, string>;
  fileName?: string;
  webhookUrl?: string;
  version?: string;
  metadata?: Record<string, unknown>;
  batchName?: string;
  width?: number;
  height?: number;
  waitTime?: number;
}

export interface RenderResponse {
  requestId: string;
  href: string;
}

export interface ScreenshotRequest {
  url: string;
  width: number;
  height: number;
  waitTime?: number;
  webhookUrl?: string;
}

export interface ScreenshotResponse {
  requestId: string;
  href: string;
}

export interface TemplateProperty {
  key: string;
  type: string;
  defaultValue: string;
  componentId: string;
  componentType: string;
  property: string;
}

export interface TemplateEntry {
  identifier: string;
  name: string;
  preview?: string;
  scaleFactor?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  createdBy?: string;
  editor?: string;
  tags?: string[];
}

export interface TemplateDetails extends TemplateEntry {
  properties?: TemplateProperty[];
  quality?: number;
}

export interface RenderResultItem {
  identifier: string;
  href: string;
  width?: number;
  height?: number;
  templateName?: string;
  createdAt?: string;
}

export interface PaginatedResults<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  pageNumber: number;
  pageSize: number;
  first: boolean;
  last: boolean;
}

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': token,
        'Content-Type': 'application/json'
      }
    });
  }

  async renderImage(request: RenderRequest): Promise<RenderResponse> {
    let response = await this.axios.post('/api/v2/render', request);
    return response.data;
  }

  async takeScreenshot(request: ScreenshotRequest): Promise<ScreenshotResponse> {
    let response = await this.axios.post('/api/v1/screenshots', request);
    return response.data;
  }

  async listTemplates(params?: {
    name?: string;
    tags?: string[];
    page?: number;
    size?: number;
  }): Promise<TemplateEntry[]> {
    let queryParams: Record<string, string | string[]> = {};
    if (params?.name) queryParams.name = params.name;
    if (params?.tags && params.tags.length > 0) queryParams.tags = params.tags;
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.size !== undefined) queryParams.size = String(params.size);

    let response = await this.axios.get('/api/v2/my-templates', { params: queryParams });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<TemplateDetails> {
    let response = await this.axios.get(`/api/v2/my-templates/${templateId}`);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/api/v2/my-templates/${templateId}`);
  }

  async listResults(params?: {
    page?: number;
    size?: number;
    template?: string;
  }): Promise<PaginatedResults<RenderResultItem>> {
    let queryParams: Record<string, string> = {};
    if (params?.page !== undefined) queryParams.page = String(params.page);
    if (params?.size !== undefined) queryParams.size = String(params.size);
    if (params?.template) queryParams.template = params.template;

    let response = await this.axios.get('/api/v2/results', { params: queryParams });
    return response.data;
  }

  async getResult(identifier: string): Promise<RenderResultItem> {
    let response = await this.axios.get(`/api/v2/results/${identifier}`);
    return response.data;
  }

  async deleteResult(identifier: string): Promise<void> {
    await this.axios.delete(`/api/v2/results/${identifier}`);
  }
}
