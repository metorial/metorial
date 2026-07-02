import { Buffer } from 'node:buffer';
import { createAxios, getBase64ByteLength } from 'slates';
import { stabilityApiError, stabilityServiceError } from './errors';

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp';
export type AudioOutputFormat = 'mp3' | 'wav';

export type MediaResult = {
  contentBase64: string;
  mimeType: string;
  byteLength: number;
  seed?: number;
  finishReason?: string;
  generationId?: string;
};

type AsyncMediaResult =
  | {
      status: 'in-progress';
    }
  | ({
      status: 'complete';
    } & MediaResult);

type GenerationStart = {
  id?: string;
};

type StabilityMediaJson = {
  image?: string;
  audio?: string;
  seed?: number;
  finish_reason?: string;
};

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

  private authHeaders(accept = 'application/json') {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: accept
    };
  }

  private appendOptional(formData: FormData, key: string, value: unknown) {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
  }

  private normalizeBase64(label: string, base64: string) {
    let normalized = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
    normalized = normalized.replace(/\s+/g, '');

    if (
      !normalized ||
      normalized.length % 4 === 1 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
    ) {
      throw stabilityServiceError(`${label} must be valid non-empty base64 data.`);
    }

    return normalized;
  }

  private base64ToBlob(label: string, base64: string, mimeType = 'application/octet-stream') {
    let bytes = Buffer.from(this.normalizeBase64(label, base64), 'base64');
    if (bytes.length === 0) {
      throw stabilityServiceError(`${label} must contain at least one byte.`);
    }

    return new Blob([bytes], { type: mimeType });
  }

  private appendBase64File(
    formData: FormData,
    key: string,
    label: string,
    base64: string,
    filename: string,
    mimeType = 'application/octet-stream'
  ) {
    formData.append(key, this.base64ToBlob(label, base64, mimeType), filename);
  }

  private imageMimeType(outputFormat?: ImageOutputFormat) {
    return `image/${outputFormat ?? 'png'}`;
  }

  private audioMimeType(outputFormat?: AudioOutputFormat) {
    return outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';
  }

  private mediaResultFromJson(
    data: StabilityMediaJson,
    mediaKey: 'image' | 'audio',
    mimeType: string,
    generationId?: string
  ): MediaResult {
    let contentBase64 = data[mediaKey];
    if (typeof contentBase64 !== 'string' || contentBase64.length === 0) {
      throw stabilityServiceError('Stability AI response did not include generated media.');
    }

    return {
      contentBase64,
      mimeType,
      byteLength: getBase64ByteLength(contentBase64),
      seed: typeof data.seed === 'number' ? data.seed : undefined,
      finishReason: data.finish_reason,
      generationId
    };
  }

  private async postFormJson<T>(
    path: string,
    formData: FormData,
    operation: string,
    expectedStatus?: number
  ) {
    let axios = this.createAxiosInstance();

    try {
      let options: {
        headers: ReturnType<Client['authHeaders']>;
        validateStatus?: (status: number) => boolean;
      } = {
        headers: this.authHeaders('application/json')
      };
      if (expectedStatus !== undefined) {
        options.validateStatus = (status: number) => status === expectedStatus;
      }

      let response = await axios.post(path, formData, options);
      return response.data as T;
    } catch (error) {
      throw stabilityApiError(error, operation);
    }
  }

  private async postFormBinary(path: string, formData: FormData, operation: string) {
    let axios = this.createAxiosInstance();

    try {
      let response = await axios.post(path, formData, {
        headers: this.authHeaders('model/gltf-binary'),
        responseType: 'arraybuffer'
      });
      let buffer = Buffer.from(response.data);

      return {
        contentBase64: buffer.toString('base64'),
        mimeType: 'model/gltf-binary',
        byteLength: buffer.byteLength
      } satisfies MediaResult;
    } catch (error) {
      throw stabilityApiError(error, operation);
    }
  }

  private async getAsyncMediaResult(params: {
    path: string;
    mediaKey: 'image' | 'audio';
    mimeType: string;
    generationId: string;
    operation: string;
  }): Promise<AsyncMediaResult> {
    let axios = this.createAxiosInstance();

    try {
      let response = await axios.get(params.path, {
        headers: this.authHeaders('application/json'),
        validateStatus: (status: number) => status === 200 || status === 202
      });

      if (response.status === 202) {
        return { status: 'in-progress' };
      }

      return {
        status: 'complete',
        ...this.mediaResultFromJson(
          response.data,
          params.mediaKey,
          params.mimeType,
          params.generationId
        )
      };
    } catch (error) {
      throw stabilityApiError(error, params.operation);
    }
  }

  private async pollAsyncMediaResult(params: {
    path: string;
    mediaKey: 'image' | 'audio';
    mimeType: string;
    generationId: string;
    operation: string;
    maxAttempts?: number;
    intervalMs?: number;
  }): Promise<MediaResult> {
    let maxAttempts = params.maxAttempts ?? 30;
    let intervalMs = params.intervalMs ?? 10_000;

    for (let i = 0; i < maxAttempts; i++) {
      let result = await this.getAsyncMediaResult(params);
      if (result.status === 'complete') {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw stabilityServiceError(
      `Stability AI ${params.operation} ${params.generationId} did not complete within the expected time.`
    );
  }

  private assertGenerationId(response: GenerationStart, operation: string) {
    if (!response.id) {
      throw stabilityServiceError(
        `Stability AI ${operation} response did not include a generation ID.`
      );
    }

    return response.id;
  }

  async getAccount(): Promise<{
    id: string;
    email: string;
    profilePicture: string;
    organizations: Array<{ id: string; name: string; role: string; isDefault: boolean }>;
  }> {
    let axios = this.createAxiosInstance();

    try {
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
    } catch (error) {
      throw stabilityApiError(error, 'get account');
    }
  }

  async getBalance(): Promise<{ credits: number }> {
    let axios = this.createAxiosInstance();

    try {
      let response = await axios.get('/v1/user/balance', {
        headers: this.authHeaders()
      });
      return { credits: response.data.credits };
    } catch (error) {
      throw stabilityApiError(error, 'get balance');
    }
  }

  async generateImageUltra(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: ImageOutputFormat | string;
    seed?: number;
    outputFormat?: ImageOutputFormat;
    image?: string;
    strength?: number;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'aspect_ratio', params.aspectRatio);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'style_preset', params.stylePreset);
    this.appendOptional(formData, 'strength', params.strength);
    if (params.image) {
      this.appendBase64File(
        formData,
        'image',
        'referenceImage',
        params.image,
        'reference.png',
        'image/png'
      );
    }

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/generate/ultra',
      formData,
      'generate image ultra'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async generateImageCore(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: ImageOutputFormat;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'aspect_ratio', params.aspectRatio);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'style_preset', params.stylePreset);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/generate/core',
      formData,
      'generate image core'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async generateImageSD3(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    seed?: number;
    outputFormat?: ImageOutputFormat;
    model?: string;
    image?: string;
    strength?: number;
    cfgScale?: number;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('mode', params.image ? 'image-to-image' : 'text-to-image');
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'aspect_ratio', params.aspectRatio);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'model', params.model);
    this.appendOptional(formData, 'strength', params.strength);
    this.appendOptional(formData, 'cfg_scale', params.cfgScale);
    this.appendOptional(formData, 'style_preset', params.stylePreset);
    if (params.image) {
      this.appendBase64File(
        formData,
        'image',
        'referenceImage',
        params.image,
        'reference.png',
        'image/png'
      );
    }

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/generate/sd3',
      formData,
      'generate image sd3'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async eraseImage(params: {
    image: string;
    prompt: string;
    mask?: string;
    growMask?: number;
    outputFormat?: ImageOutputFormat;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    if (params.mask) {
      this.appendBase64File(formData, 'mask', 'mask', params.mask, 'mask.png', 'image/png');
    }
    this.appendOptional(formData, 'grow_mask', params.growMask);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/edit/erase',
      formData,
      'erase image'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async inpaintImage(params: {
    image: string;
    prompt: string;
    mask?: string;
    negativePrompt?: string;
    growMask?: number;
    stylePreset?: string;
    outputFormat?: ImageOutputFormat;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    if (params.mask) {
      this.appendBase64File(formData, 'mask', 'mask', params.mask, 'mask.png', 'image/png');
    }
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'grow_mask', params.growMask);
    this.appendOptional(formData, 'style_preset', params.stylePreset);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/edit/inpaint',
      formData,
      'inpaint image'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async outpaintImage(params: {
    image: string;
    prompt?: string;
    left?: number;
    right?: number;
    up?: number;
    down?: number;
    creativity?: number;
    stylePreset?: string;
    outputFormat?: ImageOutputFormat;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    this.appendOptional(formData, 'prompt', params.prompt);
    this.appendOptional(formData, 'left', params.left);
    this.appendOptional(formData, 'right', params.right);
    this.appendOptional(formData, 'up', params.up);
    this.appendOptional(formData, 'down', params.down);
    this.appendOptional(formData, 'creativity', params.creativity);
    this.appendOptional(formData, 'style_preset', params.stylePreset);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/edit/outpaint',
      formData,
      'outpaint image'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async searchAndReplace(params: {
    image: string;
    prompt: string;
    searchPrompt: string;
    negativePrompt?: string;
    growMask?: number;
    stylePreset?: string;
    outputFormat?: ImageOutputFormat;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    formData.append('search_prompt', params.searchPrompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'grow_mask', params.growMask);
    this.appendOptional(formData, 'style_preset', params.stylePreset);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/edit/search-and-replace',
      formData,
      'search and replace'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async searchAndRecolor(params: {
    image: string;
    prompt: string;
    selectPrompt: string;
    negativePrompt?: string;
    growMask?: number;
    stylePreset?: string;
    outputFormat?: ImageOutputFormat;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    formData.append('select_prompt', params.selectPrompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'grow_mask', params.growMask);
    this.appendOptional(formData, 'style_preset', params.stylePreset);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/edit/search-and-recolor',
      formData,
      'search and recolor'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async removeBackground(params: {
    image: string;
    outputFormat?: 'png' | 'webp';
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    this.appendOptional(formData, 'output_format', params.outputFormat);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/edit/remove-background',
      formData,
      'remove background'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async replaceBackgroundAndRelight(params: {
    subjectImage: string;
    backgroundPrompt?: string;
    backgroundReference?: string;
    foregroundPrompt?: string;
    negativePrompt?: string;
    preserveOriginalSubject?: number;
    originalBackgroundDepth?: number;
    keepOriginalBackground?: boolean;
    lightSourceDirection?: string;
    lightReference?: string;
    lightSourceStrength?: number;
    outputFormat?: ImageOutputFormat;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(
      formData,
      'subject_image',
      'subjectImage',
      params.subjectImage,
      'subject.png',
      'image/png'
    );
    if (params.backgroundReference) {
      this.appendBase64File(
        formData,
        'background_reference',
        'backgroundReference',
        params.backgroundReference,
        'background-reference.png',
        'image/png'
      );
    }
    if (params.lightReference) {
      this.appendBase64File(
        formData,
        'light_reference',
        'lightReference',
        params.lightReference,
        'light-reference.png',
        'image/png'
      );
    }
    this.appendOptional(formData, 'background_prompt', params.backgroundPrompt);
    this.appendOptional(formData, 'foreground_prompt', params.foregroundPrompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'preserve_original_subject', params.preserveOriginalSubject);
    this.appendOptional(formData, 'original_background_depth', params.originalBackgroundDepth);
    this.appendOptional(
      formData,
      'keep_original_background',
      params.keepOriginalBackground === undefined
        ? undefined
        : String(params.keepOriginalBackground)
    );
    this.appendOptional(formData, 'light_source_direction', params.lightSourceDirection);
    this.appendOptional(formData, 'light_source_strength', params.lightSourceStrength);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);

    let response = await this.postFormJson<GenerationStart>(
      '/v2beta/stable-image/edit/replace-background-and-relight',
      formData,
      'replace background and relight'
    );
    let generationId = this.assertGenerationId(response, 'replace background and relight');

    return await this.pollAsyncMediaResult({
      path: `/v2beta/results/${generationId}`,
      mediaKey: 'image',
      mimeType: this.imageMimeType(params.outputFormat),
      generationId,
      operation: 'replace background and relight'
    });
  }

  async upscaleFast(params: {
    image: string;
    outputFormat?: ImageOutputFormat;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    this.appendOptional(formData, 'output_format', params.outputFormat);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/upscale/fast',
      formData,
      'fast upscale'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async upscaleConservative(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    outputFormat?: ImageOutputFormat;
    seed?: number;
    creativity?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'creativity', params.creativity);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/upscale/conservative',
      formData,
      'conservative upscale'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async upscaleCreative(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    outputFormat?: ImageOutputFormat;
    seed?: number;
    creativity?: number;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'creativity', params.creativity);
    this.appendOptional(formData, 'style_preset', params.stylePreset);

    let response = await this.postFormJson<GenerationStart>(
      '/v2beta/stable-image/upscale/creative',
      formData,
      'creative upscale'
    );
    let generationId = this.assertGenerationId(response, 'creative upscale');

    return await this.pollAsyncMediaResult({
      path: `/v2beta/stable-image/upscale/creative/result/${generationId}`,
      mediaKey: 'image',
      mimeType: this.imageMimeType(params.outputFormat),
      generationId,
      operation: 'creative upscale'
    });
  }

  async controlSketch(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    controlStrength?: number;
    seed?: number;
    outputFormat?: ImageOutputFormat;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'control_strength', params.controlStrength);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'style_preset', params.stylePreset);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/control/sketch',
      formData,
      'control sketch'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async controlStructure(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    controlStrength?: number;
    seed?: number;
    outputFormat?: ImageOutputFormat;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'control_strength', params.controlStrength);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'style_preset', params.stylePreset);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/control/structure',
      formData,
      'control structure'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async controlStyle(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    fidelity?: number;
    seed?: number;
    outputFormat?: ImageOutputFormat;
    stylePreset?: string;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    formData.append('prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'fidelity', params.fidelity);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'style_preset', params.stylePreset);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/control/style',
      formData,
      'control style'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async styleTransfer(params: {
    initImage: string;
    styleImage: string;
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
    styleStrength?: number;
    compositionFidelity?: number;
    changeStrength?: number;
    outputFormat?: ImageOutputFormat;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(
      formData,
      'init_image',
      'image',
      params.initImage,
      'init-image.png',
      'image/png'
    );
    this.appendBase64File(
      formData,
      'style_image',
      'styleImage',
      params.styleImage,
      'style-image.png',
      'image/png'
    );
    this.appendOptional(formData, 'prompt', params.prompt);
    this.appendOptional(formData, 'negative_prompt', params.negativePrompt);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'style_strength', params.styleStrength);
    this.appendOptional(formData, 'composition_fidelity', params.compositionFidelity);
    this.appendOptional(formData, 'change_strength', params.changeStrength);
    this.appendOptional(formData, 'output_format', params.outputFormat);

    let response = await this.postFormJson<StabilityMediaJson>(
      '/v2beta/stable-image/control/style-transfer',
      formData,
      'style transfer'
    );

    return this.mediaResultFromJson(
      response,
      'image',
      this.imageMimeType(params.outputFormat)
    );
  }

  async generateAudio(params: {
    mode: 'text-to-audio' | 'audio-to-audio' | 'inpaint';
    prompt: string;
    model?: 'stable-audio-3' | 'stable-audio-2.5' | 'stable-audio-2';
    duration?: number;
    seed?: number;
    steps?: number;
    cfgScale?: number;
    outputFormat?: AudioOutputFormat;
    audio?: string;
    strength?: number;
    maskStart?: number;
    maskEnd?: number;
  }): Promise<MediaResult> {
    let model = params.model ?? 'stable-audio-3';
    let endpointFamily = model === 'stable-audio-3' ? 'stable-audio' : 'stable-audio-2';
    let formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('model', model);
    this.appendOptional(formData, 'duration', params.duration);
    this.appendOptional(formData, 'seed', params.seed);
    this.appendOptional(formData, 'steps', params.steps);
    this.appendOptional(formData, 'cfg_scale', params.cfgScale);
    this.appendOptional(formData, 'output_format', params.outputFormat);
    this.appendOptional(formData, 'strength', params.strength);
    this.appendOptional(formData, 'mask_start', params.maskStart);
    this.appendOptional(formData, 'mask_end', params.maskEnd);
    if (params.audio) {
      this.appendBase64File(
        formData,
        'audio',
        'audio',
        params.audio,
        'audio.wav',
        'audio/wav'
      );
    }

    let response = await this.postFormJson<GenerationStart>(
      `/v2beta/audio/${endpointFamily}/${params.mode}`,
      formData,
      `generate audio ${params.mode}`,
      202
    );
    let generationId = this.assertGenerationId(response, `generate audio ${params.mode}`);

    return await this.pollAsyncMediaResult({
      path: `/v2beta/audio/results/${generationId}`,
      mediaKey: 'audio',
      mimeType: this.audioMimeType(params.outputFormat),
      generationId,
      operation: `generate audio ${params.mode}`,
      maxAttempts: 60
    });
  }

  async generateFast3D(params: {
    image: string;
    textureResolution?: string;
    foregroundRatio?: number;
    remesh?: string;
    vertexCount?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    this.appendOptional(formData, 'texture_resolution', params.textureResolution);
    this.appendOptional(formData, 'foreground_ratio', params.foregroundRatio);
    this.appendOptional(formData, 'remesh', params.remesh);
    this.appendOptional(formData, 'vertex_count', params.vertexCount);

    return await this.postFormBinary(
      '/v2beta/3d/stable-fast-3d',
      formData,
      'generate stable fast 3d'
    );
  }

  async generateSpar3D(params: {
    image: string;
    textureResolution?: string;
    foregroundRatio?: number;
    remesh?: string;
    targetType?: string;
    targetCount?: number;
    guidanceScale?: number;
    seed?: number;
  }): Promise<MediaResult> {
    let formData = new FormData();
    this.appendBase64File(formData, 'image', 'image', params.image, 'image.png', 'image/png');
    this.appendOptional(formData, 'texture_resolution', params.textureResolution);
    this.appendOptional(formData, 'foreground_ratio', params.foregroundRatio);
    this.appendOptional(formData, 'remesh', params.remesh);
    this.appendOptional(formData, 'target_type', params.targetType);
    this.appendOptional(formData, 'target_count', params.targetCount);
    this.appendOptional(formData, 'guidance_scale', params.guidanceScale);
    this.appendOptional(formData, 'seed', params.seed);

    return await this.postFormBinary(
      '/v2beta/3d/stable-point-aware-3d',
      formData,
      'generate stable point aware 3d'
    );
  }
}
