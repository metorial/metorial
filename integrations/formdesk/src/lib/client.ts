import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';

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
  formName?: string;
  email?: string;
  userId?: string;
}

export class FormdeskClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private baseUrl: string;

  constructor(clientConfig: ClientConfig) {
    if (!/^(?:[a-z\d-]+\.)*formdesk\.com$/i.test(clientConfig.host)) {
      throw createApiServiceError('Reconnect Formdesk to obtain a valid account host.');
    }
    if (!clientConfig.domain?.trim() || !clientConfig.token?.trim()) {
      throw createApiServiceError('Reconnect Formdesk with an API key and account folder.');
    }
    this.baseUrl = `https://${clientConfig.host}/api/rest/v1/${encodeURIComponent(clientConfig.domain)}`;
    this.http = createAuthenticatedAxios({
      baseURL: this.baseUrl,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Formdesk',
          reason: 'formdesk_api_error',
          detailKeys: ['reason', 'description', 'message', 'code']
        }),
      headers: {
        Authorization: `Bearer ${clientConfig.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getForms(): Promise<any[]> {
    let response = await this.http.get('/forms');
    let data = response.data;
    let forms = Array.isArray(data) ? data : data?.forms;
    if (!Array.isArray(forms))
      throw createApiServiceError('Formdesk returned an invalid form list.');
    return forms;
  }

  async getFormFilters(formName: string): Promise<any[]> {
    let response = await this.http.get(`/forms/${encodeURIComponent(formName)}/filters`);
    let data = response.data;
    let filters = Array.isArray(data) ? data : data?.filters;
    if (!Array.isArray(filters))
      throw createApiServiceError('Formdesk returned an invalid filter list.');
    return filters;
  }

  async getResultIDs(params: GetResultIDsParams): Promise<any> {
    let queryParams: Record<string, string> = {};

    if (params.createdAfter) queryParams.created_from = params.createdAfter;
    if (params.createdBefore) queryParams.created_to = params.createdBefore;
    if (params.changedAfter) queryParams.changed_from = params.changedAfter;
    if (params.changedBefore) queryParams.changed_to = params.changedBefore;
    if (params.completedAfter) queryParams.completed_from = params.completedAfter;
    if (params.completedBefore) queryParams.completed_to = params.completedBefore;
    if (params.status) queryParams.status = params.status;
    if (params.syncStatus)
      queryParams.sync_status =
        ({ all: 'ALL', unprocessed: 'N,C,D,R', processed: 'P' } as Record<string, string>)[
          params.syncStatus
        ] ?? params.syncStatus;
    if (params.visitorId) queryParams.id_visitor = params.visitorId;
    if (params.filter) queryParams.view = params.filter;

    let response = await this.http.get(
      `/forms/${encodeURIComponent(params.formName)}/results`,
      {
        params: queryParams
      }
    );
    let data = response.data;
    let results = Array.isArray(data) ? data : data?.results;
    if (!Array.isArray(results))
      throw createApiServiceError('Formdesk returned an invalid result list.');
    let offset = params.offset ?? 0;
    return {
      results: results.slice(
        offset,
        params.limit === undefined ? undefined : offset + params.limit
      ),
      total: results.length
    };
  }

  async getResult(resultId: string): Promise<any> {
    let queryParams: Record<string, string> = {};

    let response = await this.http.get(`/formresults/${encodeURIComponent(resultId)}`, {
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
    let result = response.data?.results?.[0] ?? response.data;
    if (!result || (result._fd_id ?? result.id ?? result.resultId) == null) {
      throw createApiServiceError('Formdesk did not return an ID for the new result.');
    }
    return result;
  }

  async updateResult(params: UpdateResultParams): Promise<any> {
    let queryParams: Record<string, string> = {};
    if (params.processMessages !== undefined) {
      queryParams.process_messages = params.processMessages ? 'true' : 'false';
    }

    let response = await this.http.put(
      `/formresults/${encodeURIComponent(params.resultId)}`,
      params.fields,
      { params: queryParams }
    );
    return response.data?.results?.[0] ?? response.data;
  }

  async removeResult(resultId: string, filesOnly?: boolean): Promise<any> {
    let queryParams: Record<string, string> = {};

    let response = await this.http.delete(
      `/formresults/${encodeURIComponent(resultId)}${filesOnly ? '/files' : ''}`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  async markResultProcessed(resultId: string): Promise<any> {
    let response = await this.http.put(
      `/formresults/${encodeURIComponent(resultId)}/processed`
    );
    return response.data;
  }

  async exportResults(params: ExportResultsParams): Promise<any> {
    let queryParams: Record<string, string> = {};

    if (params.createdAfter) queryParams.created_from = params.createdAfter;
    if (params.createdBefore) queryParams.created_to = params.createdBefore;
    if (params.changedAfter) queryParams.changed_from = params.changedAfter;
    if (params.changedBefore) queryParams.changed_to = params.changedBefore;
    if (params.completedAfter) queryParams.completed_from = params.completedAfter;
    if (params.completedBefore) queryParams.completed_to = params.completedBefore;
    if (params.status) queryParams.status = params.status;
    if (params.syncStatus)
      queryParams.sync_status =
        ({ all: 'ALL', unprocessed: 'N,C,D,R', processed: 'P' } as Record<string, string>)[
          params.syncStatus
        ] ?? params.syncStatus;
    if (params.filter) queryParams.view = params.filter;

    let response = await this.http.post(
      `/forms/${encodeURIComponent(params.formName)}/results/export`,
      { format: params.format },
      { params: queryParams }
    );
    let files = response.data?.files;
    if (
      !Array.isArray(files) ||
      files.length === 0 ||
      files.some(file => typeof file.content !== 'string')
    ) {
      throw createApiServiceError('Formdesk did not return a downloadable export.');
    }
    return {
      files: files.map(file => ({
        content: Buffer.from(file.content, 'base64'),
        contentType: String(file.contenttype ?? 'application/octet-stream'),
        fileName: typeof file.name === 'string' ? file.name : undefined
      })),
      credits: getResponseHeaderValue(response.headers, 'credits')
    };
  }

  async getResultPdf(params: GetPdfParams): Promise<any> {
    let numericOption = (value: string | undefined, label: string) => {
      if (value === undefined) return undefined;
      let number = Number(value);
      if (!value.trim() || !Number.isFinite(number) || number < 0) {
        throw createApiServiceError(`${label} must be a non-negative number.`);
      }
      return number;
    };
    let response = await this.http.post(
      `/formresults/${encodeURIComponent(params.resultId)}/pdf`,
      pickDefined({
        papersize: params.paperSize,
        orientation:
          params.orientation === undefined
            ? undefined
            : params.orientation === 'landscape'
              ? 2
              : 1,
        scaletype: params.scale === undefined ? undefined : 1,
        scaling: numericOption(params.scale, 'Scale'),
        marginTop: numericOption(params.marginTop, 'Top margin'),
        marginRight: numericOption(params.marginRight, 'Right margin'),
        marginBottom: numericOption(params.marginBottom, 'Bottom margin'),
        marginLeft: numericOption(params.marginLeft, 'Left margin'),
        userpassword: params.password
      }),
      { responseType: 'arraybuffer' }
    );
    return {
      content: response.data,
      contentType:
        getResponseHeaderValue(response.headers, 'content-type') ?? 'application/pdf'
    };
  }

  async getFile(fileNameOrId: string): Promise<any> {
    let response = await this.http.get(`/files/${encodeURIComponent(fileNameOrId)}`);
    let file = response.data;
    if (!file || file.id === undefined || file.id === null) {
      throw createApiServiceError(
        'Formdesk did not return file metadata. Use list_files to find a file ID.'
      );
    }
    return {
      url: `${this.baseUrl}/files/${encodeURIComponent(String(file.id))}/content`,
      contentType:
        typeof file.contenttype === 'string' ? file.contenttype : 'application/octet-stream',
      fileName: fileNameOrId
    };
  }

  async getFormItems(formName: string): Promise<any[]> {
    let response = await this.http.get(`/forms/${encodeURIComponent(formName)}/items`);
    if (!Array.isArray(response.data))
      throw createApiServiceError('Formdesk returned an invalid form item list.');
    return response.data;
  }

  async getVisitor(visitorId: string): Promise<any> {
    let response = await this.http.get(`/visitors/${encodeURIComponent(visitorId)}`);
    return response.data;
  }

  async getFiles(type?: 'all' | 'account' | 'formresult'): Promise<any[]> {
    let response = await this.http.get('/files', { params: pickDefined({ type }) });
    if (!Array.isArray(response.data))
      throw createApiServiceError('Formdesk returned an invalid file list.');
    return response.data;
  }

  async getVisitors(search?: string): Promise<any[]> {
    let queryParams: Record<string, string> = {};

    let response = await this.http.get('/visitors', {
      params: queryParams
    });
    let data = response.data;
    let visitors = Array.isArray(data) ? data : data?.visitors;
    if (!Array.isArray(visitors))
      throw createApiServiceError('Formdesk returned an invalid visitor list.');
    if (!search) return visitors;
    let query = search.toLocaleLowerCase();
    return visitors.filter(visitor =>
      [visitor.name, visitor.email, visitor.username].some(
        value => typeof value === 'string' && value.toLocaleLowerCase().includes(query)
      )
    );
  }

  async addVisitor(params: VisitorParams): Promise<any> {
    if (!params.username?.trim())
      throw createApiServiceError('Provide a username when creating an internal visitor.');
    let response = await this.http.post('/visitors', pickDefined(params));
    return response.data;
  }

  async updateVisitor(visitorId: string, params: VisitorParams): Promise<any> {
    let response = await this.http.put(
      `/visitors/${encodeURIComponent(visitorId)}`,
      pickDefined(params)
    );
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
    if (response.data?.id === undefined || response.data.id === null) {
      throw createApiServiceError('Formdesk did not confirm the visitor identity.');
    }
    return response.data;
  }

  async getVisitorResults(visitorId: string, formList?: string): Promise<any> {
    let queryParams: Record<string, string> = {};

    let response = await this.http.get(
      `/visitors/${encodeURIComponent(visitorId)}/formresults`,
      {
        params: queryParams
      }
    );
    if (!formList || !Array.isArray(response.data)) return response.data;
    let names = formList.split(',').map(name => name.trim());
    return response.data.filter(form => names.includes(String(form.name)));
  }

  async signOn(params: SignOnParams): Promise<any> {
    if (!params.username && !params.email && !params.visitorId && !params.userId) {
      throw createApiServiceError(
        'Provide a username, email, visitor ID, or user ID for sign-on.'
      );
    }
    if (params.visitorId && !params.formName) {
      throw createApiServiceError(
        'Provide formName to sign on a visitor to a form. Call list_forms to discover form names.'
      );
    }
    if (params.formName && params.userId)
      throw createApiServiceError(
        'userId is for account-user sign-on; omit formName or use visitorId.'
      );
    if (params.visitorId && params.userId)
      throw createApiServiceError('Use either visitorId or userId for sign-on.');
    let path = params.formName
      ? `/forms/${encodeURIComponent(params.formName)}/signon`
      : '/signon';
    let response = await this.http.post(
      path,
      pickDefined({
        username: params.username,
        password: params.password,
        id: params.visitorId ?? params.userId,
        email: params.email,
        redirectUrl: params.redirectUrl
      })
    );
    if (typeof response.data?.url !== 'string' || !response.data.url)
      throw createApiServiceError('Formdesk did not return a sign-on URL.');
    return response.data;
  }

  async parkData(params: ParkDataParams): Promise<any> {
    let expires = params.expires ?? 86400;
    if (!Number.isInteger(expires) || expires <= 0)
      throw createApiServiceError(
        'Ticket expiration must be a positive whole number of seconds.'
      );
    let response = await this.http.post(
      '/park',
      pickDefined({
        data: params.fields,
        expires,
        reuse: params.reuse,
        preventchange: params.preventChange
      })
    );
    let result = response.data;
    if (typeof result?.ticket !== 'string' || !result.ticket)
      throw createApiServiceError('Formdesk did not return a parking ticket.');
    return {
      ...result,
      url: `https://www.formdesk.com/${this.baseUrl.split('/').pop()}/${encodeURIComponent(params.formName)}?ticket=${encodeURIComponent(result.ticket)}`
    };
  }
}
