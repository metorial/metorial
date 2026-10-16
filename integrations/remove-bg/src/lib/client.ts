import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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
  detectedType?: string;
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

let requireNumber = (value: unknown, field: string): number => {
  let number = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) {
    throw createApiServiceError(`Remove.bg returned a missing or invalid ${field}.`);
  }
  return number;
};

let validateImageSource = (params: { imageUrl?: string; imageFileB64?: string }) => {
  if (Boolean(params.imageUrl) === Boolean(params.imageFileB64)) {
    throw createApiServiceError('Provide exactly one image source: imageUrl or imageFileB64.');
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Remove.bg API key is required. Reconnect with your API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.remove.bg/v1.0',
      authHeader: { name: 'X-Api-Key', value: config.token },
      contentType: false,
      timeout: 120000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Remove.bg',
          reason: 'removebg_api_error',
          detailKeys: ['title', 'detail', 'code', 'message'],
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          extractUpstreamCode: (_error, response, helpers) => {
            if (!helpers.isRecord(response?.data) || !Array.isArray(response.data.errors)) {
              return undefined;
            }
            let first = response.data.errors[0];
            return helpers.isRecord(first) && typeof first.code === 'string'
              ? first.code
              : undefined;
          }
        })
    });
  }

  async removeBackground(params: RemoveBackgroundParams): Promise<RemoveBackgroundResult> {
    validateImageSource(params);
    if (
      [params.bgColor, params.bgImageUrl, params.bgImageFileB64].filter(Boolean).length > 1
    ) {
      throw createApiServiceError(
        'Provide only one background source: bgColor, bgImageUrl, or bgImageFileB64.'
      );
    }
    if (
      params.shadowOpacity !== undefined &&
      (!Number.isFinite(params.shadowOpacity) ||
        params.shadowOpacity < 0 ||
        params.shadowOpacity > 100)
    ) {
      throw createApiServiceError('shadowOpacity must be a number between 0 and 100.');
    }

    let fields = pickDefined({
      image_url: params.imageUrl,
      image_file_b64: params.imageFileB64,
      size: params.size,
      type: params.type,
      type_level: params.typeLevel,
      format: params.format,
      channels: params.channels,
      crop: params.crop,
      crop_margin: params.cropMargin,
      scale: params.scale,
      position: params.position,
      roi: params.roi,
      bg_color: params.bgColor,
      bg_image_url: params.bgImageUrl,
      shadow_type: params.shadowType,
      shadow_opacity: params.shadowOpacity,
      semitransparency: params.semitransparency
    });

    let body: typeof fields | FormData = fields;
    if (params.bgImageFileB64) {
      let background = Buffer.from(params.bgImageFileB64, 'base64');
      if (!background.byteLength) {
        throw createApiServiceError('bgImageFileB64 must contain base64-encoded image data.');
      }
      let form = new FormData();
      for (let [key, value] of Object.entries(fields)) {
        form.append(key, String(value));
      }
      form.append('bg_image_file', new Blob([new Uint8Array(background)]), 'background');
      body = form;
    }

    let response = await this.axios.post<unknown>('/removebg', body, {
      headers: { Accept: 'application/json' }
    });
    let envelope = response.data;
    let data =
      isApiErrorRecord(envelope) && isApiErrorRecord(envelope.data) ? envelope.data : envelope;
    if (!isApiErrorRecord(data) || typeof data.result_b64 !== 'string' || !data.result_b64) {
      throw createApiServiceError('Remove.bg returned no processed image.');
    }
    let header = (name: string) => getResponseHeaderValue(response.headers, name);
    let detectedType = header('x-type');
    if (!detectedType && params.typeLevel !== 'none') {
      throw createApiServiceError('Remove.bg returned no detected foreground type.');
    }

    return {
      resultImageB64: data.result_b64,
      resultImageUrl: typeof data.result_url === 'string' ? data.result_url : undefined,
      creditsCharged: requireNumber(header('x-credits-charged'), 'charged credits'),
      detectedType,
      imageWidth: requireNumber(header('x-width'), 'result width'),
      imageHeight: requireNumber(header('x-height'), 'result height'),
      foregroundTop: requireNumber(
        data.foreground_top ?? header('x-foreground-top'),
        'foreground top'
      ),
      foregroundLeft: requireNumber(
        data.foreground_left ?? header('x-foreground-left'),
        'foreground left'
      ),
      foregroundWidth: requireNumber(
        data.foreground_width ?? header('x-foreground-width'),
        'foreground width'
      ),
      foregroundHeight: requireNumber(
        data.foreground_height ?? header('x-foreground-height'),
        'foreground height'
      )
    };
  }

  async getAccount(): Promise<AccountInfo> {
    let response = await this.axios.get<unknown>('/account');
    let data = isApiErrorRecord(response.data) ? response.data.data : undefined;
    let attrs = isApiErrorRecord(data) ? data.attributes : undefined;
    let credits = isApiErrorRecord(attrs) ? attrs.credits : undefined;
    let api = isApiErrorRecord(attrs) ? attrs.api : undefined;
    if (
      !isApiErrorRecord(credits) ||
      !isApiErrorRecord(api) ||
      typeof api.sizes !== 'string'
    ) {
      throw createApiServiceError('Remove.bg returned incomplete account information.');
    }

    return {
      creditsTotal: requireNumber(credits.total, 'total credits'),
      creditsSubscription: requireNumber(credits.subscription, 'subscription credits'),
      creditsPayg: requireNumber(credits.payg, 'pay-as-you-go credits'),
      creditsEnterprise: requireNumber(credits.enterprise, 'enterprise credits'),
      freeApiCalls: requireNumber(api.free_calls, 'free API calls'),
      apiSizes: api.sizes
    };
  }

  async submitFeedback(params: ImproveFeedbackParams): Promise<ImproveFeedbackResult> {
    validateImageSource(params);
    let response = await this.axios.post<unknown>(
      '/improve',
      pickDefined({
        image_url: params.imageUrl,
        image_file_b64: params.imageFileB64,
        image_filename: params.imageFilename,
        tag: params.tag
      })
    );
    let data = response.data;
    let id = isApiErrorRecord(data)
      ? (data.id ?? (isApiErrorRecord(data.data) ? data.data.id : undefined))
      : undefined;
    if (typeof id !== 'string' || !id) {
      throw createApiServiceError('Remove.bg returned no feedback submission ID.');
    }
    return { submissionId: id };
  }
}
