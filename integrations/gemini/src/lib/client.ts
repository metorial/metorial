import { createAxios, getResponseHeaderValue } from '@slates/provider';
import { geminiApiError, geminiServiceError } from './errors';

export interface ClientConfig {
  token: string;
  apiVersion: string;
}

export interface GenerateVeoVideoParams {
  prompt: string;
  image?: { mimeType: string; data: string };
  lastFrame?: { mimeType: string; data: string };
  negativePrompt?: string;
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: 4 | 5 | 6 | 7 | 8;
  personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow';
  resolution?: '720p' | '1080p' | '4k';
  seed?: number;
  numberOfVideos?: number;
}

export interface DownloadedVeoVideo {
  content: Buffer;
  mimeType: 'video/mp4';
}

const GEMINI_API_HOST = 'generativelanguage.googleapis.com';
const MAX_VIDEO_DOWNLOAD_REDIRECTS = 3;
const MAX_VIDEO_DOWNLOAD_BYTES = 512 * 1024 * 1024;
const MP4_FILE_TYPE_MARKER = Buffer.from('ftyp', 'ascii');

export class Client {
  private axios: any;
  private downloadAxios: any;
  private baseURL: string;

  constructor(private config: ClientConfig) {
    this.baseURL = `https://generativelanguage.googleapis.com/${config.apiVersion}`;

    this.axios = createAxios({
      baseURL: this.baseURL,
      headers: {
        'x-goog-api-key': config.token
      }
    });
    this.downloadAxios = createAxios();
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

  private veoModelResourceName(modelName: string) {
    let name = this.modelResourceName(modelName.trim());
    if (!/^models\/veo-[A-Za-z0-9._-]+$/.test(name)) {
      throw geminiServiceError(
        'model must be a Gemini Developer API Veo model ID such as "veo-3.1-generate-preview".'
      );
    }

    return name;
  }

  private videoOperationResourceName(operationName: string) {
    let name = operationName.trim().replace(/^\/+/, '');
    if (!/^models\/veo-[A-Za-z0-9._-]+\/operations\/[A-Za-z0-9._~-]+$/.test(name)) {
      throw geminiServiceError(
        'operationName must be the Veo operation resource name returned by generate_video.'
      );
    }

    return name;
  }

  private isTrustedVideoDownloadHost(hostname: string) {
    return (
      hostname === GEMINI_API_HOST ||
      hostname === 'storage.googleapis.com' ||
      hostname.endsWith('.googleusercontent.com')
    );
  }

  private parseVideoDownloadUrl(value: string, requireGeminiFileUrl = false) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw geminiServiceError('Gemini returned an invalid generated video download URL.');
    }

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !this.isTrustedVideoDownloadHost(url.hostname)
    ) {
      throw geminiServiceError(
        'Gemini returned an untrusted generated video download URL, so no download was attempted.'
      );
    }

    if (
      requireGeminiFileUrl &&
      (url.hostname !== GEMINI_API_HOST ||
        !new RegExp(`^/${this.config.apiVersion}/files/[A-Za-z0-9_-]+:download$`).test(
          url.pathname
        ))
    ) {
      throw geminiServiceError(
        'Gemini returned an unexpected generated video file URL, so no download was attempted.'
      );
    }

    return url;
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

  // ─── Veo Video Generation ───

  async generateVeoVideo(modelName: string, params: GenerateVeoVideoParams): Promise<any> {
    let instance: Record<string, any> = { prompt: params.prompt };
    if (params.image) {
      instance.image = {
        inlineData: {
          mimeType: params.image.mimeType,
          data: params.image.data
        }
      };
    }
    if (params.lastFrame) {
      instance.lastFrame = {
        inlineData: {
          mimeType: params.lastFrame.mimeType,
          data: params.lastFrame.data
        }
      };
    }

    let parameters: Record<string, any> = {};
    if (params.negativePrompt) parameters.negativePrompt = params.negativePrompt;
    if (params.aspectRatio) parameters.aspectRatio = params.aspectRatio;
    if (params.durationSeconds !== undefined)
      parameters.durationSeconds = params.durationSeconds;
    if (params.personGeneration) parameters.personGeneration = params.personGeneration;
    if (params.resolution) parameters.resolution = params.resolution;
    if (params.seed !== undefined) parameters.seed = params.seed;
    if (params.numberOfVideos !== undefined) parameters.numberOfVideos = params.numberOfVideos;

    return await this.request('start Veo video generation', () =>
      this.axios.post(`/${this.veoModelResourceName(modelName)}:predictLongRunning`, {
        instances: [instance],
        ...(Object.keys(parameters).length > 0 ? { parameters } : {})
      })
    );
  }

  async getVideoOperation(operationName: string): Promise<any> {
    return await this.request('get Veo video operation', () =>
      this.axios.get(`/${this.videoOperationResourceName(operationName)}`)
    );
  }

  async downloadVeoVideo(uri: string): Promise<DownloadedVeoVideo> {
    let url = this.parseVideoDownloadUrl(uri, true);
    let response: any;

    for (
      let redirectCount = 0;
      redirectCount <= MAX_VIDEO_DOWNLOAD_REDIRECTS;
      redirectCount++
    ) {
      response = await this.requestResponse<any>('download generated Veo video', () =>
        this.downloadAxios.get(url.toString(), {
          headers: redirectCount === 0 ? { 'x-goog-api-key': this.config.token } : undefined,
          responseType: 'arraybuffer',
          maxRedirects: 0,
          maxBodyLength: MAX_VIDEO_DOWNLOAD_BYTES,
          maxContentLength: MAX_VIDEO_DOWNLOAD_BYTES,
          validateStatus: (status: number) => status >= 200 && status < 400
        })
      );

      let status = Number(response?.status ?? 200);
      if (status >= 200 && status < 300) break;

      let location = getResponseHeaderValue(response?.headers, 'location');
      if (!location) {
        throw geminiServiceError(
          'Gemini redirected the generated video download without a destination URL.'
        );
      }
      if (redirectCount === MAX_VIDEO_DOWNLOAD_REDIRECTS) {
        throw geminiServiceError(
          'Gemini redirected the generated video download too many times.'
        );
      }

      let redirectUrl: string;
      try {
        redirectUrl = new URL(location, url).toString();
      } catch {
        throw geminiServiceError(
          'Gemini redirected the generated video download to an invalid URL.'
        );
      }
      url = this.parseVideoDownloadUrl(redirectUrl);
    }

    let contentLength = getResponseHeaderValue(response?.headers, 'content-length');
    if (contentLength !== undefined) {
      if (!/^\d+$/.test(contentLength)) {
        throw geminiServiceError(
          'Gemini returned an invalid generated video Content-Length header.'
        );
      }

      let declaredBytes = Number(contentLength);
      if (!Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_VIDEO_DOWNLOAD_BYTES) {
        throw geminiServiceError(
          `Gemini returned a generated video larger than the ${MAX_VIDEO_DOWNLOAD_BYTES}-byte download limit.`
        );
      }
    }

    let data = response?.data;
    let content: Buffer;
    if (Buffer.isBuffer(data)) {
      content = data;
    } else if (data instanceof ArrayBuffer) {
      content = Buffer.from(data);
    } else if (ArrayBuffer.isView(data)) {
      content = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    } else {
      throw geminiServiceError(
        'Gemini returned an invalid generated video download response.'
      );
    }

    if (content.length > MAX_VIDEO_DOWNLOAD_BYTES) {
      throw geminiServiceError(
        `Gemini returned a generated video larger than the ${MAX_VIDEO_DOWNLOAD_BYTES}-byte download limit.`
      );
    }

    if (content.length < 12 || !content.subarray(4, 8).equals(MP4_FILE_TYPE_MARKER)) {
      throw geminiServiceError(
        'Gemini returned generated video bytes that are not a valid MP4 file.'
      );
    }

    let contentType = getResponseHeaderValue(response?.headers, 'content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    if (
      !contentType ||
      !['video/mp4', 'application/octet-stream', 'binary/octet-stream'].includes(contentType)
    ) {
      throw geminiServiceError(
        contentType
          ? `Gemini returned generated video content with unexpected MIME type "${contentType}".`
          : 'Gemini returned generated video content without a MIME type.'
      );
    }

    return { content, mimeType: 'video/mp4' };
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
