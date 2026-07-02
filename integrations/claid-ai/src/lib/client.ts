import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.claid.ai/v1'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ─── Image Editing ───────────────────────────────────────────────

  async editImage(params: {
    input: string;
    operations: Record<string, unknown>;
    output?: Record<string, unknown>;
  }) {
    let response = await api.post('/image/edit', params, {
      headers: this.headers
    });
    return response.data;
  }

  async editImageAsync(params: {
    input: string;
    operations: Record<string, unknown>;
    output?: Record<string, unknown>;
  }) {
    let response = await api.post('/image/edit/async', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getAsyncEditStatus(taskId: number) {
    let response = await api.get(`/image/edit/async/${taskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Text-to-Image Generation ────────────────────────────────────

  async generateImage(params: {
    input: string;
    options?: {
      number_of_images?: number;
      guidance_scale?: number;
    };
    output?: string;
  }) {
    let response = await api.post('/image/generate', params, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── AI Background Generation ────────────────────────────────────

  async createScene(params: {
    object: Record<string, unknown>;
    scene: Record<string, unknown>;
    output?: Record<string, unknown>;
  }) {
    let response = await api.post('/scene/create', params, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── AI Fashion Models ───────────────────────────────────────────

  async generateFashionModel(params: {
    input: {
      clothing: string[];
      model?: string;
    };
    output?: Record<string, unknown>;
    options?: Record<string, unknown>;
  }) {
    let response = await api.post('/image/ai-fashion-models', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getFashionModelStatus(taskId: number) {
    let response = await api.get(`/image/ai-fashion-models/${taskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Image-to-Video ──────────────────────────────────────────────

  async generateVideo(params: {
    input: string;
    output?: string;
    options: Record<string, unknown>;
  }) {
    let response = await api.post('/video/generate', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getVideoStatus(taskId: number) {
    let response = await api.get(`/video/generate/${taskId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Storage Connectors ──────────────────────────────────────────

  async listStorages() {
    let response = await api.get('/storage/storages', {
      headers: this.headers
    });
    return response.data;
  }

  async getStorage(storageId: number) {
    let response = await api.get(`/storage/storages/${storageId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createStorage(params: {
    name: string;
    type: string;
    parameters: Record<string, unknown>;
  }) {
    let response = await api.post('/storage/storages', params, {
      headers: this.headers
    });
    return response.data;
  }

  async updateStorage(
    storageId: number,
    params: {
      name?: string;
      type?: string;
      parameters?: Record<string, unknown>;
    }
  ) {
    let response = await api.patch(`/storage/storages/${storageId}`, params, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteStorage(storageId: number) {
    let response = await api.delete(`/storage/storages/${storageId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listStorageTypes() {
    let response = await api.get('/storage/storage-types', {
      headers: this.headers
    });
    return response.data;
  }
}
