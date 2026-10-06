import { buildApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';

export type ChatToolCall = {
  toolCallId: string;
  type: 'function';
  function: { name: string; arguments: string };
};
export type ChatParams = {
  model: string;
  messages: Array<{
    role: string;
    content?: string;
    toolCallId?: string;
    toolCalls?: ChatToolCall[];
  }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  n?: number;
  tools?: Array<{
    type: string;
    function: { name: string; description?: string; parameters?: Record<string, unknown> };
  }>;
  documents?: Array<{ id?: string; content: string; metadata?: Record<string, string> }>;
  responseFormat?: { type: string };
};
export type MaestroParams = {
  input: string | Array<{ role: string; content: string }>;
  systemPrompt: string;
  requirements?: Array<{ name: string; description: string; isMandatory?: boolean }>;
  tools?: Record<string, unknown>[];
  models?: string[];
  budget?: string;
  include?: string[];
  responseLanguage?: string;
};

export class Client {
  private http;
  private uploadHttp;

  constructor(config: { token: string }) {
    const options = {
      baseURL: 'https://api.ai21.com/studio/v1',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'AI21 Studio',
          reason: 'ai21_api_error'
        })
    };
    this.http = createAuthenticatedAxios(options);
    this.uploadHttp = createAuthenticatedAxios({ ...options, contentType: false });
  }

  async chatCompletion(params: ChatParams): Promise<unknown> {
    const body = pickDefined({
      model: params.model,
      messages: params.messages.map(message =>
        pickDefined({
          role: message.role,
          content: message.content ?? (message.toolCalls?.length ? null : undefined),
          tool_call_id: message.toolCallId,
          tool_calls: message.toolCalls?.map(call => ({
            id: call.toolCallId,
            type: call.type,
            function: call.function
          }))
        })
      ),
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      top_p: params.topP,
      stop: params.stop,
      n: params.n,
      tools: params.tools,
      documents: params.documents,
      response_format: params.responseFormat,
      stream: false
    });
    return (await this.http.post('/chat/completions', body)).data;
  }

  async createMaestroRun(params: MaestroParams): Promise<unknown> {
    const body = pickDefined({
      input: params.input,
      system_prompt: params.systemPrompt,
      requirements: params.requirements?.map(item =>
        pickDefined({
          name: item.name,
          description: item.description,
          is_mandatory: item.isMandatory
        })
      ),
      tools: params.tools,
      models: params.models,
      budget: params.budget,
      include: params.include,
      response_language: params.responseLanguage
    });
    return (await this.http.post('/maestro/runs', body)).data;
  }

  async getMaestroRun(runId: string): Promise<unknown> {
    return (await this.http.get(`/maestro/runs/${encodeURIComponent(runId)}`)).data;
  }

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
  }): Promise<unknown> {
    return (
      await this.http.post(
        '/beta/conversational-rag',
        pickDefined({
          messages: params.messages,
          path: params.path,
          labels: params.labels,
          file_ids: params.fileIds,
          max_segments: params.maxSegments,
          retrieval_similarity_threshold: params.retrievalSimilarityThreshold,
          retrieval_strategy: params.retrievalStrategy,
          max_neighbors: params.maxNeighbors,
          hybrid_search_alpha: params.hybridSearchAlpha
        })
      )
    ).data;
  }

  async listFiles(
    params: {
      labels?: string[];
      offset?: number;
      limit?: number;
      name?: string;
      status?: string;
      path?: string;
    } = {}
  ): Promise<unknown> {
    return (
      await this.http.get('/library/files', {
        params: pickDefined({
          label: params.labels,
          offset: params.offset,
          limit: params.limit,
          name: params.name,
          status: params.status,
          path: params.path
        }),
        paramsSerializer: { indexes: null }
      })
    ).data;
  }

  async getFile(fileId: string): Promise<unknown> {
    return (await this.http.get(`/library/files/${encodeURIComponent(fileId)}`)).data;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.http.delete(`/library/files/${encodeURIComponent(fileId)}`);
  }

  async updateFile(
    fileId: string,
    params: { publicUrl?: string; labels?: string[] }
  ): Promise<void> {
    await this.http.put(`/library/files/${encodeURIComponent(fileId)}`, pickDefined(params));
  }

  async uploadFile(params: {
    fileName: string;
    content: Uint8Array;
    mimeType: string;
    path?: string;
    labels?: string[];
    publicUrl?: string;
  }): Promise<unknown> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([params.content], { type: params.mimeType }),
      params.fileName
    );
    if (params.path !== undefined) form.append('path', params.path);
    for (const label of params.labels ?? []) form.append('labels', label);
    if (params.publicUrl !== undefined) form.append('publicUrl', params.publicUrl);
    return (await this.uploadHttp.post('/library/files', form)).data;
  }

  async getFileDownloadLink(fileId: string): Promise<unknown> {
    return (await this.http.get(`/library/files/${encodeURIComponent(fileId)}/download`)).data;
  }
}
