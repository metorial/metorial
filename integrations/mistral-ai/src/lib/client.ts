import { createAxios } from 'slates';

export class MistralClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.mistral.ai/v1'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Chat Completions ──

  async chatCompletion(params: {
    model: string;
    messages: Array<{
      role: string;
      content: string | any[];
      name?: string;
      toolCallId?: string;
      toolCalls?: any[];
    }>;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    minTokens?: number;
    stop?: string | string[];
    randomSeed?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    n?: number;
    responseFormat?: any;
    tools?: any[];
    toolChoice?: string | any;
    parallelToolCalls?: boolean;
    safePrompt?: boolean;
  }) {
    let body: any = {
      model: params.model,
      messages: params.messages.map(m => {
        let msg: any = { role: m.role, content: m.content };
        if (m.name) msg.name = m.name;
        if (m.toolCallId) msg.tool_call_id = m.toolCallId;
        if (m.toolCalls) msg.tool_calls = m.toolCalls;
        return msg;
      }),
      stream: false
    };

    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.minTokens !== undefined) body.min_tokens = params.minTokens;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.randomSeed !== undefined) body.random_seed = params.randomSeed;
    if (params.presencePenalty !== undefined) body.presence_penalty = params.presencePenalty;
    if (params.frequencyPenalty !== undefined)
      body.frequency_penalty = params.frequencyPenalty;
    if (params.n !== undefined) body.n = params.n;
    if (params.responseFormat !== undefined) body.response_format = params.responseFormat;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.toolChoice !== undefined) body.tool_choice = params.toolChoice;
    if (params.parallelToolCalls !== undefined)
      body.parallel_tool_calls = params.parallelToolCalls;
    if (params.safePrompt !== undefined) body.safe_prompt = params.safePrompt;

    let response = await this.axios.post('/chat/completions', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ── FIM Completions ──

  async fimCompletion(params: {
    model: string;
    prompt: string;
    suffix?: string;
    maxTokens?: number;
    minTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string | string[];
    randomSeed?: number;
  }) {
    let body: any = {
      model: params.model,
      prompt: params.prompt,
      stream: false
    };

    if (params.suffix !== undefined) body.suffix = params.suffix;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.minTokens !== undefined) body.min_tokens = params.minTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.randomSeed !== undefined) body.random_seed = params.randomSeed;

    let response = await this.axios.post('/fim/completions', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ── Agents Completions ──

  async agentCompletion(params: {
    agentId: string;
    messages: Array<{
      role: string;
      content: string | any[];
    }>;
    maxTokens?: number;
    stop?: string | string[];
    randomSeed?: number;
    responseFormat?: any;
    tools?: any[];
    toolChoice?: string | any;
    parallelToolCalls?: boolean;
    presencePenalty?: number;
    frequencyPenalty?: number;
  }) {
    let body: any = {
      agent_id: params.agentId,
      messages: params.messages,
      stream: false
    };

    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.randomSeed !== undefined) body.random_seed = params.randomSeed;
    if (params.responseFormat !== undefined) body.response_format = params.responseFormat;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.toolChoice !== undefined) body.tool_choice = params.toolChoice;
    if (params.parallelToolCalls !== undefined)
      body.parallel_tool_calls = params.parallelToolCalls;
    if (params.presencePenalty !== undefined) body.presence_penalty = params.presencePenalty;
    if (params.frequencyPenalty !== undefined)
      body.frequency_penalty = params.frequencyPenalty;

    let response = await this.axios.post('/agents/completions', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ── Embeddings ──

  async createEmbeddings(params: {
    model: string;
    input: string | string[];
    encodingFormat?: string;
    outputDimension?: number;
    outputDtype?: string;
  }) {
    let body: any = {
      model: params.model,
      input: params.input
    };

    if (params.encodingFormat !== undefined) body.encoding_format = params.encodingFormat;
    if (params.outputDimension !== undefined) body.output_dimension = params.outputDimension;
    if (params.outputDtype !== undefined) body.output_dtype = params.outputDtype;

    let response = await this.axios.post('/embeddings', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ── Moderation ──

  async moderate(params: { model: string; input: string | string[] }) {
    let body = {
      model: params.model,
      input: params.input
    };

    let response = await this.axios.post('/moderations', body, {
      headers: this.headers
    });

    return response.data;
  }

  async moderateChat(params: {
    model: string;
    input: Array<{ role: string; content: string }>;
  }) {
    let body = {
      model: params.model,
      input: params.input
    };

    let response = await this.axios.post('/chat/moderations', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ── OCR ──

  async ocr(params: {
    model: string;
    document: any;
    pages?: number[];
    includeImageBase64?: boolean;
    imageLimit?: number;
    imageMinSize?: number;
    tableFormat?: string;
    extractHeader?: boolean;
    extractFooter?: boolean;
  }) {
    let body: any = {
      model: params.model,
      document: params.document
    };

    if (params.pages !== undefined) body.pages = params.pages;
    if (params.includeImageBase64 !== undefined)
      body.include_image_base64 = params.includeImageBase64;
    if (params.imageLimit !== undefined) body.image_limit = params.imageLimit;
    if (params.imageMinSize !== undefined) body.image_min_size = params.imageMinSize;
    if (params.tableFormat !== undefined) body.table_format = params.tableFormat;
    if (params.extractHeader !== undefined) body.extract_header = params.extractHeader;
    if (params.extractFooter !== undefined) body.extract_footer = params.extractFooter;

    let response = await this.axios.post('/ocr', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ── Models ──

  async listModels() {
    let response = await this.axios.get('/models', {
      headers: this.headers
    });

    return response.data;
  }

  async getModel(modelId: string) {
    let response = await this.axios.get(`/models/${modelId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async deleteModel(modelId: string) {
    let response = await this.axios.delete(`/models/${modelId}`, {
      headers: this.headers
    });

    return response.data;
  }

  // ── Files ──

  async listFiles(params?: { page?: number; pageSize?: number }) {
    let queryParams: any = {};
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.pageSize !== undefined) queryParams.page_size = params.pageSize;

    let response = await this.axios.get('/files', {
      headers: this.headers,
      params: queryParams
    });

    return response.data;
  }

  async getFile(fileId: string) {
    let response = await this.axios.get(`/files/${fileId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async deleteFile(fileId: string) {
    let response = await this.axios.delete(`/files/${fileId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async getFileUrl(fileId: string, expiry?: number) {
    let queryParams: any = {};
    if (expiry !== undefined) queryParams.expiry = expiry;

    let response = await this.axios.get(`/files/${fileId}/url`, {
      headers: this.headers,
      params: queryParams
    });

    return response.data;
  }

  // ── Fine-Tuning ──

  async createFineTuningJob(params: {
    model: string;
    trainingFiles: Array<{ fileId: string; weight?: number }>;
    validationFiles?: string[];
    hyperparameters?: {
      trainingSteps?: number;
      learningRate?: number;
      warmupFraction?: number;
      weightDecay?: number;
      epochs?: number;
      fimRatio?: number;
      seqLen?: number;
    };
    suffix?: string;
    dryRun?: boolean;
    autoStart?: boolean;
  }) {
    let body: any = {
      model: params.model,
      training_files: params.trainingFiles.map(f => ({
        file_id: f.fileId,
        weight: f.weight
      }))
    };

    if (params.validationFiles !== undefined) body.validation_files = params.validationFiles;
    if (params.suffix !== undefined) body.suffix = params.suffix;
    if (params.dryRun !== undefined) body.dry_run = params.dryRun;
    if (params.autoStart !== undefined) body.auto_start = params.autoStart;

    if (params.hyperparameters) {
      let hp: any = {};
      if (params.hyperparameters.trainingSteps !== undefined)
        hp.training_steps = params.hyperparameters.trainingSteps;
      if (params.hyperparameters.learningRate !== undefined)
        hp.learning_rate = params.hyperparameters.learningRate;
      if (params.hyperparameters.warmupFraction !== undefined)
        hp.warmup_fraction = params.hyperparameters.warmupFraction;
      if (params.hyperparameters.weightDecay !== undefined)
        hp.weight_decay = params.hyperparameters.weightDecay;
      if (params.hyperparameters.epochs !== undefined)
        hp.epochs = params.hyperparameters.epochs;
      if (params.hyperparameters.fimRatio !== undefined)
        hp.fim_ratio = params.hyperparameters.fimRatio;
      if (params.hyperparameters.seqLen !== undefined)
        hp.seq_len = params.hyperparameters.seqLen;
      body.hyperparameters = hp;
    }

    let response = await this.axios.post('/fine_tuning/jobs', body, {
      headers: this.headers
    });

    return response.data;
  }

  async listFineTuningJobs(params?: { page?: number; pageSize?: number }) {
    let queryParams: any = {};
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.pageSize !== undefined) queryParams.page_size = params.pageSize;

    let response = await this.axios.get('/fine_tuning/jobs', {
      headers: this.headers,
      params: queryParams
    });

    return response.data;
  }

  async getFineTuningJob(jobId: string) {
    let response = await this.axios.get(`/fine_tuning/jobs/${jobId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async cancelFineTuningJob(jobId: string) {
    let response = await this.axios.post(
      `/fine_tuning/jobs/${jobId}/cancel`,
      {},
      {
        headers: this.headers
      }
    );

    return response.data;
  }

  async startFineTuningJob(jobId: string) {
    let response = await this.axios.post(
      `/fine_tuning/jobs/${jobId}/start`,
      {},
      {
        headers: this.headers
      }
    );

    return response.data;
  }

  // ── Batch Jobs ──

  async createBatchJob(params: {
    endpoint: string;
    model?: string;
    inputFiles?: string[];
    timeoutHours?: number;
    metadata?: Record<string, string>;
  }) {
    let body: any = {
      endpoint: params.endpoint
    };

    if (params.model !== undefined) body.model = params.model;
    if (params.inputFiles !== undefined) body.input_files = params.inputFiles;
    if (params.timeoutHours !== undefined) body.timeout_hours = params.timeoutHours;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    let response = await this.axios.post('/batch/jobs', body, {
      headers: this.headers
    });

    return response.data;
  }

  async listBatchJobs(params?: { status?: string; page?: number; pageSize?: number }) {
    let queryParams: any = {};
    if (params?.status !== undefined) queryParams.status = params.status;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.pageSize !== undefined) queryParams.page_size = params.pageSize;

    let response = await this.axios.get('/batch/jobs', {
      headers: this.headers,
      params: queryParams
    });

    return response.data;
  }

  async getBatchJob(jobId: string) {
    let response = await this.axios.get(`/batch/jobs/${jobId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async cancelBatchJob(jobId: string) {
    let response = await this.axios.post(
      `/batch/jobs/${jobId}/cancel`,
      {},
      {
        headers: this.headers
      }
    );

    return response.data;
  }
}
