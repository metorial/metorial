import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';

let rowSchema = z.record(z.string(), z.unknown());
let appSummarySchema = z
  .object({
    appId: z.string(),
    appName: z.string(),
    creditEstimate: z.number().optional()
  })
  .passthrough();
let appDetailSchema = appSummarySchema.extend({
  dataFields: z.array(z.string()).optional(),
  responseFields: z
    .array(
      z
        .object({
          name: z.string().optional(),
          type: z.string().optional(),
          description: z.string().optional()
        })
        .passthrough()
    )
    .optional()
});
let jobCreatedSchema = z.object({ jobId: z.string(), jobStatus: z.string() }).passthrough();
let jobStatusSchema = jobCreatedSchema.extend({
  result: z.array(rowSchema).optional(),
  responseFields: z
    .array(
      z
        .object({
          name: z.string(),
          type: z.string().optional(),
          description: z.string().optional()
        })
        .passthrough()
    )
    .optional()
});
export let webhookSchema = z
  .object({
    webhookId: z.string().optional(),
    webhookName: z.string().optional(),
    restrictedAppIds: z.array(z.string()).optional(),
    webhookType: z.enum(['job', 'row']).optional(),
    endpointUrl: z.string().optional(),
    webhookReference: z.string().optional()
  })
  .passthrough();
export let createdWebhookSchema = webhookSchema.extend({
  webhookId: z.string(),
  webhookType: z.enum(['job', 'row']),
  endpointUrl: z.string()
});

function parseResponse<T>(schema: z.ZodType<T>, value: unknown, operation: string): T {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError(
      `Promptmate.io returned an invalid response for ${operation}.`,
      {
        reason: 'promptmate_invalid_response'
      }
    );
  }
  return result.data;
}

function requireIdentifier(value: string, label: string) {
  if (!value.trim()) {
    throw createApiServiceError(`${label} must not be empty.`);
  }
}

export interface AppSummary {
  appId: string;
  appName: string;
  creditEstimate?: number;
}

export type AppDetail = z.infer<typeof appDetailSchema>;

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

export type WebhookSummary = z.infer<typeof webhookSchema>;

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

  private async request<T>(
    operation: string,
    request: () => Promise<{ data: unknown }>,
    schema: z.ZodType<T>
  ): Promise<T> {
    try {
      let response = await request();
      return parseResponse(schema, response.data, operation);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Promptmate.io',
        reason: 'promptmate_request_failed',
        operation,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  // ── Apps ──────────────────────────────────────────────

  async listApps(): Promise<AppSummary[]> {
    return this.request('list apps', () => this.http.get('/apps'), z.array(appSummarySchema));
  }

  async getApp(appId: string): Promise<AppDetail> {
    requireIdentifier(appId, 'App ID');
    return this.request(
      'get app',
      () =>
        this.http.get('/app', {
          params: { appId }
        }),
      appDetailSchema
    );
  }

  // ── App Jobs ──────────────────────────────────────────

  async createJob(params: CreateJobParams): Promise<JobCreateResponse> {
    requireIdentifier(params.appId, 'App ID');
    return this.request(
      'create app job',
      () => this.http.post('/app-jobs', params),
      jobCreatedSchema
    );
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    requireIdentifier(jobId, 'Job ID');
    return this.request(
      'get job status',
      () =>
        this.http.get('/app-jobs', {
          params: { jobId }
        }),
      jobStatusSchema
    );
  }

  // ── App Results ───────────────────────────────────────

  async getAppResults(appId: string, onlyDefaultResultFields?: boolean) {
    requireIdentifier(appId, 'App ID');
    let raw = await this.request(
      'get app results',
      () =>
        this.http.get('/app-results', {
          params: {
            appId,
            ...(onlyDefaultResultFields !== undefined ? { onlyDefaultResultFields } : {})
          }
        }),
      z.union([
        z.array(rowSchema),
        z
          .object({
            appId: z.string(),
            resultData: z.array(rowSchema),
            responseFields: z.array(rowSchema).optional()
          })
          .passthrough()
      ])
    );
    return Array.isArray(raw)
      ? { rows: raw, raw }
      : { rows: raw.resultData, appId: raw.appId, responseFields: raw.responseFields, raw };
  }

  // ── Templates ─────────────────────────────────────────

  async listTemplates(): Promise<TemplateSummary[]> {
    return this.request(
      'list templates',
      () => this.http.get('/templates'),
      z.array(
        z
          .object({
            templateId: z.string(),
            templateName: z.string(),
            description: z.string().optional(),
            category: z.string().optional()
          })
          .passthrough()
      )
    );
  }

  async useTemplate(templateId: string): Promise<Record<string, unknown>> {
    requireIdentifier(templateId, 'Template ID');
    return this.request(
      'use template',
      () => this.http.post('/templates', { templateId }),
      rowSchema
    );
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

  async listLanguageValues(): Promise<string[]> {
    return this.request(
      'list languages',
      () => this.http.get('/reference/languages'),
      z.array(z.string())
    );
  }

  // ── Projects ──────────────────────────────────────────

  async listProjects(): Promise<ProjectSummary[]> {
    return this.request(
      'list projects',
      () => this.http.get('/projects'),
      z.array(
        z
          .object({
            projectId: z.string(),
            projectName: z.string()
          })
          .passthrough()
      )
    );
  }

  // ── User Info ─────────────────────────────────────────

  async getUserInfo(): Promise<Record<string, unknown>> {
    return this.request('get user information', () => this.http.get('/userInfo'), rowSchema);
  }

  // ── Webhooks ──────────────────────────────────────────

  async listWebhooks(): Promise<WebhookSummary[]> {
    return this.request(
      'list webhooks',
      () => this.http.get('/webhooks'),
      z.array(webhookSchema)
    );
  }

  async createWebhook(params: CreateWebhookParams) {
    let data = await this.request(
      'create webhook',
      () => this.http.post('/webhooks', params),
      z.union([createdWebhookSchema, z.array(createdWebhookSchema).min(1)])
    );
    return Array.isArray(data) ? data : [data];
  }

  async deleteWebhook(webhookReference: string): Promise<void> {
    requireIdentifier(webhookReference, 'Webhook reference');
    await this.request(
      'delete webhook',
      () => this.http.delete(`/webhooks/${encodeURIComponent(webhookReference)}`),
      z.unknown()
    );
  }
}
