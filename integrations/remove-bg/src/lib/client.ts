import { createAxios } from 'slates';

export interface RemoveBackgroundParams {
  imageUrl?: string;
  imageFileB64?: string;
  size?: string;
  type?: string;
  typeLevel?: string;
  format?: string;
  channels?: string;
  crop?: boolean;
  cropMargin?: string;
  scale?: string;
  position?: string;
  roi?: string;
  bgColor?: string;
  bgImageUrl?: string;
  bgImageFileB64?: string;
  shadowType?: string;
  shadowOpacity?: number;
  semitransparency?: boolean;
}

export interface RemoveBackgroundResult {
  resultImageB64: string;
  resultImageUrl?: string;
  creditsCharged: number;
  detectedType: string;
  imageWidth: number;
  imageHeight: number;
  foregroundTop: number;
  foregroundLeft: number;
  foregroundWidth: number;
  foregroundHeight: number;
}

export interface AccountInfo {
  creditsTotal: number;
  creditsSubscription: number;
  creditsPayg: number;
  creditsEnterprise: number;
  freeApiCalls: number;
  apiSizes: string;
}

export interface ImproveFeedbackParams {
  imageUrl?: string;
  imageFileB64?: string;
  imageFilename?: string;
  tag?: string;
}

export interface ImproveFeedbackResult {
  submissionId: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.remove.bg/v1.0',
      headers: {
        'X-Api-Key': config.token
      }
    });
  }

  async removeBackground(params: RemoveBackgroundParams): Promise<RemoveBackgroundResult> {
    let formData: Record<string, string | boolean | number> = {};

    if (params.imageUrl) formData.image_url = params.imageUrl;
    if (params.imageFileB64) formData.image_file_b64 = params.imageFileB64;
    if (params.size) formData.size = params.size;
    if (params.type) formData.type = params.type;
    if (params.typeLevel) formData.type_level = params.typeLevel;
    if (params.format) formData.format = params.format;
    if (params.channels) formData.channels = params.channels;
    if (params.crop !== undefined) formData.crop = params.crop;
    if (params.cropMargin) formData.crop_margin = params.cropMargin;
    if (params.scale) formData.scale = params.scale;
    if (params.position) formData.position = params.position;
    if (params.roi) formData.roi = params.roi;
    if (params.bgColor) formData.bg_color = params.bgColor;
    if (params.bgImageUrl) formData.bg_image_url = params.bgImageUrl;
    if (params.bgImageFileB64) formData.bg_image_file_b64 = params.bgImageFileB64;
    if (params.shadowType) formData.shadow_type = params.shadowType;
    if (params.shadowOpacity !== undefined) formData.shadow_opacity = params.shadowOpacity;
    if (params.semitransparency !== undefined)
      formData.semitransparency = params.semitransparency;

    let response = await this.axios.post('/removebg', formData, {
      headers: {
        Accept: 'application/json'
      }
    });

    let data = response.data?.data ?? response.data;
    let headers = response.headers;

    return {
      resultImageB64: data.result_b64,
      resultImageUrl: data.result_url,
      creditsCharged: Number.parseFloat(headers['x-credits-charged'] ?? '0'),
      detectedType: headers['x-type'] ?? 'unknown',
      imageWidth: Number.parseInt(headers['x-width'] ?? '0', 10),
      imageHeight: Number.parseInt(headers['x-height'] ?? '0', 10),
      foregroundTop: Number.parseInt(headers['x-foreground-top'] ?? '0', 10),
      foregroundLeft: Number.parseInt(headers['x-foreground-left'] ?? '0', 10),
      foregroundWidth: Number.parseInt(headers['x-foreground-width'] ?? '0', 10),
      foregroundHeight: Number.parseInt(headers['x-foreground-height'] ?? '0', 10)
    };
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.axios.get('/account');
    let attrs = response.data?.data?.attributes ?? {};
    let credits = attrs.credits ?? {};
    let api = attrs.api ?? {};

    return {
      creditsTotal: credits.total ?? 0,
      creditsSubscription: credits.subscription ?? 0,
      creditsPayg: credits.payg ?? 0,
      creditsEnterprise: credits.enterprise ?? 0,
      freeApiCalls: api.free_calls ?? 0,
      apiSizes: api.sizes ?? ''
    };
  }

  async submitFeedback(params: ImproveFeedbackParams): Promise<ImproveFeedbackResult> {
    let formData: Record<string, string> = {};

    if (params.imageUrl) formData.image_url = params.imageUrl;
    if (params.imageFileB64) formData.image_file_b64 = params.imageFileB64;
    if (params.imageFilename) formData.image_filename = params.imageFilename;
    if (params.tag) formData.tag = params.tag;

    let response = await this.axios.post('/improve', formData);

    return {
      submissionId: response.data?.id ?? response.data?.data?.id ?? ''
    };
  }
}
