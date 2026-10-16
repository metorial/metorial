import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getBase64ByteLength,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type ImageResult = Record<string, unknown> & {
  asset_id: string;
  url?: string | null;
  alt_text?: string | null;
  alt_texts?: Record<string, string>;
  lang?: string;
  status?: string;
  keywords?: string[] | null;
  negative_keywords?: string[] | null;
  created_at: string | number;
  updated_at?: string | number;
};

export type AccountInfo = Record<string, unknown> & {
  name: string;
  notification_email?: string | null;
  usage: number;
  usage_limit: number;
  subscription?: {
    plan_name?: string;
    usage_quota?: number;
    status?: string;
    expires_at?: string;
  } | null;
};

export interface CreateImageParams {
  imageUrl?: string;
  imageRaw?: string;
  assetId?: string;
  lang?: string;
  keywords?: string[];
  negativeKeywords?: string[];
  keywordSource?: string;
  ecommerceProduct?: string;
  ecommerceBrand?: string;
  ecommerceDescription?: string;
  ecommerceColor?: string;
  maxCharacters?: number;
  aiWritingStyle?: 'Elaborated' | 'Standard' | 'Matter-of-fact' | 'Concise' | 'Terse';
  chatgptPrompt?: string;
  overwrite?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ImageListParams {
  page?: number;
  perPage?: number;
  imageUrl?: string;
}

let models = {
  Elaborated: 'describe-detailed',
  Standard: 'describe-regular',
  'Matter-of-fact': 'describe-factual',
  Concise: 'succinct-describe-factual',
  Terse: 'describe-terse'
};

export let validateInteger = (
  value: number | undefined,
  field: string,
  min: number,
  max?: number
) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max))
  ) {
    throw createApiServiceError(
      `${field} must be an integer from ${min}${max === undefined ? ' upward' : ` to ${max}`}.`
    );
  }
};

