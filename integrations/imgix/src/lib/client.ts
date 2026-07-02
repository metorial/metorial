import { createAxios } from 'slates';

let jsonApiHeaders = {
  Accept: 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json'
};

export class ImgixClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.imgix.com/api/v1',
      headers: {
        ...jsonApiHeaders,
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ── Sources ──────────────────────────────────────────

  async listSources(params?: {
    sort?: string;
    filterName?: string;
    filterEnabled?: boolean;
    filterDeploymentType?: string;
    pageNumber?: number;
    pageSize?: number;
  }) {
    let query: Record<string, string> = {};
    if (params?.sort) query.sort = params.sort;
    if (params?.filterName) query['filter[name]'] = params.filterName;
    if (params?.filterEnabled !== undefined)
      query['filter[enabled]'] = String(params.filterEnabled);
    if (params?.filterDeploymentType)
      query['filter[deployment.type]'] = params.filterDeploymentType;
    if (params?.pageNumber !== undefined) query['page[number]'] = String(params.pageNumber);
    if (params?.pageSize !== undefined) query['page[size]'] = String(params.pageSize);

    let response = await this.axios.get('/sources', { params: query });
    return response.data;
  }

  async getSource(sourceId: string) {
    let response = await this.axios.get(`/sources/${sourceId}`);
    return response.data;
  }

  async createSource(attributes: Record<string, any>) {
    let response = await this.axios.post('/sources', {
      data: {
        attributes,
        type: 'sources'
      }
    });
    return response.data;
  }

  async updateSource(sourceId: string, attributes: Record<string, any>) {
    let response = await this.axios.patch(`/sources/${sourceId}`, {
      data: {
        attributes,
        type: 'sources'
      }
    });
    return response.data;
  }

  // ── Assets ───────────────────────────────────────────

  async listAssets(
    sourceId: string,
    params?: {
      cursor?: string;
      limit?: number;
      sort?: string;
      filterOriginPath?: string;
      filterMediaKind?: string;
      filterKeyword?: string;
      filterCategories?: string;
      filterTags?: string;
    }
  ) {
    let query: Record<string, string> = {};
    if (params?.cursor) query['page[cursor]'] = params.cursor;
    if (params?.limit !== undefined) query['page[limit]'] = String(params.limit);
    if (params?.sort) query.sort = params.sort;
    if (params?.filterOriginPath) query['filter[origin_path]'] = params.filterOriginPath;
    if (params?.filterMediaKind) query['filter[media_kind]'] = params.filterMediaKind;
    if (params?.filterKeyword) query['filter[keyword]'] = params.filterKeyword;
    if (params?.filterCategories) query['filter[categories]'] = params.filterCategories;
    if (params?.filterTags) query['filter[tags]'] = params.filterTags;

    let response = await this.axios.get(`/sources/${sourceId}/assets`, { params: query });
    return response.data;
  }

  async getAsset(sourceId: string, originPath: string) {
    let encodedPath = encodeURIComponent(originPath);
    let response = await this.axios.get(`/sources/${sourceId}/assets/${encodedPath}`);
    return response.data;
  }

  async updateAsset(sourceId: string, originPath: string, attributes: Record<string, any>) {
    let encodedPath = encodeURIComponent(originPath);
    let response = await this.axios.patch(`/sources/${sourceId}/assets/${encodedPath}`, {
      data: {
        attributes,
        type: 'assets'
      }
    });
    return response.data;
  }

  async addAsset(sourceId: string, originPath: string) {
    let encodedPath = encodeURIComponent(originPath);
    let response = await this.axios.post(`/sources/${sourceId}/assets/add/${encodedPath}`);
    return response.data;
  }

  async refreshAsset(sourceId: string, originPath: string) {
    let encodedPath = encodeURIComponent(originPath);
    let response = await this.axios.post(`/sources/${sourceId}/assets/refresh/${encodedPath}`);
    return response.data;
  }

  // ── Purge ────────────────────────────────────────────

  async purge(url: string, options?: { subImage?: boolean; sourceId?: string }) {
    let attributes: Record<string, any> = { url };
    if (options?.subImage !== undefined) attributes.sub_image = options.subImage;
    if (options?.sourceId) attributes.source_id = options.sourceId;

    let response = await this.axios.post('/purge', {
      data: {
        attributes,
        type: 'purges'
      }
    });
    return response.data;
  }

  // ── Reports ──────────────────────────────────────────

  async listReports(params?: {
    sort?: string;
    filterReportType?: string;
    filterCompleted?: boolean;
  }) {
    let query: Record<string, string> = {};
    if (params?.sort) query.sort = params.sort;
    if (params?.filterReportType) query['filter[report_type]'] = params.filterReportType;
    if (params?.filterCompleted !== undefined)
      query['filter[completed]'] = String(params.filterCompleted);

    let response = await this.axios.get('/reports', { params: query });
    return response.data;
  }

  async getReport(reportId: string) {
    let response = await this.axios.get(`/reports/${reportId}`);
    return response.data;
  }
}
