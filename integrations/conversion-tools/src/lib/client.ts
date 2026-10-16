import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import type { z } from 'zod';
import {
  authSchema,
  configSchema,
  fileInfoSchema,
  fileUploadSchema,
  type TaskStatus,
  taskCreateSchema,
  taskDeleteSchema,
  taskListSchema,
  taskRetentionSchema,
  taskStatusSchema
} from './types';

let BASE_URL = 'https://api.conversiontools.io/v1';

export class Client {
  private axios;
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('A Conversion Tools API token is required.');
    }
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 60_000,
      contentType: false,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error => this.apiError(error)
    });
  }

  private apiError(error: unknown) {
    return buildApiServiceError(error, {
      providerLabel: 'Conversion Tools',
      reason: 'conversion_tools_api_error',
      extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
      formatMessage: parts =>
        this.redactText(
          `${parts.providerLabel} API request failed: ${parts.statusLabel}${parts.message}`
        ),
      parent: {}
    });
  }

  private redactText(value: string): string {
    return value
      .replaceAll(this.token, '[redacted]')
      .replaceAll(encodeURIComponent(this.token), '[redacted]')
      .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted]');
  }

  private redact(value: unknown): unknown {
    if (typeof value === 'string') return this.redactText(value);
    if (Array.isArray(value)) return value.map(item => this.redact(item));
    if (isApiErrorRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          /^(authorization|access_token|refresh_token|token|password|secret|api[_-]?key)$/i.test(
            key
          )
            ? '[redacted]'
            : this.redact(item)
        ])
      );
    }
    return value;
  }

  private read<T>(schema: z.ZodType<T>, body: unknown, allowTaskError = false): T {
    if (isApiErrorRecord(body) && body.error && !(allowTaskError && body.status === 'ERROR')) {
      throw this.apiError({ response: { data: body } });
    }
    let parsed = schema.safeParse(this.redact(body));
    if (!parsed.success) {
      throw createApiServiceError(
        'Conversion Tools returned an invalid response. Try again or contact support.',
        {
          reason: 'conversion_tools_invalid_response'
        }
      );
    }
    return parsed.data;
  }

  private pathId(value: string, name: string): string {
    if (!value.trim()) throw createApiServiceError(`${name} must not be empty.`);
    return encodeURIComponent(value);
  }

  fileDownloadUrl(fileId: string): string {
    return `${BASE_URL}/files/${this.pathId(fileId, 'fileId')}`;
  }

  async uploadFile(fileBuffer: Uint8Array, fileName: string): Promise<string> {
    let formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(fileBuffer)]), fileName);
    let response = await this.axios.post('/files', formData);
    return this.read(fileUploadSchema, response.data).file_id;
  }

  async getFileInfo(fileId: string) {
    let response = await this.axios.get(`/files/${this.pathId(fileId, 'fileId')}/info`);
    return this.read(fileInfoSchema, response.data);
  }

  async createTask(type: string, options: Record<string, unknown>, callbackUrl?: string) {
    if (!type.trim()) throw createApiServiceError('conversionType must not be empty.');
    for (let [key, value] of Object.entries(options)) {
      if (/^file_id\d*$/.test(key) && (typeof value !== 'string' || !value.trim())) {
        throw createApiServiceError(`${key} must be a non-empty uploaded file ID.`);
      }
    }
    if (options.url !== undefined) {
      let url: URL;
      try {
        if (typeof options.url !== 'string')
          throw createApiServiceError('url must be a string.');
        url = new URL(options.url);
      } catch {
        throw createApiServiceError('The source URL must be an absolute HTTP or HTTPS URL.');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw createApiServiceError(
          'The source URL must use HTTP or HTTPS without embedded credentials.'
        );
      }
    }
    if (callbackUrl !== undefined) {
      let url: URL;
      try {
        url = new URL(callbackUrl);
      } catch {
        throw createApiServiceError('callbackUrl must be an absolute HTTP or HTTPS URL.');
      }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw createApiServiceError(
          'callbackUrl must be an HTTP or HTTPS URL without embedded credentials.'
        );
      }
    }
    let response = await this.axios.post(
      '/tasks',
      {
        type,
        options,
        ...(callbackUrl === undefined ? {} : { callbackUrl })
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return this.read(taskCreateSchema, response.data);
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    let response = await this.axios.get(`/tasks/${this.pathId(taskId, 'taskId')}`);
    let status = this.read(taskStatusSchema, response.data, true);
    if (status.status === 'SUCCESS' && !status.file_id) {
      throw createApiServiceError(
        'Conversion Tools reported success without a result file ID.'
      );
    }
    return status;
  }

  async listTasks(status?: string) {
    let response = await this.axios.get('/tasks', { params: { status } });
    return this.read(taskListSchema, response.data).data;
  }

  async updateTaskRetention(taskId: string, retentionMode: 'standard_24h' | 'ttl_15m') {
    let response = await this.axios.patch(
      `/tasks/${this.pathId(taskId, 'taskId')}/retention`,
      { retentionMode },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return this.read(taskRetentionSchema, response.data);
  }

  async deleteTask(taskId: string) {
    let response = await this.axios.post(
      `/tasks/${this.pathId(taskId, 'taskId')}/delete`,
      {},
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return this.read(taskDeleteSchema, response.data);
  }

  async getConversions() {
    let standardResponse = await this.axios.get('/conversions');
    let standard = this.read(configSchema, standardResponse.data);
    let customResponse = await this.axios.get('/config');
    let custom = this.read(configSchema, customResponse.data);
    let conversions = new Map(standard.conversions.map(item => [item.type, item]));
    for (let item of custom.conversions) conversions.set(item.type, item);
    return [...conversions.values()];
  }

  async getUserInfo() {
    let response = await this.axios.get('/auth');
    return this.read(authSchema, response.data);
  }

  async pollUntilComplete(
    taskId: string,
    maxAttempts = 120,
    intervalMs = 5000
  ): Promise<TaskStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      let status = await this.getTaskStatus(taskId);
      if (status.status === 'SUCCESS' || status.status === 'ERROR') return status;
      if (i + 1 < maxAttempts) await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw createApiServiceError(
      `Task ${taskId} did not complete within the maximum polling time. Use Get Task to check its current status.`
    );
  }
}
