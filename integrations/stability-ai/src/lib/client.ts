import { createAxios } from 'slates';

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: 'https://api.stability.ai'
    });
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ─── Account ────────────────────────────────────────────

  async getAccount(): Promise<{
    id: string;
    email: string;
    profilePicture: string;
    organizations: Array<{ id: string; name: string; role: string; isDefault: boolean }>;
  }> {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/v1/user/account', {
      headers: this.authHeaders()
    });
    return {
      id: response.data.id,
      email: response.data.email,
      profilePicture: response.data.profile_picture,
      organizations: (response.data.organizations || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        role: org.role,
        isDefault: org.is_default
      }))
    };
  }

  async getBalance(): Promise<{ credits: number }> {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/v1/user/balance', {
      headers: this.authHeaders()
    });
    return { credits: response.data.credits };
  }

  // ─── Image Generation ───────────────────────────────────

  async generateImageUltra(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: string;
    image?: string;
    strength?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.aspectRatio) formData.append('aspect_ratio', params.aspectRatio);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.image) {
      let imageBlob = this.base64ToBlob(params.image);
      formData.append('image', imageBlob, 'image.png');
    }
    if (params.strength !== undefined) formData.append('strength', String(params.strength));

    let response = await axios.post('/v2beta/stable-image/generate/ultra', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async generateImageCore(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: string;
    stylePreset?: string;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.aspectRatio) formData.append('aspect_ratio', params.aspectRatio);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.stylePreset) formData.append('style_preset', params.stylePreset);

    let response = await axios.post('/v2beta/stable-image/generate/core', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async generateImageSD3(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: string;
    model?: string;
    image?: string;
    strength?: number;
    cfgScale?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.aspectRatio) formData.append('aspect_ratio', params.aspectRatio);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.model) formData.append('model', params.model);
    if (params.image) {
      let imageBlob = this.base64ToBlob(params.image);
      formData.append('image', imageBlob, 'image.png');
    }
    if (params.strength !== undefined) formData.append('strength', String(params.strength));
    if (params.cfgScale !== undefined) formData.append('cfg_scale', String(params.cfgScale));

    let response = await axios.post('/v2beta/stable-image/generate/sd3', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  // ─── Image Editing ──────────────────────────────────────

  async eraseImage(params: {
    image: string;
    mask?: string;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    if (params.mask) formData.append('mask', this.base64ToBlob(params.mask), 'mask.png');
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));

    let response = await axios.post('/v2beta/stable-image/edit/erase', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async inpaintImage(params: {
    image: string;
    prompt: string;
    mask?: string;
    negativePrompt?: string;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    if (params.mask) formData.append('mask', this.base64ToBlob(params.mask), 'mask.png');
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));

    let response = await axios.post('/v2beta/stable-image/edit/inpaint', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async outpaintImage(params: {
    image: string;
    prompt?: string;
    left?: number;
    right?: number;
    up?: number;
    down?: number;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    if (params.prompt) formData.append('prompt', params.prompt);
    if (params.left !== undefined) formData.append('left', String(params.left));
    if (params.right !== undefined) formData.append('right', String(params.right));
    if (params.up !== undefined) formData.append('up', String(params.up));
    if (params.down !== undefined) formData.append('down', String(params.down));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));

    let response = await axios.post('/v2beta/stable-image/edit/outpaint', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async searchAndReplace(params: {
    image: string;
    prompt: string;
    searchPrompt: string;
    negativePrompt?: string;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    formData.append('search_prompt', params.searchPrompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));

    let response = await axios.post('/v2beta/stable-image/edit/search-and-replace', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async searchAndRecolor(params: {
    image: string;
    prompt: string;
    selectPrompt: string;
    negativePrompt?: string;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    formData.append('select_prompt', params.selectPrompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));

    let response = await axios.post('/v2beta/stable-image/edit/search-and-recolor', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async removeBackground(params: {
    image: string;
    outputFormat?: string;
  }): Promise<{ base64Image: string; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    if (params.outputFormat) formData.append('output_format', params.outputFormat);

    let response = await axios.post('/v2beta/stable-image/edit/remove-background', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      finishReason: response.data.finish_reason
    };
  }

  async replaceBackgroundAndRelight(params: {
    subjectImage: string;
    backgroundPrompt?: string;
    backgroundReference?: string;
    foregroundPrompt?: string;
    lightSourceDirection?: string;
    lightSourceStrength?: number;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('subject_image', this.base64ToBlob(params.subjectImage), 'subject.png');
    if (params.backgroundPrompt) formData.append('background_prompt', params.backgroundPrompt);
    if (params.backgroundReference)
      formData.append(
        'background_reference',
        this.base64ToBlob(params.backgroundReference),
        'bg_reference.png'
      );
    if (params.foregroundPrompt) formData.append('foreground_prompt', params.foregroundPrompt);
    if (params.lightSourceDirection)
      formData.append('light_source_direction', params.lightSourceDirection);
    if (params.lightSourceStrength !== undefined)
      formData.append('light_source_strength', String(params.lightSourceStrength));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));

    let response = await axios.post(
      '/v2beta/stable-image/edit/replace-background-and-relight',
      formData,
      {
        headers: {
          ...this.authHeaders(),
          Accept: 'application/json'
        }
      }
    );

    // This endpoint may be async - handle both sync and async responses
    if (response.data.id) {
      return await this.pollAsyncResult(response.data.id);
    }

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  // ─── Image Upscaling ───────────────────────────────────

  async upscaleFast(params: {
    image: string;
    outputFormat?: string;
  }): Promise<{ base64Image: string; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    if (params.outputFormat) formData.append('output_format', params.outputFormat);

    let response = await axios.post('/v2beta/stable-image/upscale/fast', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      finishReason: response.data.finish_reason
    };
  }

  async upscaleConservative(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    outputFormat?: string;
    seed?: number;
    creativity?: number;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.creativity !== undefined)
      formData.append('creativity', String(params.creativity));

    let response = await axios.post('/v2beta/stable-image/upscale/conservative', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async upscaleCreativeStart(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    outputFormat?: string;
    seed?: number;
    creativity?: number;
  }): Promise<{ generationId: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.outputFormat) formData.append('output_format', params.outputFormat);
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.creativity !== undefined)
      formData.append('creativity', String(params.creativity));

    let response = await axios.post('/v2beta/stable-image/upscale/creative', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      generationId: response.data.id
    };
  }

  async fetchAsyncResult(generationId: string): Promise<{
    status: string;
    base64Image?: string;
    seed?: number;
    finishReason?: string;
  }> {
    let axios = this.createAxiosInstance();
    let response = await axios.get(`/v2beta/results/${generationId}`, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      },
      validateStatus: (status: number) => status === 200 || status === 202
    });

    if (response.status === 202) {
      return { status: 'in-progress' };
    }

    return {
      status: 'complete',
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async pollAsyncResult(
    generationId: string,
    maxAttempts: number = 30,
    intervalMs: number = 10000
  ): Promise<{
    base64Image: string;
    seed: number;
    finishReason: string;
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      let result = await this.fetchAsyncResult(generationId);
      if (result.status === 'complete' && result.base64Image) {
        return {
          base64Image: result.base64Image,
          seed: result.seed!,
          finishReason: result.finishReason!
        };
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(
      `Async generation ${generationId} did not complete within the expected time.`
    );
  }

  // ─── Image Control ─────────────────────────────────────

  async controlSketch(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    controlStrength?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.controlStrength !== undefined)
      formData.append('control_strength', String(params.controlStrength));
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);

    let response = await axios.post('/v2beta/stable-image/control/sketch', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async controlStructure(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    controlStrength?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.controlStrength !== undefined)
      formData.append('control_strength', String(params.controlStrength));
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);

    let response = await axios.post('/v2beta/stable-image/control/structure', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async controlStyle(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    fidelity?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64Image: string; seed: number; finishReason: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    formData.append('prompt', params.prompt);
    if (params.negativePrompt) formData.append('negative_prompt', params.negativePrompt);
    if (params.fidelity !== undefined) formData.append('fidelity', String(params.fidelity));
    if (params.seed !== undefined) formData.append('seed', String(params.seed));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);

    let response = await axios.post('/v2beta/stable-image/control/style', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Image: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  // ─── Audio Generation ──────────────────────────────────

  async generateAudio(params: {
    prompt: string;
    duration?: number;
    outputFormat?: string;
  }): Promise<{ base64Audio: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    if (params.duration !== undefined) formData.append('duration', String(params.duration));
    if (params.outputFormat) formData.append('output_format', params.outputFormat);

    let response = await axios.post('/v2beta/audio/stable-audio/generate', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return {
      base64Audio: response.data.audio
    };
  }

  // ─── 3D Generation ─────────────────────────────────────

  async generateFast3D(params: {
    image: string;
    textureResolution?: string;
    foregroundRatio?: number;
    remesh?: string;
  }): Promise<{ base64Model: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    if (params.textureResolution)
      formData.append('texture_resolution', params.textureResolution);
    if (params.foregroundRatio !== undefined)
      formData.append('foreground_ratio', String(params.foregroundRatio));
    if (params.remesh) formData.append('remesh', params.remesh);

    let response = await axios.post('/v2beta/3d/stable-fast-3d', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      },
      responseType: 'arraybuffer'
    });

    // Response is a GLB binary, encode it as base64
    let bytes = new Uint8Array(response.data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64Model = btoa(binary);

    return { base64Model };
  }

  async generateSpar3D(params: {
    image: string;
    textureResolution?: string;
    foregroundRatio?: number;
    remesh?: string;
  }): Promise<{ base64Model: string }> {
    let axios = this.createAxiosInstance();
    let formData = new FormData();
    formData.append('image', this.base64ToBlob(params.image), 'image.png');
    if (params.textureResolution)
      formData.append('texture_resolution', params.textureResolution);
    if (params.foregroundRatio !== undefined)
      formData.append('foreground_ratio', String(params.foregroundRatio));
    if (params.remesh) formData.append('remesh', params.remesh);

    let response = await axios.post('/v2beta/3d/stable-point-aware-3d', formData, {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      },
      responseType: 'arraybuffer'
    });

    let bytes = new Uint8Array(response.data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64Model = btoa(binary);

    return { base64Model };
  }

  // ─── Helpers ────────────────────────────────────────────

  private base64ToBlob(base64: string): Blob {
    let binaryStr = atob(base64);
    let len = binaryStr.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes]);
  }
}
