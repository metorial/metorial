import { createAxios } from 'slates';
import { midjourneyApiError, midjourneyServiceError } from './errors';
import type {
  AccountInfoResponse,
  BlendRequest,
  DescribeRequest,
  ExtendVideoRequest,
  FetchManyResponse,
  FetchTaskResponse,
  ImagineRequest,
  ImagineVideoRequest,
  InpaintRequest,
  OutpaintRequest,
  PanRequest,
  RerollRequest,
  SeedRequest,
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

  private async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    operation: string
  ): Promise<T> {
    try {
      let response = await this.http.post(endpoint, body);
      return response.data;
    } catch (error) {
      throw midjourneyApiError(error, operation);
    }
  }

  private async get<T>(endpoint: string, operation: string): Promise<T> {
    try {
      let response = await this.http.get(endpoint);
      return response.data;
    } catch (error) {
      throw midjourneyApiError(error, operation);
    }
  }

  async imagine(req: ImagineRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/imagine',
      {
        prompt: req.prompt,
        ...(req.aspectRatio ? { aspect_ratio: req.aspectRatio } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'imagine'
    );
  }

  async variations(req: VariationsRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/variations',
      {
        parent_task_id: req.parentTaskId,
        index: req.index,
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'create variations'
    );
  }

  async blend(req: BlendRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/blend',
      {
        image_urls: req.imageUrls,
        ...(req.dimension ? { dimension: req.dimension } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'blend images'
    );
  }

  async describe(req: DescribeRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/describe',
      {
        image_url: req.imageUrl,
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'describe image'
    );
  }

  async upscale(req: UpscaleRequest): Promise<TaskSubmitResponse> {
    let webhookBody = {
      ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
      ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
    };

    if (req.type === '1x') {
      return await this.post<TaskSubmitResponse>(
        '/upscale-1x',
        {
          parent_task_id: req.parentTaskId,
          index: req.index,
          ...webhookBody
        },
        'upscale image 1x'
      );
    }

    if (req.type === 'subtle' || req.type === 'creative') {
      return await this.post<TaskSubmitResponse>(
        '/upscale-alt',
        {
          parent_task_id: req.parentTaskId,
          type: req.type,
          ...webhookBody
        },
        `upscale image ${req.type}`
      );
    }

    return await this.post<TaskSubmitResponse>(
      '/upscale-highres',
      {
        type: req.type,
        ...(req.parentTaskId ? { parent_task_id: req.parentTaskId } : {}),
        ...(req.imageUrl ? { image_url: req.imageUrl } : {}),
        ...(req.index ? { index: req.index } : {}),
        ...webhookBody
      },
      `upscale image ${req.type}`
    );
  }

  async reroll(req: RerollRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/reroll',
      {
        parent_task_id: req.parentTaskId,
        ...(req.prompt ? { prompt: req.prompt } : {}),
        ...(req.aspectRatio ? { aspect_ratio: req.aspectRatio } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'reroll image'
    );
  }

  async pan(req: PanRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/pan',
      {
        parent_task_id: req.parentTaskId,
        direction: req.direction,
        ...(req.prompt ? { prompt: req.prompt } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'pan image'
    );
  }

  async outpaint(req: OutpaintRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/outpaint',
      {
        parent_task_id: req.parentTaskId,
        zoom_ratio: req.zoomRatio,
        ...(req.aspectRatio ? { aspect_ratio: req.aspectRatio } : {}),
        ...(req.prompt ? { prompt: req.prompt } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'zoom out image'
    );
  }

  async inpaint(req: InpaintRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/inpaint',
      {
        parent_task_id: req.parentTaskId,
        mask: req.mask,
        ...(req.prompt ? { prompt: req.prompt } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'inpaint image'
    );
  }

  async getSeed(req: SeedRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/seed',
      {
        task_id: req.taskId,
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'get seed'
    );
  }

  async imagineVideo(req: ImagineVideoRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/imagine-video',
      {
        prompt: req.prompt,
        image_url: req.imageUrl,
        ...(req.motion ? { motion: req.motion } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'generate video'
    );
  }

  async extendVideo(req: ExtendVideoRequest): Promise<TaskSubmitResponse> {
    return await this.post<TaskSubmitResponse>(
      '/imagine-video-extend',
      {
        parent_task_id: req.parentTaskId,
        index: req.index,
        prompt: req.prompt,
        ...(req.imageUrl ? { image_url: req.imageUrl } : {}),
        ...(req.motion ? { motion: req.motion } : {}),
        ...(req.webhookUrl ? { webhook_url: req.webhookUrl } : {}),
        ...(req.webhookSecret ? { webhook_secret: req.webhookSecret } : {})
      },
      'extend video'
    );
  }

  async fetchTask(taskId: string): Promise<FetchTaskResponse> {
    return await this.post<FetchTaskResponse>(
      '/fetch',
      {
        task_id: taskId
      },
      'fetch task'
    );
  }

  async fetchMany(taskIds: string[]): Promise<FetchManyResponse> {
    return await this.post<FetchManyResponse>(
      '/fetch-many',
      {
        task_ids: taskIds
      },
      'fetch many tasks'
    );
  }

  async getAccountInfo(): Promise<AccountInfoResponse> {
    return await this.get<AccountInfoResponse>('/account', 'get account info');
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
        result.status === 'pending' ||
        result.status === 'staged' ||
        result.status === 'starting' ||
        result.status === 'retry' ||
        result.status === 'retrying'
      ) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw midjourneyServiceError(
          `Task ${taskId} failed: ${result.error || 'Unknown error'}`
        );
      }

      // If status is not a "pending" state, assume completed
      return result;
    }
    throw midjourneyServiceError(`Task ${taskId} timed out after ${maxAttempts} attempts`);
  }
}
