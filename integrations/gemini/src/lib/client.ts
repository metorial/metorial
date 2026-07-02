import { createAxios } from '@slates/provider';
import { geminiApiError, geminiServiceError } from './errors';

export interface ClientConfig {
  token: string;
  apiVersion: string;
}

export class Client {
  private axios: any;
  private baseURL: string;

  constructor(private config: ClientConfig) {
    this.baseURL = `https://generativelanguage.googleapis.com/${config.apiVersion}`;

    this.axios = createAxios({
      baseURL: this.baseURL,
      headers: {
        'x-goog-api-key': config.token
      }
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw geminiApiError(error, operation);
    }
  }

  private async requestResponse<T>(operation: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      throw geminiApiError(error, operation);
    }
  }

  private modelResourceName(modelName: string) {
    return modelName.startsWith('models/') ? modelName : `models/${modelName}`;
  }

  private fileResourceName(fileName: string) {
    return fileName.startsWith('files/') ? fileName : `files/${fileName}`;
  }

  private cachedContentResourceName(name: string) {
    return name.startsWith('cachedContents/') ? name : `cachedContents/${name}`;
  }

  private embeddingModelSupportsTaskType(modelName: string) {
    return this.modelResourceName(modelName).split('/').at(-1) === 'gemini-embedding-001';
  }

  // ─── Models ───

  async listModels(params?: { pageSize?: number; pageToken?: string }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params?.pageToken) query.pageToken = params.pageToken;

