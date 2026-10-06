import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getBase64ByteLength,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export type ImageResult = { base64: string; seed: number; finishReason: string };
export type GenerationResult =
  | { status: 'in-progress' }
  | ({ status: 'complete' } & ImageResult);

export let decodeImage = (value: string, field = 'image', maxBytes = 10 * 1024 * 1024) => {
  let encoded = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/, '').replace(/\s/g, '');
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    throw createApiServiceError(
      `${field} must contain a base64-encoded PNG, JPEG, or WebP image.`
    );
  }
  if (getBase64ByteLength(encoded) > maxBytes) {
    throw createApiServiceError(
      `${field} exceeds the 10 MiB request limit. Use a smaller image.`
    );
  }
  let bytes = Buffer.from(encoded, 'base64');
  let mimeType = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? 'image/jpeg'
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
        ? 'image/webp'
        : undefined;
  if (!mimeType) throw createApiServiceError(`${field} must be a PNG, JPEG, or WebP image.`);
  return { bytes, mimeType };
};

let accountSchema = z.object({
  id: z.string(),
  email: z.string(),
  profile_picture: z.string().nullish(),
  organizations: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        is_default: z.boolean()
      })
    )
    .default([])
});
let imageResponseSchema = z.object({
  image: z.string().min(1),
  seed: z.number().optional(),
  finish_reason: z.enum(['SUCCESS', 'CONTENT_FILTERED'])
});
let parseResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(
      'Stability AI returned an incomplete or invalid response. Retry the operation.',
      {
        reason: 'invalid_provider_response'
      }
    );
  }
  return parsed.data;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.stability.ai',
      authHeader: { value: `Bearer ${token}` },
      contentType: false,
      timeout: 120_000,
      errorMapping: {
        extractResponseData: response => {
          let data: unknown = response.data;
          if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
            try {
              let bytes = data instanceof ArrayBuffer ? Buffer.from(data) : data;
              data = JSON.parse(bytes.toString('utf8'));
            } catch {
              return undefined;
            }
          }
          if (!isApiErrorRecord(data)) return data;
          return {
            ...data,
            message: extractApiErrorMessage(undefined, { response: { data } })
          };
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Stability AI',
          reason: 'stability_api_error'
        })
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

    let data = parseResponse(accountSchema, response.data);
    return {
      userId: data.id,
      email: data.email,
      profilePicture: data.profile_picture ?? '',
      organizations: data.organizations.map(org => ({
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

    return parseResponse(z.object({ credits: z.number() }), response.data);
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
    stylePreset?: string;
  }): Promise<{ base64: string; seed: number; finishReason: string }> {
    let formData = this.buildFormData({
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      aspect_ratio: params.aspectRatio,
      seed: params.seed,
      output_format: params.outputFormat,
      image: params.image,
      strength: params.strength,
      style_preset: params.stylePreset
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
    stylePreset?: string;
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
      strength: params.strength,
      style_preset: params.stylePreset
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

    this.validateFormData(
      '/v2beta/stable-image/edit/replace-background-and-relight',
      formData
    );
    let response = await this.axios.post(
      '/v2beta/stable-image/edit/replace-background-and-relight',
      formData,
      {
        headers: {
          ...this.authHeaders,
          Accept: 'application/json'
        }
      }
    );

    return {
      generationId: parseResponse(z.object({ id: z.string().length(64) }), response.data).id
    };
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

    this.validateFormData('/v2beta/stable-image/upscale/creative', formData);
    let response = await this.axios.post('/v2beta/stable-image/upscale/creative', formData, {
      headers: {
        ...this.authHeaders,
        Accept: 'application/json'
      }
    });

    return {
      generationId: parseResponse(z.object({ id: z.string().length(64) }), response.data).id
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
      fidelity: params.controlStrength,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
      output_format: params.outputFormat
    });

    return this.postImageEndpoint('/v2beta/stable-image/control/style', formData);
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
        ...this.authHeaders
      },
      responseType: 'arraybuffer'
    });
    let buffer = Buffer.from(response.data);
    if (
      buffer.length < 20 ||
      buffer.toString('ascii', 0, 4) !== 'glTF' ||
      buffer.readUInt32LE(4) !== 2 ||
      buffer.readUInt32LE(8) !== buffer.length
    )
      throw createApiServiceError('Stability AI did not return a valid GLB model.');
    return { base64: buffer.toString('base64') };
  }

  // ─── Helpers ──────────────────────────────────────────────

  private buildFormData(
    params: Record<string, string | number | boolean | undefined | null>
  ): FormData {
    let formData = new FormData();

    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (
        ['image', 'mask', 'subject_image', 'background_reference', 'light_reference'].includes(
          key
        )
      ) {
        if (typeof value !== 'string') throw createApiServiceError(`${key} must be an image.`);
        let { bytes, mimeType } = decodeImage(value, key);
        formData.append(
          key,
          new Blob([new Uint8Array(bytes)], { type: mimeType }),
          `${key}.${mimeType.split('/')[1]}`
        );
      } else if (typeof value === 'boolean') {
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
    this.validateFormData(path, formData);
    let response = await this.axios.post(path, formData, {
      headers: {
        ...this.authHeaders,
        Accept: 'application/json'
      }
    });

    let data = parseResponse(imageResponseSchema, response.data);
    decodeImage(data.image, 'generated image', Number.POSITIVE_INFINITY);
    return { base64: data.image, seed: data.seed ?? 0, finishReason: data.finish_reason };
  }

  private validateFormData(path: string, form: FormData) {
    let promptRequired = ![
      '/erase',
      '/outpaint',
      '/remove-background',
      '/fast',
      '/replace-background-and-relight'
    ].some(end => path.endsWith(end));
    if (promptRequired && !String(form.get('prompt') ?? '').trim()) {
      throw createApiServiceError('A nonempty prompt is required for this operation.');
    }
    for (let key of [
      'prompt',
      'negative_prompt',
      'search_prompt',
      'select_prompt',
      'background_prompt',
      'foreground_prompt'
    ]) {
      let value = form.get(key);
      if (typeof value === 'string' && value.length > 10_000)
        throw createApiServiceError(`${key} must be at most 10,000 characters.`);
    }
    for (let [end, field] of [
      ['/search-and-replace', 'search_prompt'],
      ['/search-and-recolor', 'select_prompt']
    ] as const) {
      if (path.endsWith(end) && !String(form.get(field) ?? '').trim())
        throw createApiServiceError(`${field} is required for this operation.`);
    }
    if (
      path.endsWith('/outpaint') &&
      !['left', 'right', 'up', 'down'].some(key => Number(form.get(key)) > 0)
    ) {
      throw createApiServiceError(
        'Outpaint requires at least one positive direction: left, right, up, or down.'
      );
    }
    if (path.endsWith('/replace-background-and-relight')) {
      if (
        !form.get('background_reference') &&
        !String(form.get('background_prompt') ?? '').trim()
      )
        throw createApiServiceError('Provide backgroundPrompt or backgroundReference.');
      if (
        form.has('light_source_strength') &&
        !form.has('light_reference') &&
        !form.has('light_source_direction')
      )
        throw createApiServiceError(
          'lightSourceStrength requires lightReference or lightSourceDirection.'
        );
    }
    if (
      form.has('creativity') &&
      (path.endsWith('/conservative') || path.endsWith('/creative'))
    ) {
      let min = path.endsWith('/conservative') ? 0.2 : 0.1;
      let value = Number(form.get('creativity'));
      if (value < min || value > 0.5)
        throw createApiServiceError(
          `creativity for this mode must be between ${min} and 0.5.`
        );
    }
  }

  async getGenerationResult(
    generationId: string,
    timeoutMs = 120_000
  ): Promise<GenerationResult> {
    try {
      let response = await this.axios.get(
        `/v2beta/results/${encodeURIComponent(generationId)}`,
        {
          headers: { ...this.authHeaders, Accept: 'application/json' },
          timeout: timeoutMs,
          validateStatus: (status: number) => status === 200 || status === 202
        }
      );
      if (response.status === 202) return { status: 'in-progress' };
      let data = parseResponse(imageResponseSchema, response.data);
      decodeImage(data.image, 'generated image', Number.POSITIVE_INFINITY);
      return {
        status: 'complete',
        base64: data.image,
        seed: data.seed ?? 0,
        finishReason: data.finish_reason
      };
    } catch (error) {
      let serviceError = buildApiServiceError(error, {
        providerLabel: 'Stability AI',
        reason: 'stability_api_error'
      });
      serviceError.data.generationId = generationId;
      serviceError.data.message += ` Generation ${generationId} can be checked with get_generation_result using the same connection within 24 hours after generation.`;
      serviceError.message = serviceError.data.message;
      throw serviceError;
    }
  }

  async waitForGeneration(
    generationId: string,
    maxAttempts = 30,
    intervalMs = 10_000
  ): Promise<GenerationResult> {
    let deadline = Date.now() + 300_000;
    let pollInterval = Math.max(intervalMs, 10_000);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      let result = await this.getGenerationResult(
        generationId,
        Math.min(remainingMs, 120_000)
      );
      if (result.status === 'complete') return result;
      if (attempt >= maxAttempts - 1 || deadline - Date.now() <= pollInterval) break;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    return { status: 'in-progress' };
  }

  async pollAsyncResult(
    resultUrl: string,
    maxAttempts = 30,
    intervalMs = 10_000
  ): Promise<ImageResult> {
    let generationId = resultUrl.split('/').at(-1);
    if (!generationId) throw createApiServiceError('A generation ID is required.');
    let result = await this.waitForGeneration(generationId, maxAttempts, intervalMs);
    if (result.status === 'complete')
      return { base64: result.base64, seed: result.seed, finishReason: result.finishReason };
    throw createApiServiceError(
      `Generation ${generationId} is still processing. Retrieve it with get_generation_result within 24 hours.`,
      { reason: 'generation_in_progress' }
    );
  }
}
