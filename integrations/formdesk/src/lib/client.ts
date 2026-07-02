import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  host: string;
  domain: string;
}

export interface GetResultIDsParams {
  formName: string;
  createdAfter?: string;
  createdBefore?: string;
  changedAfter?: string;
  changedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  status?: string;
  syncStatus?: string;
  visitorId?: string;
  filter?: string;
  limit?: number;
  offset?: number;
}

export interface AddResultParams {
  formName: string;
  fields: Record<string, string>;
  processMessages?: boolean;
}

export interface UpdateResultParams {
  resultId: string;
  fields: Record<string, string>;
  processMessages?: boolean;
}

export interface ExportResultsParams {
  formName: string;
  format: 'excel2007' | 'csv' | 'xml' | 'dbase' | 'foxpro' | 'text';
  createdAfter?: string;
  createdBefore?: string;
  changedAfter?: string;
  changedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  status?: string;
  syncStatus?: string;
  filter?: string;
}

export interface GetPdfParams {
  resultId: string;
  paperSize?: string;
  orientation?: string;
  scale?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  password?: string;
}

export interface VisitorParams {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
}

export interface ParkDataParams {
  formName: string;
  fields: Record<string, string>;
  expires?: number;
  reuse?: boolean;
  preventChange?: boolean;
}

export interface SignOnParams {
  username?: string;
  password?: string;
  visitorId?: string;
  redirectUrl?: string;
}

export class FormdeskClient {
  private http: ReturnType<typeof createAxios>;

