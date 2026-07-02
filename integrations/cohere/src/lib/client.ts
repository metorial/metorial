import { createApiServiceError, createAxios } from 'slates';
import { cohereApiError } from './errors';

let http = createAxios({
  baseURL: 'https://api.cohere.com'
});

http.interceptors?.response?.use(
  (response: any) => response,
  (error: unknown) => Promise.reject(cohereApiError(error))
);

let sanitizeMultipartHeader = (value: string) => value.replace(/[\r\n"]/g, '_');

let appendMultipartField = (
  parts: Buffer[],
  boundary: string,
  name: string,
  value: string | number | boolean
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${sanitizeMultipartHeader(name)}"\r\n\r\n${String(value)}\r\n`
    )
  );
};

let appendMultipartFile = (
  parts: Buffer[],
  boundary: string,
  name: string,
  filename: string,
  content: Buffer,
  mimeType: string
) => {
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${sanitizeMultipartHeader(name)}"; filename="${sanitizeMultipartHeader(filename)}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
  );
  parts.push(content);
  parts.push(Buffer.from('\r\n'));
};

let decodeFileContent = (params: {
  content?: string;
  contentBase64?: string;
  fieldName: string;
  required?: boolean;
}) => {
  let hasContent = params.content !== undefined;
  let hasBase64 = params.contentBase64 !== undefined;
  let required = params.required ?? true;

  if (hasContent && hasBase64) {
    throw createApiServiceError(
      `Provide only one of ${params.fieldName} or ${params.fieldName}Base64.`
    );
  }

  if (required && !hasContent && !hasBase64) {
    throw createApiServiceError(
      `Provide one of ${params.fieldName} or ${params.fieldName}Base64.`
    );
  }

  if (!hasContent && !hasBase64) {
    return undefined;
  }

  if (hasBase64) {
    return Buffer.from(params.contentBase64 ?? '', 'base64');
  }

  return Buffer.from(params.content ?? '', 'utf8');
};

