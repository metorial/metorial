import { createAxios } from 'slates';

let BASE_URL = 'https://api.parallel.ai';

export interface SearchParams {
  objective?: string;
  searchQueries?: string[];
  mode?: 'one-shot' | 'agentic' | 'fast';
  maxResults?: number;
  excerpts?: {
    maxCharsPerResult?: number;
    maxCharsTotal?: number;
  };
  sourcePolicy?: {
    includeDomains?: string[];
    excludeDomains?: string[];
    afterDate?: string;
  };
}

export interface SearchResult {
  url: string;
  title: string;
  publishDate: string | null;
  excerpts: string[];
}

export interface SearchResponse {
  searchId: string;
  results: SearchResult[];
  warnings: string[] | null;
}

export interface ExtractParams {
  urls: string[];
  objective?: string;
  searchQueries?: string[];
  excerpts?: boolean | { maxCharsPerResult?: number; maxCharsTotal?: number };
  fullContent?: boolean | { maxCharsPerResult?: number; maxCharsTotal?: number };
}

export interface ExtractResult {
  url: string;
  title: string | null;
  publishDate: string | null;
  excerpts: string[] | null;
  fullContent: string | null;
}

export interface ExtractError {
  url: string;
  errorType: string;
  httpStatusCode: number | null;
  content: string | null;
}

export interface ExtractResponse {
  extractId: string;
  results: ExtractResult[];
  errors: ExtractError[];
  warnings: string[] | null;
}

export interface CreateTaskRunParams {
  input: string | Record<string, unknown>;
  processor: string;
  taskSpec?: {
    outputSchema?: string | Record<string, unknown>;
    inputSchema?: Record<string, unknown>;
  };
  metadata?: Record<string, string>;
  sourcePolicy?: {
    includeDomains?: string[];
    excludeDomains?: string[];
    afterDate?: string;
  };
  webhook?: {
    url: string;
    eventTypes: string[];
  };
}

export interface TaskRun {
  runId: string;
  interactionId: string;
  status: string;
  isActive: boolean;
  processor: string;
  metadata: Record<string, string> | null;
  createdAt: string;
  modifiedAt: string;
}

export interface TaskRunResult {
  output: unknown;
  basis: Array<{
    field: string;
    citations: Array<{ url: string; excerpts: string[] }>;
    reasoning: string;
    confidence: string;
  }>;
}

export interface ChatCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  responseFormat?: Record<string, unknown>;
  previousInteractionId?: string;
}

export interface ChatCompletionResponse {
  completionId: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    delta: { role: string; content: string };
    finishReason: string;
  }>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  basis: Array<{
    citations: Array<{ url: string; excerpts: string[] }>;
    reasoning: string;
    confidence: string;
  }> | null;
  interactionId: string;
}

export interface CreateFindAllRunParams {
  objective: string;
  entityType: string;
  matchConditions: Array<{ name: string; description: string }>;
  generator: string;
  matchLimit: number;
  metadata?: Record<string, string>;
  excludeList?: Array<{ name: string; url: string }>;
  webhook?: {
    url: string;
    eventTypes: string[];
  };
}

export interface FindAllRun {
  findallId: string;
  status: string;
  metrics: {
    generatedCandidatesCount: number;
    matchedCandidatesCount: number;
  };
  createdAt: string;
  modifiedAt: string;
}

export interface FindAllCandidate {
  candidateId: string;
  name: string;
  url: string;
  description: string;
  matchStatus: string;
  output: Record<string, { value: string; isMatched: boolean }>;
  basis: Array<{
    field: string;
    citations: Array<{ url: string; excerpts: string[] }>;
    reasoning: string;
    confidence: string;
  }>;
}

export interface FindAllResultResponse {
  candidates: FindAllCandidate[];
}

export interface CreateMonitorParams {
  query: string;
  frequency: string;
  webhook?: {
    url: string;
    eventTypes: string[];
  };
  metadata?: Record<string, string>;
  outputSchema?: Record<string, unknown>;
}

export interface Monitor {
  monitorId: string;
  query: string;
  status: string;
  frequency: string;
  createdAt: string;
  lastRunAt: string | null;
  metadata: Record<string, string> | null;
  webhook: { url: string; eventTypes: string[] } | null;
}

export interface MonitorEvent {
  type: string;
  eventGroupId: string;
  output: unknown;
  eventDate: string;
  sourceUrls: string[];
}

export interface UpdateMonitorParams {
  frequency?: string;
  webhook?: {
    url: string;
    eventTypes: string[];
  };
  metadata?: Record<string, string>;
}

