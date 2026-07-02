import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.ai21.com/studio/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Chat Completions (Jamba) ───

  async chatCompletion(params: {
    model: string;
    messages: Array<{
      role: string;
      content?: string;
      toolCallId?: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    }>;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string[];
    n?: number;
    tools?: Array<{
      type: string;
      function: {
        name: string;
        description?: string;
        parameters?: Record<string, any>;
      };
    }>;
    documents?: Array<{
      content: string;
      metadata?: Record<string, string>;
    }>;
    responseFormat?: { type: string };
  }) {
    let body: Record<string, any> = {
      model: params.model,
      messages: params.messages
    };

    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.n !== undefined) body.n = params.n;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.documents !== undefined) body.documents = params.documents;
    if (params.responseFormat !== undefined) body.response_format = params.responseFormat;

    let response = await http.post('/chat/completions', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Maestro Runs ───

  async createMaestroRun(params: {
    input: string | Array<{ role: string; content: string }>;
    systemPrompt: string;
    requirements?: Array<{
      name: string;
      description: string;
      isMandatory?: boolean;
    }>;
    tools?: Record<string, any>[];
    toolResources?: Record<string, any>;
    models?: string[];
    budget?: string;
    include?: string[];
    responseLanguage?: string;
  }) {
    let body: Record<string, any> = {
      input: params.input,
      system_prompt: params.systemPrompt
    };

    if (params.requirements !== undefined) {
      body.requirements = params.requirements.map(r => ({
        name: r.name,
        description: r.description,
        is_mandatory: r.isMandatory
      }));
    }
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.toolResources !== undefined) body.tool_resources = params.toolResources;
    if (params.models !== undefined) body.models = params.models;
    if (params.budget !== undefined) body.budget = params.budget;
    if (params.include !== undefined) body.include = params.include;
    if (params.responseLanguage !== undefined)
      body.response_language = params.responseLanguage;

    let response = await http.post('/maestro/runs', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Conversational RAG ───

  async conversationalRag(params: {
    messages: Array<{ role: string; content: string }>;
    path?: string;
    labels?: string[];
    fileIds?: string[];
    maxSegments?: number;
    retrievalSimilarityThreshold?: number;
    retrievalStrategy?: string;
    maxNeighbors?: number;
    hybridSearchAlpha?: number;
  }) {
    let body: Record<string, any> = {
      messages: params.messages
    };

    if (params.path !== undefined) body.path = params.path;
    if (params.labels !== undefined) body.labels = params.labels;
    if (params.fileIds !== undefined) body.file_ids = params.fileIds;
    if (params.maxSegments !== undefined) body.max_segments = params.maxSegments;
    if (params.retrievalSimilarityThreshold !== undefined)
      body.retrieval_similarity_threshold = params.retrievalSimilarityThreshold;
    if (params.retrievalStrategy !== undefined)
      body.retrieval_strategy = params.retrievalStrategy;
    if (params.maxNeighbors !== undefined) body.max_neighbors = params.maxNeighbors;
    if (params.hybridSearchAlpha !== undefined)
      body.hybridsearch_alpha = params.hybridSearchAlpha;

    let response = await http.post('/beta/conversational-rag', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Document Library ───

  async listFiles(params?: { labels?: string[]; offset?: number; limit?: number }) {
    let queryParams: Record<string, any> = {};
    if (params?.labels) queryParams.labels = params.labels.join(',');
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.limit !== undefined) queryParams.limit = params.limit;

    let response = await http.get('/library/files', {
      headers: this.headers,
      params: queryParams
    });

    return response.data;
  }

  async getFile(fileId: string) {
    let response = await http.get(`/library/files/${fileId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async deleteFile(fileId: string) {
    let response = await http.delete(`/library/files/${fileId}`, {
      headers: this.headers
    });

    return response.data;
  }

  async updateFile(fileId: string, params: { publicUrl?: string; labels?: string[] }) {
    let body: Record<string, any> = {};
    if (params.publicUrl !== undefined) body.publicUrl = params.publicUrl;
    if (params.labels !== undefined) body.labels = params.labels;

    let response = await http.put(`/library/files/${fileId}`, body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Summarize ───

  async summarize(params: { source: string; sourceType: string; focus?: string }) {
    let body: Record<string, any> = {
      source: params.source,
      sourceType: params.sourceType
    };

    if (params.focus !== undefined) body.focus = params.focus;

    let response = await http.post('/summarize', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Summarize by Segment ───

  async summarizeBySegment(params: { source: string; sourceType: string; focus?: string }) {
    let body: Record<string, any> = {
      source: params.source,
      sourceType: params.sourceType
    };

    if (params.focus !== undefined) body.focus = params.focus;

    let response = await http.post('/summarize-by-segment', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Paraphrase ───

  async paraphrase(params: {
    text: string;
    style?: string;
    startIndex?: number;
    endIndex?: number;
  }) {
    let body: Record<string, any> = {
      text: params.text
    };

    if (params.style !== undefined) body.style = params.style;
    if (params.startIndex !== undefined) body.startIndex = params.startIndex;
    if (params.endIndex !== undefined) body.endIndex = params.endIndex;

    let response = await http.post('/paraphrase', body, {
      headers: this.headers
    });

    return response.data;
  }

  // ─── Text Improvements ───

  async textImprovements(params: { text: string; types: string[] }) {
    let response = await http.post(
      '/improvements',
      {
        text: params.text,
        types: params.types
      },
      {
        headers: this.headers
      }
    );

    return response.data;
  }

  // ─── Grammatical Error Correction ───

  async grammarCheck(params: { text: string }) {
    let response = await http.post(
      '/gec',
      {
        text: params.text
      },
      {
        headers: this.headers
      }
    );

    return response.data;
  }

  // ─── Text Segmentation ───

  async segmentText(params: { source: string; sourceType: string }) {
    let response = await http.post(
      '/segmentation',
      {
        source: params.source,
        sourceType: params.sourceType
      },
      {
        headers: this.headers
      }
    );

    return response.data;
  }

  // ─── Contextual Answers ───

  async contextualAnswer(params: { context: string; question: string }) {
    let response = await http.post(
      '/experimental/answer',
      {
        context: params.context,
        question: params.question
      },
      {
        headers: this.headers
      }
    );

    return response.data;
  }

  // ─── Text Completions (Jurassic-2) ───

  async textCompletion(params: {
    model: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    numResults?: number;
    stopSequences?: string[];
    topKReturn?: number;
    presencePenalty?: {
      scale: number;
      applyToWhitespaces?: boolean;
      applyToPunctuations?: boolean;
      applyToNumbers?: boolean;
      applyToStopwords?: boolean;
      applyToEmojis?: boolean;
    };
    countPenalty?: {
      scale: number;
      applyToWhitespaces?: boolean;
      applyToPunctuations?: boolean;
      applyToNumbers?: boolean;
      applyToStopwords?: boolean;
      applyToEmojis?: boolean;
    };
    frequencyPenalty?: {
      scale: number;
      applyToWhitespaces?: boolean;
      applyToPunctuations?: boolean;
      applyToNumbers?: boolean;
      applyToStopwords?: boolean;
      applyToEmojis?: boolean;
    };
  }) {
    let body: Record<string, any> = {
      prompt: params.prompt
    };

    if (params.maxTokens !== undefined) body.maxTokens = params.maxTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.topP = params.topP;
    if (params.numResults !== undefined) body.numResults = params.numResults;
    if (params.stopSequences !== undefined) body.stopSequences = params.stopSequences;
    if (params.topKReturn !== undefined) body.topKReturn = params.topKReturn;
    if (params.presencePenalty !== undefined) body.presencePenalty = params.presencePenalty;
    if (params.countPenalty !== undefined) body.countPenalty = params.countPenalty;
    if (params.frequencyPenalty !== undefined) body.frequencyPenalty = params.frequencyPenalty;

    let response = await http.post(`/${params.model}/complete`, body, {
      headers: this.headers
    });

    return response.data;
  }
}
