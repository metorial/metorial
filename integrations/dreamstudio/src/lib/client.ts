import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.stability.ai'
    });
  }

  private get authHeaders() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  // ─── Account ──────────────────────────────────────────────

  async getAccount(): Promise<{
    userId: string;
    email: string;
    profilePicture: string;
    organizations: Array<{
      organizationId: string;
      name: string;
      role: string;
      isDefault: boolean;
    }>;
  }> {
    let response = await this.axios.get('/v1/user/account', {
      headers: this.authHeaders
    });

    let data = response.data;
    return {
      userId: data.id,
      email: data.email,
      profilePicture: data.profile_picture,
      organizations: (data.organizations || []).map((org: any) => ({
        organizationId: org.id,
        name: org.name,
        role: org.role,
        isDefault: org.is_default
      }))
    };
  }

  async getBalance(): Promise<{ credits: number }> {
    let response = await this.axios.get('/v1/user/balance', {
      headers: this.authHeaders
    });

    return { credits: response.data.credits };
  }

  // ─── Image Generation ─────────────────────────────────────

  async generateImageUltra(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: string;
    image?: string;
    strength?: number;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      aspect_ratio: params.aspectRatio,
      seed: params.seed,
      output_format: params.outputFormat,
      image: params.image,
      strength: params.strength
    });

    return this.postImageEndpoint('/v2beta/stable-image/generate/ultra', formData);
  }

  async generateImageCore(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: string;
    stylePreset?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      aspect_ratio: params.aspectRatio,
      seed: params.seed,
      output_format: params.outputFormat,
      style_preset: params.stylePreset
    });

    return this.postImageEndpoint('/v2beta/stable-image/generate/core', formData);
  }

  async generateImageSd3(params: {
    prompt: string;
    model?: string;
    mode?: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: string;
    cfgScale?: number;
    image?: string;
    strength?: number;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      prompt: params.prompt,
      model: params.model,
      mode: params.mode,
      negative_prompt: params.negativePrompt,
      aspect_ratio: params.aspectRatio,
      seed: params.seed,
      output_format: params.outputFormat,
      cfg_scale: params.cfgScale,
      image: params.image,
      strength: params.strength
    });

    return this.postImageEndpoint('/v2beta/stable-image/generate/sd3', formData);
  }

  // ─── Image Editing ────────────────────────────────────────

  async inpaint(params: {
    image: string;
    prompt: string;
    mask?: string;
    negativePrompt?: string;
    growMask?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      mask: params.mask,
      negative_prompt: params.negativePrompt,
      grow_mask: params.growMask,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/edit/inpaint', formData);
  }

  async erase(params: {
    image: string;
    mask?: string;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      mask: params.mask,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/edit/erase', formData);
  }

  async outpaint(params: {
    image: string;
    left?: number;
    right?: number;
    up?: number;
    down?: number;
    prompt?: string;
    creativity?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      left: params.left,
      right: params.right,
      up: params.up,
      down: params.down,
      prompt: params.prompt,
      creativity: params.creativity,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/edit/outpaint', formData);
  }

  async searchAndReplace(params: {
    image: string;
    prompt: string;
    searchPrompt: string;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      search_prompt: params.searchPrompt,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/edit/search-and-replace', formData);
  }

  async searchAndRecolor(params: {
    image: string;
    prompt: string;
    selectPrompt: string;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      select_prompt: params.selectPrompt,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/edit/search-and-recolor', formData);
  }

  async removeBackground(params: {
    image: string;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/edit/remove-background', formData);
  }

  async replaceBackgroundAndRelight(params: {
    subjectImage: string;
    backgroundPrompt?: string;
    foregroundPrompt?: string;
    backgroundReference?: string;
    lightSourceDirection?: string;
    lightSourceStrength?: number;
    lightReference?: string;
    negativePrompt?: string;
    keepOriginalBackground?: boolean;
    originalBackgroundDepth?: number;
    preserveOriginalSubject?: number;
    outputFormat?: string;
    seed?: number;
  }): Promise<{ generationId: string }> {
    let formData = this.buildFormData({
      subject_image: params.subjectImage,
      background_prompt: params.backgroundPrompt,
      foreground_prompt: params.foregroundPrompt,
      background_reference: params.backgroundReference,
      light_source_direction: params.lightSourceDirection,
      light_source_strength: params.lightSourceStrength,
      light_reference: params.lightReference,
      negative_prompt: params.negativePrompt,
      keep_original_background: params.keepOriginalBackground,
      original_background_depth: params.originalBackgroundDepth,
      preserve_original_subject: params.preserveOriginalSubject,
      output_format: params.outputFormat,
      seed: params.seed
    });

    let response = await this.axios.post(
      '/v2beta/stable-image/edit/replace-background-and-relight',
      formData,
      {
        headers: {
          ...this.authHeaders,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json'
        }
      }
    );

    return { generationId: response.data.id };
  }

  // ─── Image Upscaling ──────────────────────────────────────

  async upscaleConservative(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    creativity?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      creativity: params.creativity,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/upscale/conservative', formData);
  }

  async upscaleCreativeSubmit(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    creativity?: number;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ generationId: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      creativity: params.creativity,
      seed: params.seed,
      output_format: params.outputFormat
    });

    let response = await this.axios.post('/v2beta/stable-image/upscale/creative', formData, {
      headers: {
        ...this.authHeaders,
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json'
      }
    });

    return { generationId: response.data.id };
  }

  async upscaleCreativeResult(generationId: string): Promise<{
    status: string;
    base64?: string;
    seed?: number;
    finishReason?: string;
  }> {
    let response = await this.axios.get(
      `/v2beta/stable-image/upscale/creative/result/${generationId}`,
      {
        headers: {
          ...this.authHeaders,
          Accept: 'application/json'
        },
        validateStatus: (status: number) => status === 200 || status === 202
      }
    );

    if (response.status === 202) {
      return { status: 'in-progress' };
    }

    return {
      status: 'complete',
      base64: response.data.image,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  async upscaleFast(params: {
    image: string;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/upscale/fast', formData);
  }

  // ─── Image Control ────────────────────────────────────────

  async controlSketch(params: {
    image: string;
    prompt: string;
    controlStrength?: number;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      control_strength: params.controlStrength,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/control/sketch', formData);
  }

  async controlStructure(params: {
    image: string;
    prompt: string;
    controlStrength?: number;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      control_strength: params.controlStrength,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/control/structure', formData);
  }

  async controlStyle(params: {
    image: string;
    prompt: string;
    controlStrength?: number;
    negativePrompt?: string;
    seed?: number;
    outputFormat?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      image: params.image,
      prompt: params.prompt,
      control_strength: params.controlStrength,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/control/style', formData);
  }

  // ─── Video ────────────────────────────────────────────────

  async generateVideoSubmit(params: {
    image: string;
    seed?: number;
    cfgScale?: number;
    motionBucketId?: number;
  }): Promise<{ generationId: string }> {
    let formData = this.buildFormData({
      image: params.image,
      seed: params.seed,
      cfg_scale: params.cfgScale,
      motion_bucket_id: params.motionBucketId
    });

    let response = await this.axios.post('/v2beta/image-to-video', formData, {
      headers: {
        ...this.authHeaders,
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json'
      }
    });

    return { generationId: response.data.id };
  }

  async getVideoResult(generationId: string): Promise<{
    status: string;
    base64?: string;
    seed?: number;
    finishReason?: string;
  }> {
    let response = await this.axios.get(`/v2beta/image-to-video/result/${generationId}`, {
      headers: {
        ...this.authHeaders,
        Accept: 'application/json'
      },
      validateStatus: (status: number) => status === 200 || status === 202
    });

    if (response.status === 202) {
      return { status: 'in-progress' };
    }

    return {
      status: 'complete',
      base64: response.data.video,
      seed: response.data.seed,
      finishReason: response.data.finish_reason
    };
  }

  // ─── 3D ───────────────────────────────────────────────────

  async generateStableFast3D(params: {
    image: string;
    textureResolution?: number;
    foregroundRatio?: number;
    remesh?: string;
  }): Promise<{ base64: string }> {
    let formData = this.buildFormData({
      image: params.image,
      texture_resolution: params.textureResolution,
      foreground_ratio: params.foregroundRatio,
      remesh: params.remesh
    });

    let response = await this.axios.post('/v2beta/3d/stable-fast-3d', formData, {
      headers: {
        ...this.authHeaders,
        'Content-Type': 'multipart/form-data'
      },
      responseType: 'arraybuffer'
    });
    let buffer = Buffer.from(response.data);
    return { base64: buffer.toString('base64') };
  }

  // ─── Helpers ──────────────────────────────────────────────

  private buildFormData(
    params: Record<string, string | number | boolean | undefined | null>
  ): FormData {
    let formData = new FormData();

    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      } else if (typeof value === 'number') {
        formData.append(key, String(value));
      } else {
        formData.append(key, value);
      }
    }

    return formData;
  }

  private async postImageEndpoint(
    path: string,
    formData: FormData
  ): Promise<{ base64: string; seed: number; finishReason: string }> {
    let response = await this.axios.post(path, formData, {
      headers: {
        ...this.authHeaders,
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json'
      }
    });

    return {
      base64: response.data.image,
      seed: response.data.seed ?? 0,
      finishReason: response.data.finish_reason ?? 'SUCCESS'
    };
  }

  async pollAsyncResult(
    resultUrl: string,
    maxAttempts: number = 30,
    intervalMs: number = 10000
  ): Promise<{ base64: string; seed: number; finishReason: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let response = await this.axios.get(resultUrl, {
        headers: {
          ...this.authHeaders,
          Accept: 'application/json'
        },
        validateStatus: (status: number) => status === 200 || status === 202
      });

      if (response.status === 200) {
        return {
          base64: response.data.image || response.data.video,
          seed: response.data.seed ?? 0,
          finishReason: response.data.finish_reason ?? 'SUCCESS'
        };
      }

      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error(
      'Async generation timed out after polling. Try fetching the result later using the generation ID.'
    );
  }
}