export interface FindAllIngestResponse {
  entityType: string;
  matchConditions: Array<{ name: string; description: string }>;
}

export interface EnrichFindAllParams {
  processor: string;
  outputSchema: Record<string, unknown>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Search API ───

  async search(params: SearchParams): Promise<SearchResponse> {
    let body: Record<string, unknown> = {};
    if (params.objective) body.objective = params.objective;
    if (params.searchQueries) body.search_queries = params.searchQueries;
    if (params.mode) body.mode = params.mode;
    if (params.maxResults) body.max_results = params.maxResults;
    if (params.excerpts) {
      body.excerpts = {
        max_chars_per_result: params.excerpts.maxCharsPerResult,
        max_chars_total: params.excerpts.maxCharsTotal
      };
    }
    if (params.sourcePolicy) {
      body.source_policy = {
        include_domains: params.sourcePolicy.includeDomains,
        exclude_domains: params.sourcePolicy.excludeDomains,
        after_date: params.sourcePolicy.afterDate
      };
    }

    let resp = await this.axios.post('/v1beta/search', body);
    let d = resp.data;
    return {
      searchId: d.search_id,
      results: (d.results || []).map((r: any) => ({
        url: r.url,
        title: r.title,
        publishDate: r.publish_date ?? null,
        excerpts: r.excerpts || []
      })),
      warnings: d.warnings ?? null
    };
  }

  // ─── Extract API ───

  async extract(params: ExtractParams): Promise<ExtractResponse> {
    let body: Record<string, unknown> = {
      urls: params.urls
    };
    if (params.objective) body.objective = params.objective;
    if (params.searchQueries) body.search_queries = params.searchQueries;
    if (params.excerpts !== undefined) {
      if (typeof params.excerpts === 'boolean') {
        body.excerpts = params.excerpts;
      } else {
        body.excerpts = {
          max_chars_per_result: params.excerpts.maxCharsPerResult,
          max_chars_total: params.excerpts.maxCharsTotal
        };
      }
    }
    if (params.fullContent !== undefined) {
      if (typeof params.fullContent === 'boolean') {
        body.full_content = params.fullContent;
      } else {
        body.full_content = {
          max_chars_per_result: params.fullContent.maxCharsPerResult,
          max_chars_total: params.fullContent.maxCharsTotal
        };
      }
    }

    let resp = await this.axios.post('/v1beta/extract', body);
    let d = resp.data;
    return {
      extractId: d.extract_id,
      results: (d.results || []).map((r: any) => ({
        url: r.url,
        title: r.title ?? null,
        publishDate: r.publish_date ?? null,
        excerpts: r.excerpts ?? null,
        fullContent: r.full_content ?? null
      })),
      errors: (d.errors || []).map((e: any) => ({
        url: e.url,
        errorType: e.error_type,
        httpStatusCode: e.http_status_code ?? null,
        content: e.content ?? null
      })),
      warnings: d.warnings ?? null
    };
  }

  // ─── Task API (Deep Research) ───

  async createTaskRun(params: CreateTaskRunParams): Promise<TaskRun> {
    let body: Record<string, unknown> = {
      input: params.input,
      processor: params.processor
    };
    if (params.taskSpec) {
      let taskSpec: Record<string, unknown> = {};
      if (params.taskSpec.outputSchema) taskSpec.output_schema = params.taskSpec.outputSchema;
      if (params.taskSpec.inputSchema) taskSpec.input_schema = params.taskSpec.inputSchema;
      body.task_spec = taskSpec;
    }
    if (params.metadata) body.metadata = params.metadata;
    if (params.sourcePolicy) {
      body.source_policy = {
        include_domains: params.sourcePolicy.includeDomains,
        exclude_domains: params.sourcePolicy.excludeDomains,
        after_date: params.sourcePolicy.afterDate
      };
    }
    if (params.webhook) {
      body.webhook = {
        url: params.webhook.url,
        event_types: params.webhook.eventTypes
      };
    }

    let headers: Record<string, string> = {};
    if (params.webhook) {
      headers['parallel-beta'] = 'webhook-2025-08-12';
    }

    let resp = await this.axios.post('/v1/tasks/runs', body, { headers });
    return this.mapTaskRun(resp.data);
  }

  async getTaskRun(runId: string): Promise<TaskRun> {
    let resp = await this.axios.get(`/v1/tasks/runs/${runId}`);
    return this.mapTaskRun(resp.data);
  }