  constructor(clientConfig: ClientConfig) {
    this.http = createAxios({
      baseURL: `https://${clientConfig.host}/api/rest/v1/${clientConfig.domain}`,
      headers: {
        Authorization: `Bearer ${clientConfig.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getForms(): Promise<any[]> {
    let response = await this.http.get('/forms');
    let data = response.data;
    return Array.isArray(data) ? data : data?.forms || [];
  }

  async getFormFilters(formName: string): Promise<any[]> {
    let response = await this.http.get(`/forms/${encodeURIComponent(formName)}/filters`);
    let data = response.data;
    return Array.isArray(data) ? data : data?.filters || [];
  }

  async getResultIDs(params: GetResultIDsParams): Promise<any> {
    let queryParams: Record<string, string> = {};

    if (params.createdAfter) queryParams.created_after = params.createdAfter;
    if (params.createdBefore) queryParams.created_before = params.createdBefore;
    if (params.changedAfter) queryParams.changed_after = params.changedAfter;
    if (params.changedBefore) queryParams.changed_before = params.changedBefore;
    if (params.completedAfter) queryParams.completed_after = params.completedAfter;
    if (params.completedBefore) queryParams.completed_before = params.completedBefore;
    if (params.status) queryParams.status = params.status;
    if (params.syncStatus) queryParams.sync_status = params.syncStatus;
    if (params.visitorId) queryParams.visitor = params.visitorId;
    if (params.filter) queryParams.filter = params.filter;
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.offset !== undefined) queryParams.offset = String(params.offset);

    let response = await this.http.get(
      `/forms/${encodeURIComponent(params.formName)}/results`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  async getResult(resultId: string, includeFiles?: boolean): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (includeFiles) queryParams.include_files = 'true';

    let response = await this.http.get(`/results/${encodeURIComponent(resultId)}`, {
      params: queryParams
    });
    return response.data;
  }

  async addResult(params: AddResultParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.processMessages !== undefined) {
      queryParams.process_messages = params.processMessages ? 'true' : 'false';
    }

    let response = await this.http.post(
      `/forms/${encodeURIComponent(params.formName)}/results`,
      params.fields,
      { params: queryParams }
    );
    return response.data;
  }

  async updateResult(params: UpdateResultParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.processMessages !== undefined) {
      queryParams.process_messages = params.processMessages ? 'true' : 'false';
    }

    let response = await this.http.put(
      `/results/${encodeURIComponent(params.resultId)}`,
      params.fields,
      { params: queryParams }
    );
    return response.data;
  }

  async removeResult(resultId: string, filesOnly?: boolean): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (filesOnly) queryParams.files_only = 'true';

    let response = await this.http.delete(`/results/${encodeURIComponent(resultId)}`, {
      params: queryParams
    });
    return response.data;
  }

  async markResultProcessed(resultId: string): Promise<any> {
    let response = await this.http.put(`/results/${encodeURIComponent(resultId)}/processed`);
    return response.data;
  }

  async exportResults(params: ExportResultsParams): Promise<any> {
    let queryParams: Record<string, string> = {
      format: params.format
    };

    if (params.createdAfter) queryParams.created_after = params.createdAfter;
    if (params.createdBefore) queryParams.created_before = params.createdBefore;
    if (params.changedAfter) queryParams.changed_after = params.changedAfter;
    if (params.changedBefore) queryParams.changed_before = params.changedBefore;
    if (params.completedAfter) queryParams.completed_after = params.completedAfter;
    if (params.completedBefore) queryParams.completed_before = params.completedBefore;
    if (params.status) queryParams.status = params.status;
    if (params.syncStatus) queryParams.sync_status = params.syncStatus;
    if (params.filter) queryParams.filter = params.filter;

    let response = await this.http.get(
      `/forms/${encodeURIComponent(params.formName)}/export`,
      {
        params: queryParams,
        responseType: 'arraybuffer'
      }
    );
    return {
      content: Buffer.from(response.data).toString('base64'),
      contentType: String(response.headers['content-type'] ?? 'application/octet-stream'),
      credits: response.headers.credits
    };
  }

  async getResultPdf(params: GetPdfParams): Promise<any> {
    let queryParams: Record<string, string> = {};

    if (params.paperSize) queryParams.papersize = params.paperSize;
    if (params.orientation) queryParams.orientation = params.orientation;
    if (params.scale) queryParams.scale = params.scale;
    if (params.marginTop) queryParams.margin_top = params.marginTop;
    if (params.marginRight) queryParams.margin_right = params.marginRight;
    if (params.marginBottom) queryParams.margin_bottom = params.marginBottom;
    if (params.marginLeft) queryParams.margin_left = params.marginLeft;
    if (params.password) queryParams.password = params.password;

    let response = await this.http.get(`/results/${encodeURIComponent(params.resultId)}/pdf`, {
      params: queryParams,
      responseType: 'arraybuffer'
    });
    return {
      content: Buffer.from(response.data).toString('base64'),
      contentType: String(response.headers['content-type'] ?? 'application/pdf')
    };
  }

  async getFile(fileNameOrId: string): Promise<any> {
    let response = await this.http.get(`/files/${encodeURIComponent(fileNameOrId)}`, {
      responseType: 'arraybuffer'
    });
    return {
      content: Buffer.from(response.data).toString('base64'),
      contentType: String(response.headers['content-type'] ?? 'application/octet-stream'),
      fileName: fileNameOrId
    };
  }

  async getVisitors(search?: string): Promise<any[]> {
    let queryParams: Record<string, string> = {};
    if (search) queryParams.search = search;

    let response = await this.http.get('/visitors', {
      params: queryParams
    });
    let data = response.data;
    return Array.isArray(data) ? data : data?.visitors || [];
  }

  async addVisitor(params: VisitorParams): Promise<any> {
    let response = await this.http.post('/visitors', params);
    return response.data;
  }

  async updateVisitor(visitorId: string, params: VisitorParams): Promise<any> {
    let response = await this.http.put(`/visitors/${encodeURIComponent(visitorId)}`, params);
    return response.data;
  }

  async removeVisitor(visitorId: string): Promise<any> {
    let response = await this.http.delete(`/visitors/${encodeURIComponent(visitorId)}`);
    return response.data;
  }

  async authenticateVisitor(username: string, password: string): Promise<any> {
    let response = await this.http.post('/visitors/authenticate', {
      username,
      password
    });
    return response.data;
  }

  async getVisitorResults(visitorId: string, formList?: string): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (formList) queryParams.form_list = formList;

    let response = await this.http.get(`/visitors/${encodeURIComponent(visitorId)}/results`, {
      params: queryParams
    });
    return response.data;
  }

  async signOn(params: SignOnParams): Promise<any> {
    let response = await this.http.post('/signon', params);
    return response.data;
  }

  async parkData(params: ParkDataParams): Promise<any> {
    let body: Record<string, any> = {
      ...params.fields
    };
    let queryParams: Record<string, string> = {};

    if (params.expires !== undefined) queryParams.expires = String(params.expires);
    if (params.reuse !== undefined) queryParams.reuse = params.reuse ? 'true' : 'false';
    if (params.preventChange !== undefined)
      queryParams.preventchange = params.preventChange ? 'true' : 'false';

    let response = await this.http.post(
      `/forms/${encodeURIComponent(params.formName)}/park`,
      body,
      { params: queryParams }
    );
    return response.data;
  }
}
