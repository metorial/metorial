import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
  carboneVersion: number;
}

export interface UploadTemplateParams {
  template: string;
  versioning?: boolean;
  templateId?: string;
  name?: string;
  comment?: string;
  tags?: string[];
  category?: string;
  sample?: Record<string, unknown>[];
  deployedAt?: number;
  expireAt?: number;
}

export interface UploadTemplateResponse {
  templateId: string;
  versionId: string;
  type: string;
  size: number;
  createdAt: number;
}

export interface TemplateListItem {
  templateId: string;
  versionId: string;
  deployedAt: number;
  createdAt: number;
  expireAt: number;
  size: number;
  type: string;
  name: string;
  category: string;
  comment: string;
  tags: string[];
  origin: number;
}

export interface ListTemplatesParams {
  templateId?: string;
  versionId?: string;
  category?: string;
  origin?: number;
  includeVersions?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface ListTemplatesResponse {
  templates: TemplateListItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface UpdateTemplateParams {
  name?: string;
  comment?: string;
  tags?: string[];
  category?: string;
  deployedAt?: number;
  expireAt?: number;
}

export interface RenderDocumentParams {
  templateIdOrVersionId: string;
  data: Record<string, unknown>;
  convertTo?: string | Record<string, unknown>;
  converter?: string;
  timezone?: string;
  lang?: string;
  complement?: Record<string, unknown>;
  variableStr?: string;
  reportName?: string;
  enum?: Record<string, unknown>;
  translations?: Record<string, unknown>;
  currencySource?: string;
  currencyTarget?: string;
  currencyRates?: Record<string, unknown>;
  hardRefresh?: boolean;
  batchSplitBy?: string;
  batchOutput?: string;
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  template?: string;
}

export interface RenderDocumentResponse {
  renderId: string;
}

export interface CategoryItem {
  name: string;
}

export interface TagItem {
  name: string;
}

let headerValueToString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return undefined;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private clientConfig: ClientConfig) {
    this.axios = createAxios({
      baseURL: clientConfig.baseUrl,
      headers: {
        Authorization: `Bearer ${clientConfig.token}`,
        'carbone-version': String(clientConfig.carboneVersion)
      }
    });
  }

  async uploadTemplate(params: UploadTemplateParams): Promise<UploadTemplateResponse> {
    let body: Record<string, unknown> = {
      template: params.template
    };

    if (params.versioning !== undefined) body.versioning = params.versioning;
    if (params.templateId) body.id = params.templateId;
    if (params.name) body.name = params.name;
    if (params.comment) body.comment = params.comment;
    if (params.tags) body.tags = params.tags;
    if (params.category) body.category = params.category;
    if (params.sample) body.sample = params.sample;
    if (params.deployedAt !== undefined) body.deployedAt = params.deployedAt;
    if (params.expireAt !== undefined) body.expireAt = params.expireAt;

    let response = await this.axios.post('/template', body, {
      headers: { 'Content-Type': 'application/json' }
    });

    let data = response.data.data;
    return {
      templateId: data.id,
      versionId: data.versionId,
      type: data.type,
      size: data.size,
      createdAt: data.createdAt
    };
  }

  async downloadTemplate(
    templateIdOrVersionId: string
  ): Promise<{ content: ArrayBuffer; contentType: string; filename: string }> {
    let response = await this.axios.get(`/template/${templateIdOrVersionId}`, {
      responseType: 'arraybuffer'
    });

    let contentDisposition =
      headerValueToString(response.headers['content-disposition']) || '';
    let filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    let filename = filenameMatch ? filenameMatch[1]! : 'template';

    return {
      content: response.data,
      contentType:
        headerValueToString(response.headers['content-type']) || 'application/octet-stream',
      filename
    };
  }

  async deleteTemplate(templateIdOrVersionId: string): Promise<void> {
    await this.axios.delete(`/template/${templateIdOrVersionId}`);
  }

