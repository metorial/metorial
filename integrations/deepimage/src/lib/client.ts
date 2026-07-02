import { createAxios } from 'slates';

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
  apiKey: string;
  language: string;
  webhooks: Record<string, string>;
  billingAddress: Record<string, string>;
}

let toSnakeCase = (params: ProcessImageParams): Record<string, unknown> => {
  let body: Record<string, unknown> = {};

  if (params.url !== undefined) body.url = params.url;
  if (params.width !== undefined) body.width = params.width;
  if (params.height !== undefined) body.height = params.height;
  if (params.minLength !== undefined) body.min_length = params.minLength;
  if (params.outputFormat !== undefined) body.output_format = params.outputFormat;
  if (params.outputQuality !== undefined) body.output_quality = params.outputQuality;
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
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async processImageSync(params: ProcessImageParams): Promise<ProcessResult> {
    let axios = this.createAxiosInstance();
    let body = toSnakeCase(params);
    let response = await axios.post('/process_result', body);
    return {
      status: response.data.status,
      jobId: response.data.job,
      resultUrl: response.data.result_url
    };
  }

  async processImageAsync(params: ProcessImageParams): Promise<ProcessResult> {
    let axios = this.createAxiosInstance();
    let body = toSnakeCase(params);
    let response = await axios.post('/process', body);
    return {
      status: response.data.status,
      jobId: response.data.job,
      resultUrl: response.data.result_url
    };
  }

  async getResult(jobHash: string): Promise<ProcessResult> {
    let axios = this.createAxiosInstance();
    let response = await axios.get(`/result/${jobHash}`);
    return {
      status: response.data.status,
      jobId: jobHash,
      resultUrl: response.data.result_url
    };
  }

  async deleteResult(jobHash: string): Promise<void> {
    let axios = this.createAxiosInstance();
    await axios.delete(`/result/${jobHash}`);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    let axios = this.createAxiosInstance();
    let response = await axios.get('/me');
    return {
      username: response.data.username,
      email: response.data.email,
      credits: response.data.credits,
      apiKey: response.data.api_key,
      language: response.data.language,
      webhooks: response.data.webhooks || {},
      billingAddress: response.data.billing_address || {}
    };
  }
}