let buildMultipartBody = (params: {
  fields?: Record<string, string | number | boolean | undefined>;
  files: Array<{
    fieldName: string;
    filename: string;
    fileContent: Buffer;
    mimeType?: string;
  }>;
}) => {
  let boundary = `----SlatesCohereBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
  let parts: Buffer[] = [];

  for (let [name, value] of Object.entries(params.fields ?? {})) {
    if (value !== undefined) {
      appendMultipartField(parts, boundary, name, value);
    }
  }

  for (let file of params.files) {
    appendMultipartFile(
      parts,
      boundary,
      file.fieldName,
      file.filename,
      file.fileContent,
      file.mimeType ?? 'application/octet-stream'
    );
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

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
    k?: number;
    p?: number;
    seed?: number;
    logprobs?: boolean;
    safetyMode?: string;
    toolChoice?: string;
    strictTools?: boolean;
    priority?: number;
    citationOptions?: Record<string, any>;
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
    if (params.k !== undefined) body.k = params.k;
    if (params.p !== undefined) body.p = params.p;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.logprobs !== undefined) body.logprobs = params.logprobs;
    if (params.safetyMode !== undefined) body.safety_mode = params.safetyMode;
    if (params.toolChoice !== undefined) body.tool_choice = params.toolChoice;
    if (params.strictTools !== undefined) body.strict_tools = params.strictTools;
    if (params.priority !== undefined) body.priority = params.priority;
    if (params.citationOptions !== undefined) body.citation_options = params.citationOptions;
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
    inputs?: Record<string, any>[];
    embeddingTypes?: string[];
    outputDimension?: number;
    maxTokens?: number;
    truncate?: string;
    priority?: number;
  }) {
    let body: Record<string, any> = {
      model: params.model,
      input_type: params.inputType
    };

    if (params.texts !== undefined) body.texts = params.texts;
    if (params.images !== undefined) body.images = params.images;
    if (params.inputs !== undefined) body.inputs = params.inputs;
    if (params.embeddingTypes !== undefined) body.embedding_types = params.embeddingTypes;
    if (params.outputDimension !== undefined) body.output_dimension = params.outputDimension;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.truncate !== undefined) body.truncate = params.truncate;
    if (params.priority !== undefined) body.priority = params.priority;

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

  // ==================== Audio Transcriptions (v2) ====================

  async transcribeAudio(params: {
    model: string;
    language: string;
    filename: string;
    fileContent?: string;
    fileContentBase64?: string;
    mimeType?: string;
    temperature?: number;
  }) {
    let fileContent = decodeFileContent({
      content: params.fileContent,
      contentBase64: params.fileContentBase64,
      fieldName: 'fileContent'
    });
    if (fileContent === undefined) {
      throw createApiServiceError('Provide one of fileContent or fileContentBase64.');
    }

    let multipart = buildMultipartBody({
      fields: {
        model: params.model,
        language: params.language,
        temperature: params.temperature
      },
      files: [
        {
          fieldName: 'file',
          filename: params.filename,
          fileContent,
          mimeType: params.mimeType
        }
      ]
    });

    let response = await http.post('/v2/audio/transcriptions', multipart.body, {
      headers: {
        ...this.headers(),
        'Content-Type': multipart.contentType
      }
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

  async getModel(model: string) {
    let response = await http.get(`/v1/models/${encodeURIComponent(model)}`, {
      headers: this.headers()
    });

    return response.data;
  }

  // ==================== Datasets (v1) ====================

  async createDataset(params: {
    name: string;
    datasetType: string;
    fileName: string;
    fileContent?: string;
    fileContentBase64?: string;
    mimeType?: string;
    evalFileName?: string;
    evalFileContent?: string;
    evalFileContentBase64?: string;
    evalMimeType?: string;
    keepOriginalFile?: boolean;
    skipMalformedInput?: boolean;
    keepFields?: string[];
    optionalFields?: string[];
    textSeparator?: string;
    csvDelimiter?: string;
  }) {
    let dataContent = decodeFileContent({
      content: params.fileContent,
      contentBase64: params.fileContentBase64,
      fieldName: 'fileContent'
    });
    if (dataContent === undefined) {
      throw createApiServiceError('Provide one of fileContent or fileContentBase64.');
    }
    let evalContent = decodeFileContent({
      content: params.evalFileContent,
      contentBase64: params.evalFileContentBase64,
      fieldName: 'evalFileContent',
      required: false
    });

    let files = [
      {
        fieldName: 'data',
        filename: params.fileName,
        fileContent: dataContent,
        mimeType: params.mimeType
      }
    ];
    if (evalContent !== undefined) {
      files.push({
        fieldName: 'eval_data',
        filename: params.evalFileName ?? 'eval-data.jsonl',
        fileContent: evalContent,
        mimeType: params.evalMimeType
      });
    }

    let multipart = buildMultipartBody({ files });
    let queryParams: Record<string, any> = {
      name: params.name,
      type: params.datasetType
    };

    if (params.keepOriginalFile !== undefined)
      queryParams.keep_original_file = params.keepOriginalFile;
    if (params.skipMalformedInput !== undefined)
      queryParams.skip_malformed_input = params.skipMalformedInput;
    if (params.keepFields !== undefined) queryParams.keep_fields = params.keepFields;
    if (params.optionalFields !== undefined)
      queryParams.optional_fields = params.optionalFields;
    if (params.textSeparator !== undefined) queryParams.text_separator = params.textSeparator;
    if (params.csvDelimiter !== undefined) queryParams.csv_delimiter = params.csvDelimiter;

    let response = await http.post('/v1/datasets', multipart.body, {
      headers: {
        ...this.headers(),
        'Content-Type': multipart.contentType
      },
      params: queryParams
    });

    return response.data;
  }

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

  async getDatasetUsage() {
    let response = await http.get('/v1/datasets/usage', {
      headers: this.headers()
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