  async getTaskRunResult(runId: string): Promise<TaskRunResult> {
    let resp = await this.axios.get(`/v1/tasks/runs/${runId}/result`);
    let d = resp.data;
    return {
      output: d.output,
      basis: (d.basis || []).map((b: any) => ({
        field: b.field,
        citations: (b.citations || []).map((c: any) => ({
          url: c.url,
          excerpts: c.excerpts || []
        })),
        reasoning: b.reasoning,
        confidence: b.confidence
      }))
    };
  }

  private mapTaskRun(d: any): TaskRun {
    return {
      runId: d.run_id,
      interactionId: d.interaction_id,
      status: d.status,
      isActive: d.is_active,
      processor: d.processor,
      metadata: d.metadata ?? null,
      createdAt: d.created_at,
      modifiedAt: d.modified_at
    };
  }

  // ─── Chat Completions API ───

  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    let body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      stream: false
    };
    if (params.responseFormat) body.response_format = params.responseFormat;
    if (params.previousInteractionId)
      body.previous_interaction_id = params.previousInteractionId;

    let resp = await this.axios.post('/v1beta/chat/completions', body, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
    let d = resp.data;
    return {
      completionId: d.id,
      object: d.object,
      created: d.created,
      model: d.model,
      choices: (d.choices || []).map((c: any) => ({
        delta: {
          role: c.delta?.role ?? c.message?.role ?? 'assistant',
          content: c.delta?.content ?? c.message?.content ?? ''
        },
        finishReason: c.finish_reason
      })),
      usage: {
        promptTokens: d.usage?.prompt_tokens ?? 0,
        completionTokens: d.usage?.completion_tokens ?? 0,
        totalTokens: d.usage?.total_tokens ?? 0
      },
      basis: d.basis
        ? d.basis.map((b: any) => ({
            citations: (b.citations || []).map((c: any) => ({
              url: c.url,
              excerpts: c.excerpts || []
            })),
            reasoning: b.reasoning,
            confidence: b.confidence
          }))
        : null,
      interactionId: d.interaction_id
    };
  }

  // ─── FindAll API ───

  async ingestFindAll(objective: string): Promise<FindAllIngestResponse> {
    let resp = await this.axios.post(
      '/v1beta/findall/ingest',
      { objective },
      {
        headers: { 'parallel-beta': 'findall-2025-09-15' }
      }
    );
    let d = resp.data;
    return {
      entityType: d.entity_type,
      matchConditions: (d.match_conditions || []).map((m: any) => ({
        name: m.name,
        description: m.description
      }))
    };
  }

  async createFindAllRun(params: CreateFindAllRunParams): Promise<{ findallId: string }> {
    let body: Record<string, unknown> = {
      objective: params.objective,
      entity_type: params.entityType,
      match_conditions: params.matchConditions.map(m => ({
        name: m.name,
        description: m.description
      })),
      generator: params.generator,
      match_limit: params.matchLimit
    };
    if (params.metadata) body.metadata = params.metadata;
    if (params.excludeList) {
      body.exclude_list = params.excludeList.map(e => ({
        name: e.name,
        url: e.url
      }));
    }
    if (params.webhook) {
      body.webhook = {
        url: params.webhook.url,
        event_types: params.webhook.eventTypes
      };
    }

    let resp = await this.axios.post('/v1beta/findall/runs', body, {
      headers: { 'parallel-beta': 'findall-2025-09-15' }
    });
    return { findallId: resp.data.findall_id };
  }

  async getFindAllRun(findallId: string): Promise<FindAllRun> {
    let resp = await this.axios.get(`/v1beta/findall/runs/${findallId}`, {
      headers: { 'parallel-beta': 'findall-2025-09-15' }
    });
    let d = resp.data;
    return {
      findallId: d.findall_id,
      status: d.status,
      metrics: {
        generatedCandidatesCount: d.metrics?.generated_candidates_count ?? 0,
        matchedCandidatesCount: d.metrics?.matched_candidates_count ?? 0
      },
      createdAt: d.created_at,
      modifiedAt: d.modified_at
    };
  }

  async getFindAllResults(findallId: string): Promise<FindAllResultResponse> {
    let resp = await this.axios.get(`/v1beta/findall/runs/${findallId}/result`, {
      headers: { 'parallel-beta': 'findall-2025-09-15' }
    });
    let d = resp.data;
    return {
      candidates: (d.candidates || []).map((c: any) => ({
        candidateId: c.candidate_id,
        name: c.name,
        url: c.url,
        description: c.description,
        matchStatus: c.match_status,
        output: c.output ?? {},
        basis: (c.basis || []).map((b: any) => ({
          field: b.field,
          citations: (b.citations || []).map((ci: any) => ({
            url: ci.url,
            excerpts: ci.excerpts || []
          })),
          reasoning: b.reasoning,
          confidence: b.confidence
        }))
      }))
    };
  }

  async enrichFindAll(findallId: string, params: EnrichFindAllParams): Promise<void> {
    await this.axios.post(
      `/v1beta/findall/runs/${findallId}/enrich`,
      {
        processor: params.processor,
        output_schema: params.outputSchema
      },
      {
        headers: { 'parallel-beta': 'findall-2025-09-15' }
      }
    );
  }

  async cancelFindAll(findallId: string): Promise<void> {
    await this.axios.post(
      `/v1beta/findall/runs/${findallId}/cancel`,
      {},
      {
        headers: { 'parallel-beta': 'findall-2025-09-15' }
      }
    );
  }

  // ─── Monitor API ───

  async createMonitor(params: CreateMonitorParams): Promise<Monitor> {
    let body: Record<string, unknown> = {
      query: params.query,
      frequency: params.frequency
    };
    if (params.webhook) {
      body.webhook = {
        url: params.webhook.url,
        event_types: params.webhook.eventTypes
      };
    }
    if (params.metadata) body.metadata = params.metadata;
    if (params.outputSchema) body.output_schema = params.outputSchema;

    let resp = await this.axios.post('/v1alpha/monitors', body);
    return this.mapMonitor(resp.data);
  }

  async getMonitor(monitorId: string): Promise<Monitor> {
    let resp = await this.axios.get(`/v1alpha/monitors/${monitorId}`);
    return this.mapMonitor(resp.data);
  }

  async listMonitors(): Promise<Monitor[]> {
    let resp = await this.axios.get('/v1alpha/monitors/list');
    let items = resp.data?.monitors ?? resp.data ?? [];
    if (!Array.isArray(items)) items = [];
    return items.map((d: any) => this.mapMonitor(d));
  }

  async updateMonitor(monitorId: string, params: UpdateMonitorParams): Promise<Monitor> {
    let body: Record<string, unknown> = {};
    if (params.frequency) body.frequency = params.frequency;
    if (params.webhook) {
      body.webhook = {
        url: params.webhook.url,
        event_types: params.webhook.eventTypes
      };
    }
    if (params.metadata) body.metadata = params.metadata;

    let resp = await this.axios.post(`/v1alpha/monitors/${monitorId}`, body);
    return this.mapMonitor(resp.data);
  }

  async deleteMonitor(monitorId: string): Promise<void> {
    await this.axios.delete(`/v1alpha/monitors/${monitorId}`);
  }

  async getMonitorEvents(monitorId: string): Promise<MonitorEvent[]> {
    let resp = await this.axios.get(`/v1alpha/monitors/${monitorId}/events`);
    let items = resp.data?.events ?? resp.data ?? [];
    if (!Array.isArray(items)) items = [];
    return items.map((e: any) => ({
      type: e.type,
      eventGroupId: e.event_group_id,
      output: e.output,
      eventDate: e.event_date,
      sourceUrls: e.source_urls || []
    }));
  }

  async getMonitorEventGroup(
    monitorId: string,
    eventGroupId: string
  ): Promise<MonitorEvent[]> {
    let resp = await this.axios.get(
      `/v1alpha/monitors/${monitorId}/event_groups/${eventGroupId}`
    );
    let items = resp.data?.events ?? resp.data ?? [];
    if (!Array.isArray(items)) {
      return [
        {
          type: resp.data?.type ?? 'event',
          eventGroupId: resp.data?.event_group_id ?? eventGroupId,
          output: resp.data?.output,
          eventDate: resp.data?.event_date ?? '',
          sourceUrls: resp.data?.source_urls || []
        }
      ];
    }
    return items.map((e: any) => ({
      type: e.type,
      eventGroupId: e.event_group_id ?? eventGroupId,
      output: e.output,
      eventDate: e.event_date,
      sourceUrls: e.source_urls || []
    }));
  }

  private mapMonitor(d: any): Monitor {
    return {
      monitorId: d.monitor_id,
      query: d.query,
      status: d.status,
      frequency: d.frequency,
      createdAt: d.created_at,
      lastRunAt: d.last_run_at ?? null,
      metadata: d.metadata ?? null,
      webhook: d.webhook
        ? {
            url: d.webhook.url,
            eventTypes: d.webhook.event_types || []
          }
        : null
    };
  }
}
