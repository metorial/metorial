import { createAxios } from 'slates';
import type {
  BlendRequest,
  DescribeRequest,
  FetchTaskResponse,
  ImagineRequest,
  TaskSubmitResponse,
  UpscaleRequest,
  VariationsRequest
} from './types';

export class Client {
  private http;

  constructor(params: { token: string; baseUrl: string }) {
    this.http = createAxios({
      baseURL: params.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: params.token
      }
    });
  }

  async imagine(req: ImagineRequest): Promise<TaskSubmitResponse> {
    let response = await this.http.post('/imagine', {
      prompt: req.prompt,
      ...(req.aspectRatio ? { aspect_ratio: req.aspectRatio } : {}),
      ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
      ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
    });
    return response.data;
  }

  async variations(req: VariationsRequest): Promise<TaskSubmitResponse> {
    let response = await this.http.post('/variations', {
      parent_task_id: req.parentTaskId,
      index: req.index,
      ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
      ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
    });
    return response.data;
  }

  async blend(req: BlendRequest): Promise<TaskSubmitResponse> {
    let response = await this.http.post('/blend', {
      image_urls: req.imageUrls,
      ...(req.dimension ? { dimension: req.dimension } : {}),
      ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
      ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
    });
    return response.data;
  }

  async describe(req: DescribeRequest): Promise<TaskSubmitResponse> {
    let response = await this.http.post('/describe', {
      image_url: req.imageUrl,
      ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
      ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
    });
    return response.data;
  }

  async upscale(req: UpscaleRequest): Promise<TaskSubmitResponse> {
    let body: Record<string, string> = {
      type: req.type
    };
    if (req.parentTaskId) {
      body.parent_task_id = req.parentTaskId;
    }
    if (req.imageUrl) {
      body.image_url = req.imageUrl;
    }
    if (req.index) {
      body.index = req.index;
    }
    if (req.webhookUrl) {
      body.webhook_url = req.webhookUrl;
    }
    if (req.webhookSecret) {
      body.webhook_secret = req.webhookSecret;
    }

    let response = await this.http.post('/upscale-highres', body);
    return response.data;
  }

  async fetchTask(taskId: string): Promise<FetchTaskResponse> {
    let response = await this.http.post('/fetch', {
      task_id: taskId
    });
    return response.data;
  }

  async pollUntilComplete(
    taskId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<FetchTaskResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      let result = await this.fetchTask(taskId);

      if (
        result.status === 'processing' ||
        result.status === 'queued' ||
        result.status === 'pending'
      ) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(`Task ${taskId} failed: ${result.error || 'Unknown error'}`);
      }

      // If status is not a "pending" state, assume completed
      return result;
    }
    throw new Error(`Task ${taskId} timed out after ${maxAttempts} attempts`);
  }
}
