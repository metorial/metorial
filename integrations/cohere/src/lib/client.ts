import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.cohere.com'
});

export class CohereClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ==================== Chat (v2) ====================

  async chat(params: {
    model: string;
    messages: Array<{
      role: string;
      content: string | Record<string, any>[];
    }>;
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    frequencyPenalty?: number;
    presencePenalty?: number;
    seed?: number;
    safetyMode?: string;
    responseFormat?: Record<string, any>;
    tools?: Record<string, any>[];
    documents?: Record<string, any>[];
    thinking?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      model: params.model,
      messages: params.messages,
      stream: false
    };

    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.stopSequences !== undefined) body.stop_sequences = params.stopSequences;
    if (params.frequencyPenalty !== undefined)
      body.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined) body.presence_penalty = params.presencePenalty;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.safetyMode !== undefined) body.safety_mode = params.safetyMode;
    if (params.responseFormat !== undefined) body.response_format = params.responseFormat;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.documents !== undefined) body.documents = params.documents;
    if (params.thinking !== undefined) body.thinking = params.thinking;

    let response = await http.post('/v2/chat', body, {
      headers: this.headers()
    });

    return response.data;
  }

  // ==================== Embed (v2) ====================

  async embed(params: {
    model: string;
    inputType: string;
    texts?: string[];
    images?: string[];
    embeddingTypes?: string[];
    outputDimension?: number;
    truncate?: string;
  }) {
    let body: Record<string, any> = {
      model: params.model,
      input_type: params.inputType
    };

    if (params.texts !== undefined) body.texts = params.texts;
    if (params.images !== undefined) body.images = params.images;
    if (params.embeddingTypes !== undefined) body.embedding_types = params.embeddingTypes;
    if (params.outputDimension !== undefined) body.output_dimension = params.outputDimension;
    if (params.truncate !== undefined) body.truncate = params.truncate;

    let response = await http.post('/v2/embed', body, {
      headers: this.headers()
    });

    return response.data;
  }

  // ==================== Rerank (v2) ====================

  async rerank(params: {
    model: string;
    query: string;
    documents: string[];
    topN?: number;
    maxTokensPerDoc?: number;
  }) {
    let body: Record<string, any> = {
      model: params.model,
      query: params.query,
      documents: params.documents
    };

    if (params.topN !== undefined) body.top_n = params.topN;
    if (params.maxTokensPerDoc !== undefined) body.max_tokens_per_doc = params.maxTokensPerDoc;

    let response = await http.post('/v2/rerank', body, {
      headers: this.headers()
    });

    return response.data;
  }

  // ==================== Tokenize / Detokenize (v1) ====================

  async tokenize(params: { text: string; model: string }) {
    let response = await http.post(
      '/v1/tokenize',
      {
        text: params.text,
        model: params.model
      },
      {
        headers: this.headers()
      }
    );

    return response.data;
  }

  async detokenize(params: { tokens: number[]; model: string }) {
    let response = await http.post(
      '/v1/detokenize',
      {
        tokens: params.tokens,
        model: params.model
      },
      {
        headers: this.headers()
      }
    );

    return response.data;
  }

  // ==================== Models (v1) ====================

  async listModels(params?: {
    pageSize?: number;
    pageToken?: string;
    endpoint?: string;
    defaultOnly?: boolean;
  }) {
    let queryParams: Record<string, any> = {};

    if (params?.pageSize !== undefined) queryParams.page_size = params.pageSize;
    if (params?.pageToken !== undefined) queryParams.page_token = params.pageToken;
    if (params?.endpoint !== undefined) queryParams.endpoint = params.endpoint;
    if (params?.defaultOnly !== undefined) queryParams.default_only = params.defaultOnly;

    let response = await http.get('/v1/models', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  // ==================== Datasets (v1) ====================

  async listDatasets(params?: {
    datasetType?: string;
    before?: string;
    after?: string;
    limit?: number;
    offset?: number;
    validationStatus?: string;
  }) {
    let queryParams: Record<string, any> = {};

    if (params?.datasetType !== undefined) queryParams.datasetType = params.datasetType;
    if (params?.before !== undefined) queryParams.before = params.before;
    if (params?.after !== undefined) queryParams.after = params.after;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.validationStatus !== undefined)
      queryParams.validationStatus = params.validationStatus;

    let response = await http.get('/v1/datasets', {
      headers: this.headers(),
      params: queryParams
    });

    return response.data;
  }

  async getDataset(datasetId: string) {
    let response = await http.get(`/v1/datasets/${datasetId}`, {
      headers: this.headers()
    });

    return response.data;
  }

  async deleteDataset(datasetId: string) {
    let response = await http.delete(`/v1/datasets/${datasetId}`, {
      headers: this.headers()
    });

    return response.data;
  }

  // ==================== Embed Jobs (v1) ====================

  async createEmbedJob(params: {
    model: string;
    datasetId: string;
    inputType: string;
    name?: string;
    embeddingTypes?: string[];
    truncate?: string;
  }) {
    let body: Record<string, any> = {
      model: params.model,
      dataset_id: params.datasetId,
      input_type: params.inputType
    };

    if (params.name !== undefined) body.name = params.name;
    if (params.embeddingTypes !== undefined) body.embedding_types = params.embeddingTypes;
    if (params.truncate !== undefined) body.truncate = params.truncate;

    let response = await http.post('/v1/embed-jobs', body, {
      headers: this.headers()
    });

    return response.data;
  }

  async listEmbedJobs() {
    let response = await http.get('/v1/embed-jobs', {
      headers: this.headers()
    });

    return response.data;
  }

  async getEmbedJob(jobId: string) {
    let response = await http.get(`/v1/embed-jobs/${jobId}`, {
      headers: this.headers()
    });

    return response.data;
  }

  async cancelEmbedJob(jobId: string) {
    let response = await http.post(
      `/v1/embed-jobs/${jobId}/cancel`,
      {},
      {
        headers: this.headers()
      }
    );

    return response.data;
  }
}
