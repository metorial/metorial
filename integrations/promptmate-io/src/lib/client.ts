import { createAxios } from 'slates';

export interface AppSummary {
  appId: string;
  appName: string;
  creditEstimate?: number;
}

export interface AppDetail {
  appId: string;
  appName: string;
  creditEstimate?: number;
  dataFields?: string[];
  responseFields?: Array<{ name: string; type?: string; description?: string }>;
}

export interface CreateJobParams {
  appId: string;
  callBackUrl?: string;
  noMailOnFinish?: boolean;
  config?: {
    language?: string;
    country?: string;
  };
  data: Record<string, string>[];
}

export interface JobCreateResponse {
  jobId: string;
  jobStatus: string;
}

export interface JobStatusResponse {
  jobId: string;
  jobStatus: string;
  result?: Record<string, unknown>[];
  responseFields?: Array<{ name: string; type?: string; description?: string }>;
}

export interface TemplateSummary {
  templateId: string;
  templateName: string;
  description?: string;
  category?: string;
}

export interface UseTemplateParams {
  templateId: string;
}

export interface WebhookSummary {
  webhookId: string;
  webhookName?: string;
  restrictedAppIds?: string[];
  webhookType: 'job' | 'row';
  endpointUrl: string;
  webhookReference?: string;
}

export interface CreateWebhookParams {
  webhookName?: string;
  restrictedAppIds?: string[];
  webhookType: 'job' | 'row';
  endpointUrl: string;
  webhookReference?: string;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
}

export interface LanguageEntry {
  languageCode: string;
  languageName: string;
}

export interface CountryEntry {
  countryCode: string;
  countryName: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.promptmate.io/v1',
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Apps ──────────────────────────────────────────────

  async listApps(): Promise<AppSummary[]> {
    let response = await this.http.get('/apps');
    return response.data;
  }

  async getApp(appId: string): Promise<AppDetail> {
    let response = await this.http.get('/app', {
      params: { appId }
    });
    return response.data;
  }

  // ── App Jobs ──────────────────────────────────────────

  async createJob(params: CreateJobParams): Promise<JobCreateResponse> {
    let response = await this.http.post('/app-jobs', params);
    return response.data;
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    let response = await this.http.get('/app-jobs', {
      params: { jobId }
    });
    return response.data;
  }

  // ── App Results ───────────────────────────────────────

  async getAppResults(
    appId: string,
    onlyDefaultResultFields?: boolean
  ): Promise<Record<string, unknown>[]> {
    let response = await this.http.get('/app-results', {
      params: {
        appId,
        ...(onlyDefaultResultFields !== undefined ? { onlyDefaultResultFields } : {})
      }
    });
    return response.data;
  }

  // ── Templates ─────────────────────────────────────────

  async listTemplates(): Promise<TemplateSummary[]> {
    let response = await this.http.get('/templates');
    return response.data;
  }

  async useTemplate(templateId: string): Promise<Record<string, unknown>> {
    let response = await this.http.post('/templates', { templateId });
    return response.data;
  }

  // ── Reference Data ────────────────────────────────────

  async listLanguages(): Promise<LanguageEntry[]> {
    let response = await this.http.get('/reference/languages');
    return response.data;
  }

  async listCountries(): Promise<CountryEntry[]> {
    let response = await this.http.get('/reference/countries');
    return response.data;
  }

  // ── Projects ──────────────────────────────────────────

  async listProjects(): Promise<ProjectSummary[]> {
    let response = await this.http.get('/projects');
    return response.data;
  }

  // ── User Info ─────────────────────────────────────────

  async getUserInfo(): Promise<Record<string, unknown>> {
    let response = await this.http.get('/userInfo');
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────

  async listWebhooks(): Promise<WebhookSummary[]> {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async createWebhook(params: CreateWebhookParams): Promise<WebhookSummary> {
    let response = await this.http.post('/webhooks', params);
    let data = response.data;
    // The API returns an array; return the first element
    return Array.isArray(data) ? data[0] : data;
  }

  async deleteWebhook(webhookReference: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookReference}`);
  }
}
