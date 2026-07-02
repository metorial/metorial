import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://www.parsehub.com/api/v2'
});

export interface ParseHubProject {
  token: string;
  title: string;
  templates_json: string;
  main_template: string;
  main_site: string;
  options_json: string;
  last_ready_run: ParseHubRun | null;
  last_run: ParseHubRun | null;
  run_list: ParseHubRun[];
}

export interface ParseHubRun {
  project_token: string;
  run_token: string;
  status: string;
  data_ready: number;
  start_time: string;
  end_time: string;
  pages: number;
  md5sum: string;
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

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async listProjects(params?: {
    offset?: number;
    limit?: number;
    includeOptions?: boolean;
  }): Promise<ListProjectsResponse> {
    let response = await http.get('/projects', {
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
    let response = await http.get(`/projects/${projectToken}`, {
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
    let formData = new URLSearchParams();
    formData.append('api_key', this.token);

    if (params?.startUrl) {
      formData.append('start_url', params.startUrl);
    }
    if (params?.startTemplate) {
      formData.append('start_template', params.startTemplate);
    }
    if (params?.startValueOverride) {
      formData.append('start_value_override', params.startValueOverride);
    }
    if (params?.sendEmail !== undefined) {
      formData.append('send_email', params.sendEmail ? '1' : '0');
    }

    let response = await http.post(`/projects/${projectToken}/run`, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async getRun(runToken: string): Promise<ParseHubRun> {
    let response = await http.get(`/runs/${runToken}`, {
      params: {
        api_key: this.token
      }
    });
    return response.data;
  }

  async getRunData(runToken: string, format?: 'json' | 'csv'): Promise<any> {
    let response = await http.get(`/runs/${runToken}/data`, {
      params: {
        api_key: this.token,
        format: format || 'json'
      }
      // ParseHub returns gzip-compressed data; axios should decompress automatically
    });
    return response.data;
  }

  async getLastReadyRunData(projectToken: string, format?: 'json' | 'csv'): Promise<any> {
    let response = await http.get(`/projects/${projectToken}/last_ready_run/data`, {
      params: {
        api_key: this.token,
        format: format || 'json'
      }
    });
    return response.data;
  }

  async cancelRun(runToken: string): Promise<ParseHubRun> {
    let formData = new URLSearchParams();
    formData.append('api_key', this.token);

    let response = await http.post(`/runs/${runToken}/cancel`, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async deleteRun(runToken: string): Promise<{ run_token: string }> {
    let response = await http.delete(`/runs/${runToken}`, {
      params: {
        api_key: this.token
      }
    });
    return response.data;
  }
}
