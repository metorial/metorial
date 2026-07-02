import { createAxios } from 'slates';

let REGION_BASE_URLS: Record<string, string> = {
  default: 'https://api.craftmypdf.com/v1',
  us: 'https://api-us.craftmypdf.com/v1',
  eu: 'https://api-de.craftmypdf.com/v1',
  au: 'https://api-au.craftmypdf.com/v1'
};

export interface CreatePdfParams {
  templateId: string;
  data?: Record<string, unknown>;
  loadDataFrom?: string;
  version?: number;
  exportType?: 'json' | 'file';
  expiration?: number;
  outputFile?: string;
  imageResampleRes?: number;
  cloudStorage?: number;
  passwordProtected?: boolean;
  password?: string;
  pdfVersion?: string;
  resizeImages?: boolean;
  resizeMaxWidth?: number;
  resizeMaxHeight?: number;
  resizeFormat?: 'jpeg' | 'png';
  paging?: 'continuous' | 'reset';
}

export interface CreateAsyncPdfParams extends CreatePdfParams {
  webhookUrl: string;
}

export interface CreateImageParams {
  templateId: string;
  data?: Record<string, unknown>;
  loadDataFrom?: string;
  version?: number;
  exportType?: 'json' | 'file';
  expiration?: number;
  outputFile?: string;
  outputType?: 'jpeg' | 'png';
}

export interface MergeTemplatesParams {
  templates: Array<{ templateId: string; data?: Record<string, unknown> }>;
  data?: Record<string, unknown>;
  paging?: 'continuous' | 'reset';
  exportType?: 'json' | 'file';
  expiration?: number;
  outputFile?: string;
}

export interface MergePdfUrlsParams {
  urls: string[];
  expiration?: number;
  outputFile?: string;
}

export interface WatermarkParams {
  url: string;
  text: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  hexColor?: string;
  fontFamily?: string;
  expiration?: number;
}

export interface AddTextToPdfParams {
  url: string;
  textSettings: Array<{
    pageSelector?: string;
    text: string;
    position?: string;
    offsetX?: number;
    offsetY?: number;
    fontSize?: number;
    hexColor?: string;
    fontFamily?: string;
    opacity?: number;
    rotation?: number;
  }>;
  expiration?: number;
}

export interface UpdatePdfFieldsParams {
  url: string;
  fields: Array<{
    fieldName: string;
    value: string;
    readOnly?: boolean;
    fontSize?: number;
  }>;
  expiration?: number;
}

export interface CreateEditorSessionParams {
  templateId: string;
  expiration?: number;
  canSave?: boolean;
  canCreatePDF?: boolean;
  canViewSettings?: boolean;
  canPreview?: boolean;
  canEditJSON?: boolean;
  canShowHeader?: boolean;
  canShowLayers?: boolean;
  canShowPropertyPanel?: boolean;
  canShowHelp?: boolean;
  canShowData?: boolean;
  canShowExpressionDoc?: boolean;
  canShowPropertyBinding?: boolean;
  canShowBackURL?: boolean;
  jsonMode?: number;
  backURL?: string;
}

export interface NewTemplateParams {
  templateId: string;
  name?: string;
  version?: number;
  groupName?: string;
}

