import { createAxios } from 'slates';

export class AbyssaleClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.abyssale.com',
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Designs ──

  async listDesigns(params?: { categoryId?: string; type?: string }) {
    let queryParams: Record<string, string> = {};
    if (params?.categoryId) queryParams.category_id = params.categoryId;
    if (params?.type) queryParams.type = params.type;

    let response = await this.axios.get('/designs', { params: queryParams });
    return response.data as Array<{
      id: string;
      name: string;
      type: string;
      created_at: number;
      updated_at: number;
      preview_url: string;
      category_name: string | null;
    }>;
  }

  async getDesignFormatDetails(designId: string, formatSpecifier: string) {
    let response = await this.axios.get(`/designs/${designId}/formats/${formatSpecifier}`);
    return response.data as {
      id: string;
      uid: string;
      width: number;
      height: number;
      unit: string;
      preview_url: string;
      dynamic_image_url: string;
      design: Record<string, any>;
      elements: Record<string, any>[];
      variables: Record<string, any>;
    };
  }

  // ── Synchronous Generation ──

  async generateSingleImage(
    designId: string,
    params: {
      templateFormatName: string;
      elements?: Record<string, any>;
      imageFileType?: string;
    }
  ) {
    let body: Record<string, any> = {
      template_format_name: params.templateFormatName
    };
    if (params.elements) body.elements = params.elements;
    if (params.imageFileType) body.image_file_type = params.imageFileType;

    let response = await this.axios.post(`/banner-builder/${designId}/generate`, body);
    return response.data as {
      id: string;
      version: number;
      sharing_id: string;
      file: {
        type: string;
        url: string;
        cdn_url: string;
        filename: string;
      };
      format: {
        id: string;
        width: number;
        height: number;
      };
      template: {
        id: string;
        name: string;
        created_at: number;
        updated_at: number;
      };
    };
  }

  // ── Asynchronous Generation ──

  async generateMultiFormat(
    designId: string,
    params: {
      callbackUrl?: string;
      templateFormatNames?: string[];
      elements?: Record<string, any>;
      imageFileType?: string;
      html5?: {
        clickTag?: string;
        pageTitle?: string;
        adNetwork?: string;
        repeat?: number;
        includeBackupImage?: boolean;
      };
    }
  ) {
    let body: Record<string, any> = {};
    if (params.callbackUrl) body.callback_url = params.callbackUrl;
    if (params.templateFormatNames) body.template_format_names = params.templateFormatNames;
    if (params.elements) body.elements = params.elements;
    if (params.imageFileType) body.image_file_type = params.imageFileType;
    if (params.html5) {
      body.html5 = {
        ...(params.html5.clickTag !== undefined && { click_tag: params.html5.clickTag }),
        ...(params.html5.pageTitle !== undefined && { page_title: params.html5.pageTitle }),
        ...(params.html5.adNetwork !== undefined && { ad_network: params.html5.adNetwork }),
        ...(params.html5.repeat !== undefined && { repeat: params.html5.repeat }),
        ...(params.html5.includeBackupImage !== undefined && {
          include_backup_image: params.html5.includeBackupImage
        })
      };
    }

    let response = await this.axios.post(`/async/banner-builder/${designId}/generate`, body);
    return response.data as {
      generation_request_id: string;
    };
  }

  async getGenerationRequestStatus(generationRequestId: string) {
    let response = await this.axios.get(`/generation-request/${generationRequestId}`);
    return response.data as {
      is_finalized: boolean;
      id: string;
      banners: Array<{
        id: string;
        file: {
          type: string;
          url: string;
          cdn_url: string;
          filename: string;
        };
        format: {
          id: string;
          width: number;
          height: number;
        };
        template: {
          id: string;
          name: string;
          created_at: number;
          updated_at: number;
        };
      }>;
      errors: Array<{
        template_format_name: string;
        reason: string;
      }>;
    };
  }

  // ── Dynamic Images ──

  async createDynamicImage(
    designId: string,
    params?: {
      enableRateLimit?: boolean;
      enableProductionMode?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (params?.enableRateLimit !== undefined) body.enable_rate_limit = params.enableRateLimit;
    if (params?.enableProductionMode !== undefined)
      body.enable_production_mode = params.enableProductionMode;

    let response = await this.axios.post(`/designs/${designId}/dynamic-image-url`, body);
    return response.data as {
      id: string;
      design_id: string;
      formats: Array<{
        id: string;
        uid: string;
        width: number;
        unit: string;
        height: number;
        dynamic_image_url: string;
      }>;
    };
  }

  // ── Export ──

  async exportBanners(params: { bannerIds: string[]; callbackUrl: string }) {
    let response = await this.axios.post('/async/banners/export', {
      ids: params.bannerIds,
      callback_url: params.callbackUrl
    });
    return response.data as {
      export_id: string;
    };
  }

  // ── Projects ──

  async listProjects() {
    let response = await this.axios.get('/projects');
    return response.data as Array<{
      id: string;
      name: string;
      created_at_ts: number;
    }>;
  }

  async createProject(name: string) {
    let response = await this.axios.post('/projects', { name });
    return response.data as {
      id: string;
      name: string;
      created_at_ts: number;
    };
  }

  // ── Fonts ──

  async listFonts() {
    let response = await this.axios.get('/fonts');
    return response.data as Array<{
      id: string;
      name: string;
      available_weights: Array<string | number>;
      type: string;
    }>;
  }

  // ── Workspace Templates ──

  async duplicateWorkspaceTemplate(
    companyTemplateId: string,
    params: {
      projectId: string;
      name?: string;
    }
  ) {
    let body: Record<string, any> = {
      project_id: params.projectId
    };
    if (params.name) body.name = params.name;

    let response = await this.axios.post(
      `/workspace-templates/${companyTemplateId}/use`,
      body
    );
    return response.data as {
      duplication_request_id: string;
    };
  }

  async getDuplicationRequestStatus(duplicateRequestId: string) {
    let response = await this.axios.get(`/design-duplication-requests/${duplicateRequestId}`);
    return response.data as {
      request_id: string;
      status: string;
      created_at_ts: number;
      completed_at_ts: number | null;
      errored_at_ts: number | null;
      target_project: {
        id: string;
        name: string;
        created_at_ts: number;
      };
      designs: Array<{
        original_design_id: string;
        target_design_id: string;
        target_design_name: string;
      }>;
    };
  }

  // ── Health Check ──

  async checkReady() {
    let response = await this.axios.get('/ready');
    return response.data;
  }
}
