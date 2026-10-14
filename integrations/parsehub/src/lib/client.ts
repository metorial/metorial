import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export interface ParseHubProject {
  token: string;
  title: string;
  templates_json: string;
  main_template?: string;
  main_site?: string;
  options_json?: string;
  last_ready_run: ParseHubRun | null;
  last_run: ParseHubRun | null;
  run_list?: ParseHubRun[];
}

export interface ParseHubRun {
  project_token: string;
  run_token: string;
  status: string;
  data_ready: boolean | number;
  start_time: string;
  end_time: string | null;
  pages: number;
  md5sum: string | null;
  start_url: string;
  start_template: string;
  start_value: string;
}

export interface ListProjectsResponse {
  projects: ParseHubProject[];
  total_projects: number;
}

export class Client {
  private token: string;
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A ParseHub API key is required. Reconnect with a valid key.'
      );
    }
    this.token = config.token;
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.parsehub.com/api/v2',
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ParseHub',
          reason: 'parsehub_api_error',
          extractStatus: (value, response) => {
            if (response?.status !== undefined) return response.status;
            if (isApiErrorRecord(value) && isApiErrorRecord(value.data)) {
              let upstream = isApiErrorRecord(value.data.upstream)
                ? value.data.upstream
                : value.data;
              if (typeof upstream.status === 'number' || typeof upstream.status === 'string') {
                return upstream.status;
              }
            }
            return undefined;
          }
        })
    });
  }

  async listProjects(params?: {
    offset?: number;
    limit?: number;
    includeOptions?: boolean;
  }): Promise<ListProjectsResponse> {
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('Project offset must be a non-negative whole number.');
    }
    if (
      params?.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 20)
    ) {
      throw createApiServiceError('Project limit must be a whole number between 1 and 20.');
    }
    let response = await this.http.get('/projects', {
      params: {
        api_key: this.token,
        offset: params?.offset,
        limit: params?.limit,
        include_options: params?.includeOptions ? 1 : undefined
      }
    });
    return response.data;
  }

  async getProject(
    projectToken: string,
    params?: { offset?: number; includeOptions?: boolean }
  ): Promise<ParseHubProject> {
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('Run offset must be a non-negative whole number.');
    }
    let response = await this.http.get(`/projects/${encodeURIComponent(projectToken)}`, {
      params: {
        api_key: this.token,
        offset: params?.offset,
        include_options: params?.includeOptions ? 1 : undefined
      }
    });
    return response.data;
  }

  async runProject(
    projectToken: string,
    params?: {
      startUrl?: string;
      startTemplate?: string;
      startValueOverride?: string;
      sendEmail?: boolean;
    }
  ): Promise<ParseHubRun> {
    if (params?.startValueOverride !== undefined) {
      try {
        JSON.parse(params.startValueOverride);
      } catch {
        throw createApiServiceError('startValueOverride must be a valid JSON string.');
      }
    }
    let formData = new URLSearchParams();
    formData.append('api_key', this.token);

    if (params?.startUrl !== undefined) {
      formData.append('start_url', params.startUrl);
    }
    if (params?.startTemplate !== undefined) {
      formData.append('start_template', params.startTemplate);
    }
    if (params?.startValueOverride !== undefined) {
      formData.append('start_value_override', params.startValueOverride);
    }
    if (params?.sendEmail !== undefined) {
      formData.append('send_email', params.sendEmail ? '1' : '0');
    }

    let response = await this.http.post(
      `/projects/${encodeURIComponent(projectToken)}/run`,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
        }
      }
    );
    return response.data;
  }

  async getRun(runToken: string): Promise<ParseHubRun> {
    let response = await this.http.get(`/runs/${encodeURIComponent(runToken)}`, {
      params: {
        api_key: this.token
      }
    });
    return response.data;
  }

  async getRunData(runToken: string, format?: 'json' | 'csv'): Promise<unknown> {
    let response = await this.http.get(`/runs/${encodeURIComponent(runToken)}/data`, {
      params: {
        api_key: this.token,
        format: format || 'json'
      }
      // ParseHub returns gzip-compressed data; axios should decompress automatically
    });
    return response.data;
  }

  async getLastReadyRunData(projectToken: string, format?: 'json' | 'csv'): Promise<unknown> {
    let response = await this.http.get(
      `/projects/${encodeURIComponent(projectToken)}/last_ready_run/data`,
      {
        params: {
          api_key: this.token,
          format: format || 'json'
        }
      }
    );
    return response.data;
  }

  async cancelRun(runToken: string): Promise<ParseHubRun> {
    let formData = new URLSearchParams();
    formData.append('api_key', this.token);

    let response = await this.http.post(
      `/runs/${encodeURIComponent(runToken)}/cancel`,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
        }
      }
    );
    return response.data;
  }

  async deleteRun(runToken: string): Promise<{ run_token: string }> {
    let response = await this.http.delete(`/runs/${encodeURIComponent(runToken)}`, {
      params: {
        api_key: this.token
      }
    });
    return response.data;
  }
}