  async updateTemplate(
    templateIdOrVersionId: string,
    params: UpdateTemplateParams
  ): Promise<void> {
    let body: Record<string, unknown> = {};

    if (params.name !== undefined) body.name = params.name;
    if (params.comment !== undefined) body.comment = params.comment;
    if (params.tags !== undefined) body.tags = params.tags;
    if (params.category !== undefined) body.category = params.category;
    if (params.deployedAt !== undefined) body.deployedAt = params.deployedAt;
    if (params.expireAt !== undefined) body.expireAt = params.expireAt;

    await this.axios.patch(`/template/${templateIdOrVersionId}`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async listTemplates(params: ListTemplatesParams = {}): Promise<ListTemplatesResponse> {
    let queryParams: Record<string, string> = {};

    if (params.templateId) queryParams.id = params.templateId;
    if (params.versionId) queryParams.versionId = params.versionId;
    if (params.category) queryParams.category = params.category;
    if (params.origin !== undefined) queryParams.origin = String(params.origin);
    if (params.includeVersions !== undefined)
      queryParams.includeVersions = String(params.includeVersions);
    if (params.search) queryParams.search = params.search;
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;

    let response = await this.axios.get('/templates', { params: queryParams });

    let data = response.data;
    return {
      templates: (data.data || []).map((t: any) => ({
        templateId: t.id,
        versionId: t.versionId,
        deployedAt: t.deployedAt,
        createdAt: t.createdAt,
        expireAt: t.expireAt,
        size: t.size,
        type: t.type,
        name: t.name,
        category: t.category,
        comment: t.comment,
        tags: t.tags || [],
        origin: t.origin
      })),
      hasMore: data.hasMore || false,
      nextCursor: data.nextCursor || null
    };
  }

  async listCategories(): Promise<CategoryItem[]> {
    let response = await this.axios.get('/templates/categories');
    return response.data.data || [];
  }

  async listTags(): Promise<TagItem[]> {
    let response = await this.axios.get('/templates/tags');
    return response.data.data || [];
  }

  async renderDocument(params: RenderDocumentParams): Promise<RenderDocumentResponse> {
    let body: Record<string, unknown> = {
      data: params.data
    };

    if (params.convertTo !== undefined) body.convertTo = params.convertTo;
    if (params.converter) body.converter = params.converter;
    if (params.timezone) body.timezone = params.timezone;
    if (params.lang) body.lang = params.lang;
    if (params.complement) body.complement = params.complement;
    if (params.variableStr) body.variableStr = params.variableStr;
    if (params.reportName) body.reportName = params.reportName;
    if (params.enum) body.enum = params.enum;
    if (params.translations) body.translations = params.translations;
    if (params.currencySource) body.currencySource = params.currencySource;
    if (params.currencyTarget) body.currencyTarget = params.currencyTarget;
    if (params.currencyRates) body.currencyRates = params.currencyRates;
    if (params.hardRefresh !== undefined) body.hardRefresh = params.hardRefresh;
    if (params.batchSplitBy) body.batchSplitBy = params.batchSplitBy;
    if (params.batchOutput) body.batchOutput = params.batchOutput;
    if (params.template) body.template = params.template;

    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (params.webhookUrl) {
      headers['carbone-webhook-url'] = params.webhookUrl;
    }

    if (params.webhookHeaders) {
      for (let [key, value] of Object.entries(params.webhookHeaders)) {
        headers[`carbone-webhook-header-${key}`] = value;
      }
    }

    let response = await this.axios.post(`/render/${params.templateIdOrVersionId}`, body, {
      headers
    });

    return {
      renderId: response.data.data.renderId
    };
  }

  async getStatus(): Promise<{ success: boolean; message: string }> {
    let statusAxios = createAxios({
      baseURL: this.clientConfig.baseUrl
    });

    let response = await statusAxios.get('/status');
    return {
      success: response.data.success ?? true,
      message: response.data.message ?? 'OK'
    };
  }
}
