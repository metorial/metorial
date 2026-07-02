import { createAxios } from 'slates';
import type {
  AuthResponse,
  ConfigResponse,
  FileInfo,
  TaskCreateResponse,
  TaskDeleteResponse,
  TaskDetail,
  TaskListResponse,
  TaskRetentionResponse,
  TaskStatus
} from './types';

let BASE_URL = 'https://api.conversiontools.io/v1';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async uploadFile(fileBuffer: Uint8Array, fileName: string): Promise<string> {
    let formData = new FormData();
    let blob = new Blob([fileBuffer]);
    formData.append('file', blob, fileName);

    let response = await this.axios.post<{ error: string | null; file_id: string }>(
      '/files',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (response.data.error) {
      throw new Error(`File upload failed: ${response.data.error}`);
    }

    return response.data.file_id;
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    let response = await this.axios.get<FileInfo>(`/files/${fileId}/info`);
    return response.data;
  }

  async createTask(
    type: string,
    options: Record<string, unknown>,
    callbackUrl?: string
  ): Promise<TaskCreateResponse> {
    let body: Record<string, unknown> = { type, options };
    if (callbackUrl) {
      body.callbackUrl = callbackUrl;
    }

    let response = await this.axios.post<TaskCreateResponse>('/tasks', body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.error) {
      throw new Error(`Task creation failed: ${response.data.error}`);
    }

    return response.data;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    let response = await this.axios.get<TaskStatus>(`/tasks/${taskId}`);

    if (response.data.error) {
      throw new Error(`Failed to get task status: ${response.data.error}`);
    }

    return response.data;
  }

  async listTasks(status?: string): Promise<TaskDetail[]> {
    let params: Record<string, string> = {};
    if (status) {
      params.status = status;
    }

    let response = await this.axios.get<TaskListResponse>('/tasks', { params });

    if (response.data.error) {
      throw new Error(`Failed to list tasks: ${response.data.error}`);
    }

    return response.data.data;
  }

  async updateTaskRetention(
    taskId: string,
    retentionMode: 'standard_24h' | 'ttl_15m'
  ): Promise<TaskRetentionResponse> {
    let response = await this.axios.patch<TaskRetentionResponse>(
      `/tasks/${taskId}/retention`,
      { retentionMode },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error) {
      throw new Error(`Failed to update retention: ${response.data.error}`);
    }

    return response.data;
  }

  async deleteTask(taskId: string): Promise<TaskDeleteResponse> {
    let response = await this.axios.post<TaskDeleteResponse>(
      `/tasks/${taskId}/delete`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error) {
      throw new Error(`Failed to delete task: ${response.data.error}`);
    }

    return response.data;
  }

  async getConversions(): Promise<ConfigResponse> {
    let response = await this.axios.get<ConfigResponse>('/config');

    if (response.data.error) {
      throw new Error(`Failed to get config: ${response.data.error}`);
    }

    return response.data;
  }

  async getUserInfo(): Promise<AuthResponse> {
    let response = await this.axios.get<AuthResponse>('/auth');

    if (response.data.error) {
      throw new Error(`Failed to get user info: ${response.data.error}`);
    }

    return response.data;
  }

  async pollUntilComplete(
    taskId: string,
    maxAttempts: number = 120,
    intervalMs: number = 5000
  ): Promise<TaskStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      let status = await this.getTaskStatus(taskId);

      if (status.status === 'SUCCESS' || status.status === 'ERROR') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Task ${taskId} did not complete within the maximum polling time`);
  }
}
