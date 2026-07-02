import { createAxios } from 'slates';

let BASE_URL = 'https://app.neuronwriter.com/neuron-api/0.5/writer';

export class NeuronWriterClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listProjects(): Promise<NeuronProject[]> {
    let response = await this.axios.post('/list-projects');
    return response.data;
  }

  async createQuery(params: CreateQueryParams): Promise<CreateQueryResponse> {
    let response = await this.axios.post('/new-query', params);
    return response.data;
  }

  async getQuery(queryId: string): Promise<GetQueryResponse> {
    let response = await this.axios.post('/get-query', { query: queryId });
    return response.data;
  }

  async listQueries(params: ListQueriesParams): Promise<QueryListItem[]> {
    let response = await this.axios.post('/list-queries', params);
    return response.data;
  }

  async getContent(queryId: string, revisionType?: string): Promise<GetContentResponse> {
    let body: Record<string, string> = { query: queryId };
    if (revisionType) {
      body.revision_type = revisionType;
    }
    let response = await this.axios.post('/get-content', body);
    return response.data;
  }

  async importContent(params: ImportContentParams): Promise<ImportContentResponse> {
    let body: Record<string, string> = { query: params.queryId };
    if (params.html) body.html = params.html;
    if (params.url) body.url = params.url;
    if (params.title) body.title = params.title;
    if (params.description) body.description = params.description;
    if (params.containerId) body.id = params.containerId;
    if (params.containerClass) body.class = params.containerClass;
    let response = await this.axios.post('/import-content', body);
    return response.data;
  }

  async evaluateContent(params: EvaluateContentParams): Promise<EvaluateContentResponse> {
    let body: Record<string, string> = { query: params.queryId };
    if (params.html) body.html = params.html;
    if (params.url) body.url = params.url;
    if (params.title) body.title = params.title;
    if (params.description) body.description = params.description;
    if (params.containerId) body.id = params.containerId;
    if (params.containerClass) body.class = params.containerClass;
    let response = await this.axios.post('/evaluate-content', body);
    return response.data;
  }
}

// --- Types ---

export interface NeuronProject {
  project: string;
  name: string;
  language: string;
  engine: string;
}

export interface CreateQueryParams {
  project: string;
  keyword: string;
  engine: string;
  language: string;
  additional_keywords?: string[];
  competitors_mode?: string;
}

export interface CreateQueryResponse {
  query: string;
  query_url: string;
  share_url: string;
  readonly_url: string;
}

export interface GetQueryResponse {
  status: string;
  query?: string;
  keyword?: string;
  language?: string;
  engine?: string;
  tags?: string[];
  created?: string;
  updated?: string;
  metrics?: Record<string, any>;
  terms_txt?: Record<string, any>;
  terms?: Record<string, any>;
  ideas?: Record<string, any>;
  competitors?: any[];
  entities?: any[];
}

export interface ListQueriesParams {
  project: string;
  status?: string;
  source?: string;
  created?: string;
  updated?: string;
  keyword?: string;
  language?: string;
  engine?: string;
  tags?: string | string[];
}

export interface QueryListItem {
  query: string;
  keyword: string;
  language: string;
  engine: string;
  status: string;
  source: string;
  tags: string[];
  created: string;
  updated: string;
  query_url?: string;
  share_url?: string;
  readonly_url?: string;
}

export interface GetContentResponse {
  content: string;
  title: string;
  description: string;
  created: string;
  type: string;
}

export interface ImportContentParams {
  queryId: string;
  html?: string;
  url?: string;
  title?: string;
  description?: string;
  containerId?: string;
  containerClass?: string;
}

export interface ImportContentResponse {
  status: string;
  error?: string;
}

export interface EvaluateContentParams {
  queryId: string;
  html?: string;
  url?: string;
  title?: string;
  description?: string;
  containerId?: string;
  containerClass?: string;
}

export interface EvaluateContentResponse {
  status: string;
  score?: number;
  error?: string;
}