    return await this.request('list models', () =>
      this.axios.get('/models', { params: query })
    );
  }

  async getModel(modelName: string): Promise<any> {
    return await this.request('get model', () =>
      this.axios.get(`/${this.modelResourceName(modelName)}`)
    );
  }

  // ─── Content Generation ───

  async generateContent(
    modelName: string,
    params: {
      contents: Array<{
        role?: string;
        parts: any[];
      }>;
      systemInstruction?: { parts: any[] };
      generationConfig?: Record<string, any>;
      safetySettings?: Array<{ category: string; threshold: string }>;
      tools?: any[];
      toolConfig?: Record<string, any>;
      cachedContent?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      contents: params.contents
    };

    if (params.systemInstruction) body.systemInstruction = params.systemInstruction;
    if (params.generationConfig) body.generationConfig = params.generationConfig;
    if (params.safetySettings) body.safetySettings = params.safetySettings;
    if (params.tools) body.tools = params.tools;
    if (params.toolConfig) body.toolConfig = params.toolConfig;
    if (params.cachedContent) body.cachedContent = params.cachedContent;

    return await this.request('generate content', () =>
      this.axios.post(`/${this.modelResourceName(modelName)}:generateContent`, body)
    );
  }

  // ─── Embeddings ───

  async embedContent(
    modelName: string,
    params: {
      content: { parts: any[] };
      taskType?: string;
      title?: string;
      outputDimensionality?: number;
    }
  ): Promise<any> {
    let supportsTaskType = this.embeddingModelSupportsTaskType(modelName);
    let body: Record<string, any> = {
      content: params.content
    };

    if (supportsTaskType && params.taskType) body.taskType = params.taskType;
    if (supportsTaskType && params.title) body.title = params.title;
    if (params.outputDimensionality !== undefined)
      body.outputDimensionality = params.outputDimensionality;

    return await this.request('embed content', () =>
      this.axios.post(`/${this.modelResourceName(modelName)}:embedContent`, body)
    );
  }

  async batchEmbedContents(
    modelName: string,
    params: {
      requests: Array<{
        content: { parts: any[] };
        taskType?: string;
        title?: string;
        outputDimensionality?: number;
      }>;
    }
  ): Promise<any> {
    let supportsTaskType = this.embeddingModelSupportsTaskType(modelName);
    let body = {
      requests: params.requests.map(req => {
        let request: Record<string, any> = {
          model: this.modelResourceName(modelName),
          content: req.content
        };

        if (supportsTaskType && req.taskType) request.taskType = req.taskType;
        if (supportsTaskType && req.title) request.title = req.title;
        if (req.outputDimensionality !== undefined)
          request.outputDimensionality = req.outputDimensionality;

        return request;
      })
    };

    return await this.request('batch embed contents', () =>
      this.axios.post(`/${this.modelResourceName(modelName)}:batchEmbedContents`, body)
    );
  }

  // ─── Token Counting ───

  async countTokens(
    modelName: string,
    params: {
      contents?: Array<{ role?: string; parts: any[] }>;
      generateContentRequest?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};

    if (params.contents) body.contents = params.contents;
    if (params.generateContentRequest)
      body.generateContentRequest = params.generateContentRequest;

    return await this.request('count tokens', () =>
      this.axios.post(`/${this.modelResourceName(modelName)}:countTokens`, body)
    );
  }

  async generateImagenImages(
    modelName: string,
    params: {
      prompt: string;
      numberOfImages?: number;
      aspectRatio?: string;
      imageSize?: string;
      personGeneration?: string;
    }
  ): Promise<any> {
    let parameters: Record<string, any> = {};
    if (params.numberOfImages !== undefined) parameters.sampleCount = params.numberOfImages;
    if (params.aspectRatio) parameters.aspectRatio = params.aspectRatio;
    if (params.imageSize) parameters.imageSize = params.imageSize;
    if (params.personGeneration) parameters.personGeneration = params.personGeneration;

    return await this.request('generate Imagen images', () =>
      this.axios.post(`/${this.modelResourceName(modelName)}:predict`, {
        instances: [{ prompt: params.prompt }],
        parameters
      })
    );
  }

  // ─── File Management ───

  async uploadFile(params: {
    displayName?: string;
    mimeType: string;
    fileData: string; // base64 encoded
  }): Promise<any> {
    let fileBytes = Buffer.from(params.fileData, 'base64');
    let uploadStart = await this.requestResponse<any>('start file upload', () =>
      this.axios.post(
        `https://generativelanguage.googleapis.com/upload/${this.config.apiVersion}/files`,
        {
          file: params.displayName ? { displayName: params.displayName } : {}
        },
        {
          headers: {
            'x-goog-api-key': this.config.token,
            'Content-Type': 'application/json',
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': String(fileBytes.length),
            'X-Goog-Upload-Header-Content-Type': params.mimeType
          }
        }
      )
    );

    let uploadUrl =
      uploadStart.headers?.['x-goog-upload-url'] ??
      uploadStart.headers?.get?.('x-goog-upload-url');
    if (typeof uploadUrl !== 'string' || !uploadUrl) {
      throw geminiServiceError('Gemini File API did not return an upload URL.');
    }

    let uploadResponse = await this.requestResponse<any>('upload file bytes', () =>
      this.axios.post(uploadUrl, fileBytes, {
        headers: {
          'Content-Length': String(fileBytes.length),
          'Content-Type': params.mimeType,
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize'
        },
        maxBodyLength: Number.POSITIVE_INFINITY,
        maxContentLength: Number.POSITIVE_INFINITY
      })
    );
    return uploadResponse.data;
  }

  async listFiles(params?: { pageSize?: number; pageToken?: string }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params?.pageToken) query.pageToken = params.pageToken;

    return await this.request('list files', () => this.axios.get('/files', { params: query }));
  }

  async getFile(fileName: string): Promise<any> {
    return await this.request('get file', () =>
      this.axios.get(`/${this.fileResourceName(fileName)}`)
    );
  }

  async deleteFile(fileName: string): Promise<any> {
    return await this.request('delete file', () =>
      this.axios.delete(`/${this.fileResourceName(fileName)}`)
    );
  }

  // ─── Cached Content ───

  async createCachedContent(params: {
    model: string;
    contents: Array<{ role?: string; parts: any[] }>;
    systemInstruction?: { parts: any[] };
    tools?: any[];
    ttl?: string;
    expireTime?: string;
    displayName?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      model: this.modelResourceName(params.model),
      contents: params.contents
    };

    if (params.systemInstruction) body.systemInstruction = params.systemInstruction;
    if (params.tools) body.tools = params.tools;
    if (params.ttl) body.ttl = params.ttl;
    if (params.expireTime) body.expireTime = params.expireTime;
    if (params.displayName) body.displayName = params.displayName;

    return await this.request('create cached content', () =>
      this.axios.post('/cachedContents', body)
    );
  }

  async listCachedContents(params?: { pageSize?: number; pageToken?: string }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params?.pageToken) query.pageToken = params.pageToken;

    return await this.request('list cached contents', () =>
      this.axios.get('/cachedContents', { params: query })
    );
  }

  async getCachedContent(name: string): Promise<any> {
    return await this.request('get cached content', () =>
      this.axios.get(`/${this.cachedContentResourceName(name)}`)
    );
  }

  async updateCachedContent(
    name: string,
    params: {
      ttl?: string;
      expireTime?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    let updateMask: string[] = [];

    if (params.ttl) {
      body.ttl = params.ttl;
      updateMask.push('ttl');
    }
    if (params.expireTime) {
      body.expireTime = params.expireTime;
      updateMask.push('expireTime');
    }
    if (updateMask.length === 0) {
      throw geminiServiceError('At least one of ttl or expireTime is required.');
    }

    return await this.request('update cached content', () =>
      this.axios.patch(`/${this.cachedContentResourceName(name)}`, body, {
        params: { updateMask: updateMask.join(',') }
      })
    );
  }

  async deleteCachedContent(name: string): Promise<any> {
    return await this.request('delete cached content', () =>
      this.axios.delete(`/${this.cachedContentResourceName(name)}`)
    );
  }

  // ─── Tuned Models ───

  async listTunedModels(params?: { pageSize?: number; pageToken?: string }): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.pageSize !== undefined) query.pageSize = params.pageSize;
    if (params?.pageToken) query.pageToken = params.pageToken;

    return await this.request('list tuned models', () =>
      this.axios.get('/tunedModels', { params: query })
    );
  }

  async getTunedModel(name: string): Promise<any> {
    let fullName = name.startsWith('tunedModels/') ? name : `tunedModels/${name}`;
    return await this.request('get tuned model', () => this.axios.get(`/${fullName}`));
  }
}
