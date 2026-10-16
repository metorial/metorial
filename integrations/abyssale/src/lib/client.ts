import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';

export type ApiRecord = Record<string, any>;
export interface Banner extends ApiRecord {
  id: string;
  version?: number;
  sharing_id?: string;
  file: { type: string; url: string; cdn_url?: string; filename?: string };
  format?: { id?: string; width: number; height: number; unit?: string };
  template?: { id: string; name: string };
}
export interface Paging {
  page?: number;
  perPage?: number;
}

export let validateInteger = (
  value: number | undefined,
  name: string,
  min: number,
  max?: number
) => {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < min || (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${name} must be an integer from ${min}${max === undefined ? ' upwards' : ` to ${max}`}.`
    );
  }
};

export let validateName = (name: string) => {
  if (name.length < 2 || name.length > 100) {
    throw createApiServiceError('Name must contain 2 to 100 characters.');
  }
};

export class AbyssaleClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.abyssale.com',
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Abyssale',
          reason: 'abyssale_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['message', 'path', 'code'],
          nestedKeys: ['errors'],
          extractUpstreamCode: (_input, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.id === 'string'
              ? response.data.id
              : undefined
        })
    });
  }

  private async list<T>(path: string, params: ApiRecord = {}) {
    validateInteger(params.page, 'page', 1);
    // The provider caps values above 100; retain that documented behavior.
    validateInteger(params.per_page, 'perPage', 1);
    let response = await this.axios.get<T[]>(path, { params: pickDefined(params) });
    let header = getResponseHeaderValue(response.headers, 'x-total-count');
    let totalCount = header === undefined ? undefined : Number(header);
    return {
      items: response.data,
      totalCount: Number.isFinite(totalCount) ? totalCount : undefined
    };
  }

  async getWorkspace() {
    return (await this.axios.post<{ company?: string; version?: string }>('/auth')).data;
  }

  async getCredits() {
    return (await this.axios.get<ApiRecord>('/credits')).data;
  }

  async listDesigns(params: ApiRecord = {}) {
    return this.list<ApiRecord>('/designs', {
      category_id: params.categoryId || undefined,
      project_id: params.projectId,
      type: params.type,
      query: params.query,
      name: params.name,
      project: params.project,
      orientation: params.orientation,
      size: params.sizes?.join(','),
      format: params.formatNames?.join(','),
      updated_since: params.updatedSince,
      created_since: params.createdSince,
      sort: params.sort,
      order: params.order,
      page: params.page,
      per_page: params.perPage
    });
  }

  async getDesign(designId: string, advanced?: boolean) {
    return (
      await this.axios.get<ApiRecord>(`/designs/${encodeURIComponent(designId)}`, {
        params: advanced ? { i: 'advanced' } : undefined
      })
    ).data;
  }

  async getDesignFormatDetails(designId: string, formatSpecifier: string) {
    return (
      await this.axios.get<ApiRecord>(
        `/designs/${encodeURIComponent(designId)}/formats/${encodeURIComponent(formatSpecifier)}`
      )
    ).data;
  }

  async getBanner(bannerId: string) {
    return (await this.axios.get<Banner>(`/banners/${encodeURIComponent(bannerId)}`)).data;
  }

  async generateSingleImage(
    designId: string,
    params: {
      templateFormatName: string;
      elements?: ApiRecord;
      imageFileType?: string;
      fileCompressionLevel?: number;
      originalVisualId?: string;
    }
  ) {
    validateInteger(params.fileCompressionLevel, 'fileCompressionLevel', 1, 100);
    return (
      await this.axios.post<Banner>(
        `/banner-builder/${encodeURIComponent(designId)}/generate`,
        pickDefined({
          template_format_name: params.templateFormatName,
          elements: params.elements,
          image_file_type: params.imageFileType,
          file_compression_level: params.fileCompressionLevel,
          original_visual_id: params.originalVisualId
        })
      )
    ).data;
  }

  async generateMultiFormat(
    designId: string,
    params: {
      callbackUrl?: string;
      templateFormatNames?: string[];
      elements?: ApiRecord;
      imageFileType?: string;
      fileCompressionLevel?: number;
      originalVisualId?: string;
      pages?: ApiRecord;
      html5?: {
        clickTag?: string;
        pageTitle?: string;
        adNetwork?: string;
        repeat?: number;
        includeBackupImage?: boolean;
      };
      gif?: { maxFps?: number; repeat?: number };
      video?: { fps?: number };
      print?: { colorProfile?: string; displayCropMarks?: boolean };
    }
  ) {
    validateInteger(params.fileCompressionLevel, 'fileCompressionLevel', 1, 100);
    validateInteger(params.html5?.repeat, 'html5.repeat', -1, 100);
    validateInteger(params.gif?.repeat, 'gif.repeat', -1, 100);
    validateInteger(params.gif?.maxFps, 'gif.maxFps', 2, 9);
    validateInteger(params.video?.fps, 'video.fps', 2, 30);
    if (params.originalVisualId && (params.templateFormatNames?.length ?? 0) > 1) {
      throw createApiServiceError('Versioned regeneration requires exactly one format.');
    }
    return (
      await this.axios.post<{ generation_request_id: string }>(
        `/async/banner-builder/${encodeURIComponent(designId)}/generate`,
        pickDefined({
          callback_url: params.callbackUrl || undefined,
          template_format_names: params.templateFormatNames,
          elements: params.elements,
          image_file_type: params.imageFileType,
          file_compression_level: params.fileCompressionLevel,
          original_visual_id: params.originalVisualId,
          pages: params.pages,
          html5:
            params.html5 &&
            pickDefined({
              click_tag: params.html5.clickTag,
              page_title: params.html5.pageTitle,
              ad_network: params.html5.adNetwork,
              repeat: params.html5.repeat,
              include_backup_image: params.html5.includeBackupImage
            }),
          gif:
            params.gif &&
            pickDefined({ max_fps: params.gif.maxFps, repeat: params.gif.repeat }),
          video: params.video && pickDefined({ fps: params.video.fps }),
          print:
            params.print &&
            pickDefined({
              color_profile: params.print.colorProfile,
              display_crop_marks: params.print.displayCropMarks
            })
        })
      )
    ).data;
  }

  async generateMultipagePdf(
    designId: string,
    params: {
      pages: ApiRecord;
      callbackUrl?: string;
      print?: { colorProfile?: string; displayCropMarks?: boolean };
    }
  ) {
    return (
      await this.axios.post<{ generation_request_id: string }>(
        `/async/banner-builder/${encodeURIComponent(designId)}/generate-multipage-pdf`,
        pickDefined({
          pages: params.pages,
          callback_url: params.callbackUrl,
          print:
            params.print &&
            pickDefined({
              color_profile: params.print.colorProfile,
              display_crop_marks: params.print.displayCropMarks
            })
        })
      )
    ).data;
  }

  async getGenerationRequestStatus(generationRequestId: string) {
    return (
      await this.axios.get<{
        id: string;
        is_finalized: boolean;
        banners: Banner[];
        errors?: { template_format_name?: string; reason?: string }[];
      }>(`/generation-request/${encodeURIComponent(generationRequestId)}`)
    ).data;
  }

  async createDynamicImage(
    designId: string,
    params?: { enableRateLimit?: boolean; enableProductionMode?: boolean }
  ) {
    return (
      await this.axios.post<{
        id: string;
        design_id: string;
        formats: {
          id: string;
          uid: string;
          width: number;
          height: number;
          unit: string;
          dynamic_image_url: string;
        }[];
      }>(
        `/designs/${encodeURIComponent(designId)}/dynamic-image-url`,
        pickDefined({
          enable_rate_limit: params?.enableRateLimit,
          enable_production_mode: params?.enableProductionMode
        })
      )
    ).data;
  }

  async exportBanners(params: { bannerIds: string[]; callbackUrl: string }) {
    if (params.bannerIds.length === 0)
      throw createApiServiceError('Provide at least one banner ID to export.');
    return (
      await this.axios.post<{ export_id: string }>('/async/banners/export', {
        ids: params.bannerIds,
        callback_url: params.callbackUrl
      })
    ).data;
  }

  async listProjects(params: { name?: string } & Paging = {}) {
    return this.list<ApiRecord>('/projects', {
      name: params.name,
      page: params.page,
      per_page: params.perPage
    });
  }

  async createProject(name: string) {
    validateName(name);
    return (
      await this.axios.post<{ id: string; name: string; created_at_ts: number }>('/projects', {
        name
      })
    ).data;
  }

  async listFonts(params: ApiRecord = {}) {
    if (
      params.weight !== undefined &&
      ![100, 200, 300, 400, 500, 600, 700, 800, 900].includes(params.weight)
    ) {
      throw createApiServiceError(
        'weight must be a font weight from 100 to 900 in increments of 100.'
      );
    }
    return this.list<ApiRecord>(
      '/fonts',
      pickDefined({
        type: params.type,
        name: params.name,
        category: params.category,
        weight: params.weight,
        style: params.style,
        page: params.page,
        per_page: params.perPage
      })
    );
  }

  async listWorkspaceTemplates(params: { categoryId?: string; designType?: string }) {
    return (
      await this.axios.get<ApiRecord[]>('/workspace-templates', {
        params: pickDefined({ category_id: params.categoryId, type: params.designType })
      })
    ).data;
  }

  async listWorkspaceTemplateCategories() {
    return (await this.axios.get<ApiRecord[]>('/workspace-template-categories')).data;
  }

  async duplicateWorkspaceTemplate(
    companyTemplateId: string,
    params: { projectId: string; name?: string }
  ) {
    if (params.name) validateName(params.name);
    return (
      await this.axios.post<{ duplication_request_id: string }>(
        `/workspace-templates/${encodeURIComponent(companyTemplateId)}/use`,
        pickDefined({ project_id: params.projectId, name: params.name || undefined })
      )
    ).data;
  }

  async getDuplicationRequestStatus(duplicateRequestId: string) {
    return (
      await this.axios.get<{
        request_id: string;
        status: string;
        created_at_ts: number;
        completed_at_ts?: number | null;
        errored_at_ts?: number | null;
        target_project: { id: string; name: string; created_at_ts: number };
        designs: {
          original_design_id: string;
          target_design_id: string;
          target_design_name: string;
        }[];
      }>(`/design-duplication-requests/${encodeURIComponent(duplicateRequestId)}`)
    ).data;
  }
}
