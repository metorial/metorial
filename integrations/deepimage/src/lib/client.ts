import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

let BASE_URL = 'https://deep-image.ai/rest_api';

export interface ProcessImageParams {
  url?: string;
  width?: number | string;
  height?: number | string;
  minLength?: number;
  outputFormat?: string;
  outputQuality?: number;
  maxFileSize?: number;
  enhancements?: string[];
  denoiseParameters?: { type?: string };
  deblurParameters?: { type?: string };
  lightParameters?: { type?: string; level?: number };
  colorParameters?: { type?: string; level?: number };
  whiteBalanceParameters?: { level?: number };
  faceEnhanceParameters?: { type?: string; level?: number; smoothingLevel?: number };
  background?: {
    remove?: string;
    color?: string;
    replace?: string;
    generate?: {
      description?: string;
      modelType?: string;
      sampleNum?: number;
      adapterType?: string;
      faceId?: boolean;
      controlnetConditioningScale?: number;
      ipImage2?: string;
      strength?: number;
      avatarGenerationType?: string;
      itemAreaPercentage?: number;
      backgroundUrl?: string;
      color?: number[];
      contextImages?: string[];
    };
  };
  fit?: string | { canvas?: string; crop?: string };
  padding?: string | number;
  generativeUpscale?: boolean;
  upscaleParameters?: { type?: string };
  caption?: {
    url: string;
    position?: string;
    targetWidthPercentage?: number;
    padding?: number;
    opacity?: number;
  };
  webhooks?: {
    complete?: string;
  };
  preset?: string;
}

export interface ProcessResult {
  status: string;
  jobId: string;
  resultUrl?: string;
}

export interface AccountInfo {
  username: string;
  email: string;
  credits: number;
  language: string;
  webhooks: Record<string, string>;
  billingAddress: Record<string, string>;
}

let processResponseSchema = z.object({
  status: z.string().optional(),
  job: z.string().optional(),
  result_url: z.string().optional()
});

let accountResponseSchema = z.object({
  username: z.string(),
  email: z.string(),
  credits: z.number(),
  language: z.string(),
  webhooks: z.record(z.string(), z.string()).optional(),
  address: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  billing_address: z.record(z.string(), z.string()).optional()
});

let validateProcessParams = (params: ProcessImageParams) => {
  for (let [name, value] of [
    ['width', params.width],
    ['height', params.height],
    ['minLength', params.minLength]
  ] as const) {
    if (value === undefined) continue;
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value <= 0) {
        throw createApiServiceError(`${name} must be a positive whole number of pixels.`);
      }
    }
  }

  if (
    params.outputQuality !== undefined &&
    (!Number.isInteger(params.outputQuality) ||
      params.outputQuality < 1 ||
      params.outputQuality > 100)
  ) {
    throw createApiServiceError('outputQuality must be a whole number from 1 to 100.');
  }

  let color = params.background?.generate?.color;
  if (
    color !== undefined &&
    (color.length !== 3 ||
      color.some(value => !Number.isInteger(value) || value < 0 || value > 255))
  ) {
    throw createApiServiceError(
      'generateBackgroundColor must contain three RGB values from 0 to 255.'
    );
  }
};

let mapProcessResult = (
  response: unknown,
  defaults: { status?: string; jobId?: string } = {}
): ProcessResult => {
  let parsed = processResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw createApiServiceError('Deep Image returned an invalid processing response.');
  }
  let status = parsed.data.status ?? (parsed.data.result_url ? 'complete' : defaults.status);
  let jobId = parsed.data.job ?? defaults.jobId;
  if (!status || !jobId) {
    throw createApiServiceError(
      'Deep Image did not return the processing status and job identifier.'
    );
  }
  if (status === 'complete' && !parsed.data.result_url) {
    throw createApiServiceError(
      'Deep Image completed the job without returning a result URL.'
    );
  }
  return { status, jobId, resultUrl: parsed.data.result_url };
};