export let validateUrl = (value: string, field: string) => {
  if (!/^https?:\/\//i.test(value) || !URL.canParse(value))
    throw createApiServiceError(`${field} must be a valid HTTP or HTTPS URL.`);
};

export let validateAssetId = (value: string) => {
  if (!value.trim() || value.length > 128 || /[?&#\\/%<>+]/.test(value))
    throw createApiServiceError(
      'Image asset IDs must contain 1–128 characters and cannot contain ? & # \\ / % < > +.'
    );
};

export let validateKeywords = (keywords?: string[], negativeKeywords?: string[]) => {
  if ((keywords?.length ?? 0) > 6 || (negativeKeywords?.length ?? 0) > 6)
    throw createApiServiceError(
      'Provide at most six keywords and six negative keywords, in English.'
    );
};

let errorDetails = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(errorDetails);
  if (isApiErrorRecord(value))
    return Object.entries(value).flatMap(([key, item]) =>
      errorDetails(item).map(detail => `${key}: ${detail}`)
    );
  return [];
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('An AltText.ai API key is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://alttext.ai/api/v1',
      authHeader: { name: 'X-API-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AltText.ai',
          reason: 'alttext_ai_api_error',
          extractResponse: (cause, helpers) => helpers.getResponseWithBody(cause),
          extractMessage: (cause, helpers) => {
            let data = helpers.getResponseWithBody(cause)?.data;
            if (!helpers.isRecord(data)) return undefined;
            let details = [
              typeof data.error === 'string' ? data.error : undefined,
              ...errorDetails(data.errors)
            ].filter(Boolean);
            return details.length ? details.join(' - ') : undefined;
          },
          extractUpstreamCode: (_cause, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.error_code === 'string'
              ? response.data.error_code
              : undefined
        })
    });
  }

  private checkErrors<T>(data: T): T {
    if (isApiErrorRecord(data)) {
      let details = errorDetails(data.errors);
      if (details.length || (typeof data.error === 'string' && data.error))
        throw createApiServiceError(
          `AltText.ai: ${[data.error, ...details].filter(Boolean).join(' - ')}`,
          {
            reason: 'alttext_ai_operation_failed',
            upstreamCode: typeof data.error_code === 'string' ? data.error_code : undefined
          }
        );
    }
    return data;
  }

  async createImage(params: CreateImageParams, signal?: AbortSignal): Promise<ImageResult> {
    if (Boolean(params.imageUrl) === Boolean(params.imageRaw))
      throw createApiServiceError('Provide exactly one imageUrl or imageRaw.');
    if (params.imageUrl) validateUrl(params.imageUrl, 'imageUrl');
    if (params.assetId !== undefined) validateAssetId(params.assetId);
    validateKeywords(params.keywords, params.negativeKeywords);
    validateInteger(params.maxCharacters, 'maxCharacters', 80, 500);
    if (params.imageRaw !== undefined) {
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          params.imageRaw
        ) ||
        !params.imageRaw.length
      )
        throw createApiServiceError(
          'imageRaw must be RFC 4648 base64 without line breaks or a data URL prefix.'
        );
      if (getBase64ByteLength(params.imageRaw) >= 16 * 1024 * 1024)
        throw createApiServiceError('The decoded image must be smaller than 16 MB.');
    }
    let keywordSource =
      params.keywordSource !== undefined &&
      params.ecommerceDescription !== undefined &&
      params.keywordSource !== params.ecommerceDescription
        ? `${params.keywordSource}\n${params.ecommerceDescription}`
        : (params.keywordSource ?? params.ecommerceDescription);
    if (
      keywordSource !== undefined &&
      (keywordSource.length < 12 || keywordSource.length > 1024)
    )
      throw createApiServiceError('Keyword source context must contain 12–1024 characters.');
    if (
      params.chatgptPrompt !== undefined &&
      (!params.chatgptPrompt.includes('{{AltText}}') || params.chatgptPrompt.length > 768)
    )
      throw createApiServiceError(
        'chatgptPrompt must include {{AltText}} and contain at most 768 characters.'
      );
    if (
      (params.ecommerceBrand !== undefined || params.ecommerceColor !== undefined) &&
      !params.ecommerceProduct?.trim()
    )
      throw createApiServiceError(
        'ecommerceProduct is required when using an e-commerce brand or color.'
      );
    let response = await this.axios.post<ImageResult>(
      '/images',
      pickDefined({
        image: pickDefined({
          url: params.imageUrl,
          raw: params.imageRaw,
          asset_id: params.assetId,
          tags: params.tags,
          metadata: params.metadata
        }),
        lang: params.lang,
        keywords: params.keywords,
        negative_keywords: params.negativeKeywords,
        keyword_source: keywordSource,
        ecomm:
          params.ecommerceProduct !== undefined
            ? pickDefined({
                product: params.ecommerceProduct,
                brand: params.ecommerceBrand,
                color: params.ecommerceColor
              })
            : undefined,
        max_chars: params.maxCharacters,
        model_name:
          params.aiWritingStyle === undefined ? undefined : models[params.aiWritingStyle],
        gpt_prompt: params.chatgptPrompt,
        overwrite: params.overwrite
      }),
      { signal }
    );
    return this.checkErrors(response.data);
  }

  async getImage(assetId: string, signal?: AbortSignal): Promise<ImageResult> {
    if (!assetId.trim()) throw createApiServiceError('imageAssetId cannot be blank.');
    return this.checkErrors(
      (await this.axios.get<ImageResult>(`/images/${encodeURIComponent(assetId)}`, { signal }))
        .data
    );
  }

  private async listImages(path: string, params: ImageListParams, query?: string) {
    validateInteger(params.page, 'page', 1);
    validateInteger(params.perPage, 'perPage', 1, 100);
    if (query !== undefined && (!query.trim() || query.length > 256))
      throw createApiServiceError('Search queries must contain 1–256 characters.');
    let response = await this.axios.get<{ images: ImageResult[] }>(path, {
      params: pickDefined({
        page: params.page,
        limit: params.perPage,
        url: params.imageUrl,
        q: query
      })
    });
    this.checkErrors(response.data);
    if (!Array.isArray(response.data?.images))
      throw createApiServiceError('AltText.ai returned an invalid image list.');
    let readHeader = (name: string) => {
      let value = getResponseHeaderValue(response.headers, name);
      if (value === undefined || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
        throw createApiServiceError(
          `AltText.ai did not return a valid ${name} pagination header.`
        );
      return Number(value);
    };
    return {
      images: response.data.images,
      page: readHeader('current-page'),
      per_page: readHeader('page-items'),
      total: readHeader('total-count'),
      total_pages: readHeader('total-pages'),
      raw: response.data
    };
  }

  getImages(params: ImageListParams = {}) {
    return this.listImages('/images', params);
  }
  searchImages(params: ImageListParams & { query: string }) {
    return this.listImages('/images/search', params, params.query);
  }

  async getAccount(): Promise<AccountInfo> {
    let account = this.checkErrors((await this.axios.get<AccountInfo>('/account')).data);
    if (
      !account ||
      typeof account.name !== 'string' ||
      typeof account.usage !== 'number' ||
      typeof account.usage_limit !== 'number'
    )
      throw createApiServiceError(
        'AltText.ai returned invalid account name or credit usage data.'
      );
    return account;
  }

  async updateImage(
    assetId: string,
    input: {
      newAssetId?: string;
      altText?: string;
      metadata?: Record<string, unknown>;
      lang?: string;
      overwrite?: boolean;
    }
  ) {
    if (!assetId.trim()) throw createApiServiceError('imageAssetId cannot be blank.');
    if (input.newAssetId !== undefined) validateAssetId(input.newAssetId);
    if (input.altText !== undefined && input.altText.length > 1024)
      throw createApiServiceError('altText must contain at most 1024 characters.');
    if (
      input.newAssetId === undefined &&
      input.altText === undefined &&
      input.metadata === undefined
    )
      throw createApiServiceError('Provide newAssetId, altText, or metadata to update.');
    return this.checkErrors(
      (
        await this.axios.put<ImageResult>(
          `/images/${encodeURIComponent(assetId)}`,
          {
            image: pickDefined({
              asset_id: input.newAssetId,
              alt_text: input.altText,
              metadata: input.metadata
            })
          },
          { params: pickDefined({ lang: input.lang, overwrite: input.overwrite }) }
        )
      ).data
    );
  }

  async deleteImage(assetId: string) {
    if (!assetId.trim()) throw createApiServiceError('imageAssetId cannot be blank.');
    return this.checkErrors(
      (await this.axios.delete<ImageResult>(`/images/${encodeURIComponent(assetId)}`)).data
    );
  }

  async scrapePage(input: {
    pageUrl?: string;
    html?: string;
    lang?: string;
    keywords?: string[];
    negativeKeywords?: string[];
    includeExisting?: boolean;
  }) {
    if (!input.pageUrl && !input.html?.trim())
      throw createApiServiceError('Provide pageUrl or raw html to process.');
    if (input.pageUrl) validateUrl(input.pageUrl, 'pageUrl');
    validateKeywords(input.keywords, input.negativeKeywords);
    return this.checkErrors(
      (
        await this.axios.post<Record<string, unknown>>(
          '/images/page_scrape',
          pickDefined({
            page_scrape: pickDefined({ url: input.pageUrl, html: input.html }),
            lang: input.lang,
            keywords: input.keywords,
            negative_keywords: input.negativeKeywords,
            include_existing: input.includeExisting
          })
        )
      ).data
    );
  }

  async bulkCreate(csv: string, email?: string) {
    if (!csv.trim())
      throw createApiServiceError(
        'csvContent cannot be blank. Supply a CSV using the provider template.'
      );
    let form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'images.csv');
    if (email !== undefined) form.append('email', email);
    return this.checkErrors(
      (
        await this.axios.post<Record<string, unknown>>('/images/bulk_create', form, {
          headers: { 'Content-Type': undefined }
        })
      ).data
    );
  }
}