export interface UpdateTemplateParams {
  templateId: string;
  name?: string;
  json?: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region?: string }) {
    let baseURL = REGION_BASE_URLS[config.region || 'default'] || REGION_BASE_URLS.default;
    this.http = createAxios({
      baseURL,
      headers: {
        'X-API-KEY': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async createPdf(params: CreatePdfParams) {
    let body: Record<string, unknown> = {
      template_id: params.templateId
    };
    if (params.data !== undefined) body.data = params.data;
    if (params.loadDataFrom) body.load_data_from = params.loadDataFrom;
    if (params.version !== undefined) body.version = params.version;
    if (params.exportType) body.export_type = params.exportType;
    if (params.expiration !== undefined) body.expiration = params.expiration;
    if (params.outputFile) body.output_file = params.outputFile;
    if (params.imageResampleRes !== undefined)
      body.image_resample_res = params.imageResampleRes;
    if (params.cloudStorage !== undefined) body.cloud_storage = params.cloudStorage;
    if (params.passwordProtected !== undefined)
      body.password_protected = params.passwordProtected;
    if (params.password) body.password = params.password;
    if (params.pdfVersion) body.pdf_version = params.pdfVersion;
    if (params.resizeImages !== undefined) body.resize_images = params.resizeImages;
    if (params.resizeMaxWidth !== undefined) body.resize_max_width = params.resizeMaxWidth;
    if (params.resizeMaxHeight !== undefined) body.resize_max_height = params.resizeMaxHeight;
    if (params.resizeFormat) body.resize_format = params.resizeFormat;
    if (params.paging) body.paging = params.paging;

    let response = await this.http.post('/create', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
    };
  }

  async createAsyncPdf(params: CreateAsyncPdfParams) {
    let body: Record<string, unknown> = {
      template_id: params.templateId,
      webhook_url: params.webhookUrl
    };
    if (params.data !== undefined) body.data = params.data;
    if (params.loadDataFrom) body.load_data_from = params.loadDataFrom;
    if (params.version !== undefined) body.version = params.version;
    if (params.exportType) body.export_type = params.exportType;
    if (params.expiration !== undefined) body.expiration = params.expiration;
    if (params.outputFile) body.output_file = params.outputFile;
    if (params.imageResampleRes !== undefined)
      body.image_resample_res = params.imageResampleRes;
    if (params.cloudStorage !== undefined) body.cloud_storage = params.cloudStorage;
    if (params.passwordProtected !== undefined)
      body.password_protected = params.passwordProtected;
    if (params.password) body.password = params.password;
    if (params.pdfVersion) body.pdf_version = params.pdfVersion;
    if (params.resizeImages !== undefined) body.resize_images = params.resizeImages;
    if (params.resizeMaxWidth !== undefined) body.resize_max_width = params.resizeMaxWidth;
    if (params.resizeMaxHeight !== undefined) body.resize_max_height = params.resizeMaxHeight;
    if (params.resizeFormat) body.resize_format = params.resizeFormat;
    if (params.paging) body.paging = params.paging;

    let response = await this.http.post('/create-async', body);
    return response.data as {
      status: string;
      transaction_ref: string;
    };
  }

  async createImage(params: CreateImageParams) {
    let body: Record<string, unknown> = {
      template_id: params.templateId
    };
    if (params.data !== undefined) body.data = params.data;
    if (params.loadDataFrom) body.load_data_from = params.loadDataFrom;
    if (params.version !== undefined) body.version = params.version;
    if (params.exportType) body.export_type = params.exportType;
    if (params.expiration !== undefined) body.expiration = params.expiration;
    if (params.outputFile) body.output_file = params.outputFile;
    if (params.outputType) body.output_type = params.outputType;

    let response = await this.http.post('/create-image', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
    };
  }

  async createMerge(params: MergeTemplatesParams) {
    let body: Record<string, unknown> = {
      templates: params.templates.map(t => ({
        template_id: t.templateId,
        ...(t.data ? { data: t.data } : {})
      }))
    };
    if (params.data !== undefined) body.data = params.data;
    if (params.paging) body.paging = params.paging;
    if (params.exportType) body.export_type = params.exportType;
    if (params.expiration !== undefined) body.expiration = params.expiration;
    if (params.outputFile) body.output_file = params.outputFile;

    let response = await this.http.post('/create-merge', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
    };
  }

  async mergePdfUrls(params: MergePdfUrlsParams) {
    let body: Record<string, unknown> = {
      urls: params.urls
    };
    if (params.expiration !== undefined) body.expiration = params.expiration;
    if (params.outputFile) body.output_file = params.outputFile;

    let response = await this.http.post('/merge-pdfs', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
    };
  }

  async addWatermark(params: WatermarkParams) {
    let body: Record<string, unknown> = {
      url: params.url,
      text: params.text
    };
    if (params.fontSize !== undefined) body.font_size = params.fontSize;
    if (params.opacity !== undefined) body.opacity = params.opacity;
    if (params.rotation !== undefined) body.rotation = params.rotation;
    if (params.hexColor) body.hex_color = params.hexColor;
    if (params.fontFamily) body.font_family = params.fontFamily;
    if (params.expiration !== undefined) body.expiration = params.expiration;

    let response = await this.http.post('/add-watermark', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
    };
  }

  async addTextToPdf(params: AddTextToPdfParams) {
    let body: Record<string, unknown> = {
      url: params.url,
      textSettings: params.textSettings.map(ts => {
        let setting: Record<string, unknown> = {
          text: ts.text
        };
        if (ts.pageSelector) setting.page_selector = ts.pageSelector;
        if (ts.position) setting.position = ts.position;
        if (ts.offsetX !== undefined) setting.offset_x = ts.offsetX;
        if (ts.offsetY !== undefined) setting.offset_y = ts.offsetY;
        if (ts.fontSize !== undefined) setting.font_size = ts.fontSize;
        if (ts.hexColor) setting.hex_color = ts.hexColor;
        if (ts.fontFamily) setting.font_family = ts.fontFamily;
        if (ts.opacity !== undefined) setting.opacity = ts.opacity;
        if (ts.rotation !== undefined) setting.rotation = ts.rotation;
        return setting;
      })
    };
    if (params.expiration !== undefined) body.expiration = params.expiration;

    let response = await this.http.post('/add-text-to-pdf', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
    };
  }

  async updatePdfFields(params: UpdatePdfFieldsParams) {
    let body: Record<string, unknown> = {
      url: params.url,
      fields: params.fields.map(f => {
        let field: Record<string, unknown> = {
          id: f.fieldName,
          value: f.value
        };
        if (f.readOnly !== undefined) field.readOnly = f.readOnly;
        if (f.fontSize !== undefined) field.fontSize = f.fontSize;
        return field;
      })
    };
    if (params.expiration !== undefined) body.expiration = params.expiration;

    let response = await this.http.post('/update-pdf-fields', body);
    return response.data as {
      status: string;
      file: string;
      transaction_ref: string;
      fields: Array<{ id: string; status: string }>;
    };
  }

  async getPdfInfo(url: string) {
    let response = await this.http.get('/get-pdf-info', {
      params: { url }
    });
    return response.data as {
      status: string;
      page_count: number;
      pages: Array<{ width: number; height: number }>;
      fields: Array<{ name: string; type: string; value: string }>;
    };
  }

  async listTemplates(params?: { limit?: number; offset?: number; groupName?: string }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.groupName) queryParams.group_name = params.groupName;

    let response = await this.http.get('/list-templates', { params: queryParams });
    return response.data as {
      status: string;
      templates: Array<{
        template_id: string;
        name: string;
        group_name: string;
        created_at: string;
        updated_at: string;
      }>;
    };
  }

  async getTemplate(templateId: string, version?: number) {
    let queryParams: Record<string, unknown> = { template_id: templateId };
    if (version !== undefined) queryParams.version = version;

    let response = await this.http.get('/get-template', { params: queryParams });
    return response.data as {
      status: string;
      template_id: string;
      name: string;
      group_name: string;
      json: string;
      body: unknown;
    };
  }

  async createTemplate(params: NewTemplateParams) {
    let body: Record<string, unknown> = {
      template_id: params.templateId
    };
    if (params.name) body.name = params.name;
    if (params.version !== undefined) body.version = params.version;
    if (params.groupName) body.group_name = params.groupName;

    let response = await this.http.post('/new-template-from', body);
    return response.data as {
      status: string;
      template_id: string;
      name: string;
    };
  }

  async updateTemplate(params: UpdateTemplateParams) {
    let body: Record<string, unknown> = {
      template_id: params.templateId
    };
    if (params.name) body.name = params.name;
    if (params.json) body.json = params.json;

    let response = await this.http.post('/update-template', body);
    return response.data as {
      status: string;
    };
  }

  async deleteTemplate(templateId: string) {
    let response = await this.http.get('/delete-template', {
      params: { template_id: templateId }
    });
    return response.data as {
      status: string;
    };
  }

  async createEditorSession(params: CreateEditorSessionParams) {
    let body: Record<string, unknown> = {
      template_id: params.templateId
    };
    if (params.expiration !== undefined) body.expiration = params.expiration;
    if (params.canSave !== undefined) body.canSave = params.canSave;
    if (params.canCreatePDF !== undefined) body.canCreatePDF = params.canCreatePDF;
    if (params.canViewSettings !== undefined) body.canViewSettings = params.canViewSettings;
    if (params.canPreview !== undefined) body.canPreview = params.canPreview;
    if (params.canEditJSON !== undefined) body.canEditJSON = params.canEditJSON;
    if (params.canShowHeader !== undefined) body.canShowHeader = params.canShowHeader;
    if (params.canShowLayers !== undefined) body.canShowLayers = params.canShowLayers;
    if (params.canShowPropertyPanel !== undefined)
      body.canShowPropertyPanel = params.canShowPropertyPanel;
    if (params.canShowHelp !== undefined) body.canShowHelp = params.canShowHelp;
    if (params.canShowData !== undefined) body.canShowData = params.canShowData;
    if (params.canShowExpressionDoc !== undefined)
      body.canShowExpressionDoc = params.canShowExpressionDoc;
    if (params.canShowPropertyBinding !== undefined)
      body.canShowPropertyBinding = params.canShowPropertyBinding;
    if (params.canShowBackURL !== undefined) body.canShowBackURL = params.canShowBackURL;
    if (params.jsonMode !== undefined) body.jsonMode = params.jsonMode;
    if (params.backURL) body.backURL = params.backURL;

    let response = await this.http.post('/create-editor-session', body);
    return response.data as {
      status: string;
      url: string;
      token_uuid: string;
    };
  }

  async deactivateEditorSession(tokenUuid: string) {
    let response = await this.http.post('/deactivate-editor-session', {
      token_uuid: tokenUuid
    });
    return response.data as {
      status: string;
    };
  }

  async getAccountInfo() {
    let response = await this.http.get('/get-account-info');
    return response.data as {
      status: string;
      account_name: string;
      credits: number;
      team_id: string;
      subscription: string;
    };
  }

  async listTransactions(params?: { limit?: number; offset?: number }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;

    let response = await this.http.get('/list-transactions', { params: queryParams });
    return response.data as {
      status: string;
      transactions: Array<{
        transaction_ref: string;
        template_id: string;
        credits: number;
        created_at: string;
        operation: string;
        file: string;
      }>;
    };
  }
}