let toSnakeCase = (params: ProcessImageParams): Record<string, unknown> => {
  let body: Record<string, unknown> = {};

  if (params.url !== undefined) body.url = params.url;
  if (params.width !== undefined) body.width = params.width;
  if (params.height !== undefined) body.height = params.height;
  if (params.minLength !== undefined) body.min_length = params.minLength;
  if (params.outputFormat !== undefined)
    body.output_format = params.outputFormat === 'jpg' ? 'jpeg' : params.outputFormat;
  if (params.outputQuality !== undefined) body.quality = params.outputQuality;
  if (params.maxFileSize !== undefined) body.max_file_size = params.maxFileSize;
  if (params.enhancements !== undefined) body.enhancements = params.enhancements;
  if (params.generativeUpscale !== undefined)
    body.generative_upscale = params.generativeUpscale;
  if (params.preset !== undefined) body.preset = params.preset;

  if (params.denoiseParameters) {
    body.denoise_parameters = { type: params.denoiseParameters.type };
  }
  if (params.deblurParameters) {
    body.deblur_parameters = { type: params.deblurParameters.type };
  }
  if (params.lightParameters) {
    body.light_parameters = {
      type: params.lightParameters.type,
      level: params.lightParameters.level
    };
  }
  if (params.colorParameters) {
    body.color_parameters = {
      type: params.colorParameters.type,
      level: params.colorParameters.level
    };
  }
  if (params.whiteBalanceParameters) {
    body.white_balance_parameters = {
      level: params.whiteBalanceParameters.level
    };
  }
  if (params.faceEnhanceParameters) {
    body.face_enhance_parameters = {
      type: params.faceEnhanceParameters.type,
      level: params.faceEnhanceParameters.level,
      smoothing_level: params.faceEnhanceParameters.smoothingLevel
    };
  }

  if (params.upscaleParameters) {
    body.upscale_parameters = { type: params.upscaleParameters.type };
  }

  if (params.fit) {
    if (typeof params.fit === 'string') {
      body.fit = params.fit;
    } else {
      let fitObj: Record<string, string> = {};
      if (params.fit.canvas) fitObj.canvas = params.fit.canvas;
      if (params.fit.crop) fitObj.crop = params.fit.crop;
      body.fit = fitObj;
    }
  }

  if (params.padding !== undefined) body.padding = params.padding;

  if (params.background) {
    let bg: Record<string, unknown> = {};
    if (params.background.remove) bg.remove = params.background.remove;
    if (params.background.color) bg.color = params.background.color;
    if (params.background.replace) bg.replace = params.background.replace;
    if (params.background.generate) {
      let gen: Record<string, unknown> = {};
      let g = params.background.generate;
      if (g.description !== undefined) gen.description = g.description;
      if (g.modelType !== undefined) gen.model_type = g.modelType;
      if (g.sampleNum !== undefined) gen.sample_num = g.sampleNum;
      if (g.adapterType !== undefined) gen.adapter_type = g.adapterType;
      if (g.faceId !== undefined) gen.face_id = g.faceId;
      if (g.controlnetConditioningScale !== undefined)
        gen.controlnet_conditioning_scale = g.controlnetConditioningScale;
      if (g.ipImage2 !== undefined) gen.ip_image2 = g.ipImage2;
      if (g.strength !== undefined) gen.strength = g.strength;
      if (g.avatarGenerationType !== undefined)
        gen.avatar_generation_type = g.avatarGenerationType;
      if (g.itemAreaPercentage !== undefined) gen.item_area_percentage = g.itemAreaPercentage;
      if (g.backgroundUrl !== undefined) gen.background_url = g.backgroundUrl;
      if (g.color !== undefined) gen.color = g.color;
      if (g.contextImages !== undefined) gen.context_images = g.contextImages;
      bg.generate = gen;
    }
    body.background = bg;
  }

  if (params.caption) {
    let cap: Record<string, unknown> = { url: params.caption.url };
    if (params.caption.position) cap.position = params.caption.position;
    if (params.caption.targetWidthPercentage !== undefined)
      cap.target_width_percentage = params.caption.targetWidthPercentage;
    if (params.caption.padding !== undefined) cap.padding = params.caption.padding;
    if (params.caption.opacity !== undefined) cap.opacity = params.caption.opacity;
    body.caption = cap;
  }

  if (params.webhooks) {
    body.webhooks = params.webhooks;
  }

  return body;
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Deep Image API key is required. Reconnect with an API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'X-API-KEY', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Deep Image',
          reason: 'deep_image_api_error'
        })
    });
  }

  async processImageSync(params: ProcessImageParams): Promise<ProcessResult> {
    validateProcessParams(params);
    let body = toSnakeCase(params);
    let response = await this.axios.post('/process_result', body);
    return mapProcessResult(response.data, { status: 'received' });
  }

  async processImageAsync(params: ProcessImageParams): Promise<ProcessResult> {
    validateProcessParams(params);
    let body = toSnakeCase(params);
    let response = await this.axios.post('/process', body);
    return mapProcessResult(response.data, { status: 'received' });
  }

  async getResult(jobHash: string): Promise<ProcessResult> {
    if (!jobHash.trim()) throw createApiServiceError('jobId must not be empty.');
    let response = await this.axios.get(`/result/${encodeURIComponent(jobHash)}`);
    let result = mapProcessResult(response.data, { jobId: jobHash });
    return { ...result, jobId: jobHash };
  }

  async deleteResult(jobHash: string): Promise<void> {
    if (!jobHash.trim()) throw createApiServiceError('jobId must not be empty.');
    await this.axios.delete(`/result/${encodeURIComponent(jobHash)}`);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    let response = await this.axios.get('/me');
    let parsed = accountResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError('Deep Image returned an invalid account response.');
    }
    let account = parsed.data;
    return {
      username: account.username,
      email: account.email,
      credits: account.credits,
      language: account.language,
      webhooks: account.webhooks ?? {},
      billingAddress: account.address
        ? Object.fromEntries(
            Object.entries(account.address)
              .filter(([, value]) => value !== null)
              .map(([key, value]) => [key, String(value)])
          )
        : (account.billing_address ?? {})
    };
  }
}
