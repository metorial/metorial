import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';
import { type GifObject, gifSchema, type PaginationInfo } from './types';

let api = createAxios({ baseURL: 'https://api.giphy.com' });

let uploadApi = createAxios({
  baseURL: 'https://upload.giphy.com'
});

let normalizeGif = (raw: any): GifObject => {
  if (!isApiErrorRecord(raw) || typeof raw.id !== 'string' || !raw.id) {
    throw createApiServiceError(
      'GIPHY did not return a GIF ID. The item may be unavailable or restricted.'
    );
  }
  let user = isApiErrorRecord(raw.user) ? raw.user : undefined;
  let result = gifSchema.safeParse({
    gifId: raw.id,
    type: raw.type,
    slug: raw.slug,
    url: raw.url,
    bitlyUrl: raw.bitly_url,
    embedUrl: raw.embed_url,
    username: raw.username,
    source: raw.source,
    title: raw.title,
    rating: raw.rating,
    importDatetime: raw.import_datetime,
    trendingDatetime: raw.trending_datetime,
    images: raw.images,
    altText: raw.alt_text,
    variationCount: raw.variation_count,
    analytics: raw.analytics,
    raw,
    user: user
      ? {
          avatarUrl: user.avatar_url,
          bannerImage: user.banner_image,
          bannerUrl: user.banner_url,
          profileUrl: user.profile_url,
          username: user.username,
          displayName: user.display_name,
          description: user.description,
          isVerified: user.is_verified
        }
      : undefined
  });
  if (!result.success) {
    throw createApiServiceError('GIPHY returned invalid GIF metadata.');
  }
  return result.data;
};

let normalizePagination = (raw: any): PaginationInfo => {
  return {
    totalCount: raw?.total_count,
    count: raw?.count,
    offset: raw?.offset
  };
};

type RequestContext = { customerId?: string; countryCode?: string; region?: string };
type RawResponse = Record<string, any>;
type ResponseMetadata = { raw: RawResponse };

export class Client {
  private token: string;
  private context: RequestContext;

  constructor(config: { token: string } & RequestContext) {
    this.token = config.token;
    this.context = config;
  }

  private async request(
    client: typeof api,
    path: string,
    options: {
      params?: Record<string, unknown>;
      data?: Record<string, unknown>;
      method?: 'GET' | 'POST';
    } = {}
  ): Promise<{ data: RawResponse }> {
    try {
      let response = await client.request<RawResponse>({ url: path, ...options });
      if (typeof response.data.meta?.status === 'number' && response.data.meta.status >= 400) {
        throw buildApiServiceError(
          { response: { status: response.data.meta.status, data: response.data } },
          {
            providerLabel: 'GIPHY',
            reason: 'giphy_api_error',
            detailKeys: ['msg', 'message', 'error_code'],
            nestedKeys: ['meta', 'errors']
          }
        );
      }
      return response;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GIPHY',
        reason: 'giphy_api_error',
        extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
        detailKeys: ['msg', 'message', 'error_code'],
        nestedKeys: ['meta', 'errors']
      });
    }
  }

  private params(extra: Record<string, any> = {}): Record<string, any> {
    let params: Record<string, any> = { api_key: this.token };
    extra = {
      customer_id: this.context.customerId,
      country_code: this.context.countryCode,
      region: this.context.region,
      ...extra
    };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) {
        params[key] = value;
      }
    }
    return params;
  }

  private items(value: unknown): Record<string, any>[] {
    if (!value) return [];
    if (!Array.isArray(value) || value.some(item => !isApiErrorRecord(item))) {
      throw createApiServiceError('GIPHY returned invalid result metadata.');
    }
    return value;
  }

  async searchGifs(options: {
    query: string;
    limit?: number;
    offset?: number;
    rating?: string;
    lang?: string;
    bundle?: string;
    removeLowContrast?: boolean;
    channelIds?: number[];
  }): Promise<ResponseMetadata & { gifs: GifObject[]; pagination: PaginationInfo }> {
    let response = await this.request(api, '/v1/gifs/search', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        lang: options.lang,
        bundle: options.bundle,
        remove_low_contrast: options.removeLowContrast,
        channel_ids: options.channelIds?.join(',')
      })
    });
    return {
      raw: response.data,
      gifs: this.items(response.data.data).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async searchStickers(options: {
    query: string;
    limit?: number;
    offset?: number;
    rating?: string;
    lang?: string;
    bundle?: string;
    removeLowContrast?: boolean;
    channelIds?: number[];
  }): Promise<ResponseMetadata & { stickers: GifObject[]; pagination: PaginationInfo }> {
    let response = await this.request(api, '/v1/stickers/search', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        lang: options.lang,
        bundle: options.bundle,
        remove_low_contrast: options.removeLowContrast,
        channel_ids: options.channelIds?.join(',')
      })
    });
    return {
      raw: response.data,
      stickers: this.items(response.data.data).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async trendingGifs(options: {
    limit?: number;
    offset?: number;
    rating?: string;
    bundle?: string;
    removeLowContrast?: boolean;
  }): Promise<ResponseMetadata & { gifs: GifObject[]; pagination: PaginationInfo }> {
    let response = await this.request(api, '/v1/gifs/trending', {
      params: this.params({
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        bundle: options.bundle,
        remove_low_contrast: options.removeLowContrast
      })
    });
    return {
      raw: response.data,
      gifs: this.items(response.data.data).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async trendingStickers(options: {
    limit?: number;
    offset?: number;
    rating?: string;
    bundle?: string;
    removeLowContrast?: boolean;
  }): Promise<ResponseMetadata & { stickers: GifObject[]; pagination: PaginationInfo }> {
    let response = await this.request(api, '/v1/stickers/trending', {
      params: this.params({
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        bundle: options.bundle,
        remove_low_contrast: options.removeLowContrast
      })
    });
    return {
      raw: response.data,
      stickers: this.items(response.data.data).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async translateGif(options: {
    searchTerm: string;
    rating?: string;
  }): Promise<ResponseMetadata & { gif: GifObject }> {
    let response = await this.request(api, '/v1/gifs/translate', {
      params: this.params({
        s: options.searchTerm,
        rating: options.rating
      })
    });
    return {
      raw: response.data,
      gif: normalizeGif(response.data.data)
    };
  }

  async translateSticker(options: {
    searchTerm: string;
    rating?: string;
  }): Promise<ResponseMetadata & { sticker: GifObject }> {
    let response = await this.request(api, '/v1/stickers/translate', {
      params: this.params({
        s: options.searchTerm,
        rating: options.rating
      })
    });
    return {
      raw: response.data,
      sticker: normalizeGif(response.data.data)
    };
  }

  async randomGif(options: {
    tag?: string;
    rating?: string;
  }): Promise<ResponseMetadata & { gif: GifObject }> {
    let response = await this.request(api, '/v1/gifs/random', {
      params: this.params({
        tag: options.tag,
        rating: options.rating
      })
    });
    return {
      raw: response.data,
      gif: normalizeGif(response.data.data)
    };
  }

  async randomSticker(options: {
    tag?: string;
    rating?: string;
  }): Promise<ResponseMetadata & { sticker: GifObject }> {
    let response = await this.request(api, '/v1/stickers/random', {
      params: this.params({
        tag: options.tag,
        rating: options.rating
      })
    });
    return {
      raw: response.data,
      sticker: normalizeGif(response.data.data)
    };
  }

  async getGifById(gifId: string): Promise<ResponseMetadata & { gif: GifObject }> {
    let response = await this.request(api, `/v1/gifs/${encodeURIComponent(gifId)}`, {
      params: this.params()
    });
    return {
      raw: response.data,
      gif: normalizeGif(response.data.data)
    };
  }

  async getGifsByIds(
    gifIds: string[]
  ): Promise<ResponseMetadata & { gifs: GifObject[]; pagination: PaginationInfo }> {
    let response = await this.request(api, '/v1/gifs', {
      params: this.params({
        ids: gifIds.join(',')
      })
    });
    return {
      raw: response.data,
      gifs: this.items(response.data.data).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async getEmoji(options: {
    limit?: number;
    offset?: number;
  }): Promise<ResponseMetadata & { emojis: GifObject[]; pagination: PaginationInfo }> {
    let response = await this.request(api, '/v2/emoji', {
      params: this.params({
        limit: options.limit,
        offset: options.offset
      })
    });
    return {
      raw: response.data,
      emojis: this.items(response.data.data).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async getEmojiVariations(
    gifId: string
  ): Promise<ResponseMetadata & { variations: GifObject[] }> {
    let response = await this.request(
      api,
      `/v2/emoji/${encodeURIComponent(gifId)}/variations`,
      {
        params: this.params()
      }
    );
    return {
      raw: response.data,
      variations: this.items(response.data.data).map(normalizeGif)
    };
  }

  async trendingSearchTerms(): Promise<ResponseMetadata & { terms: string[] }> {
    let response = await this.request(api, '/v1/trending/searches', {
      params: this.params()
    });
    return {
      raw: response.data,
      terms: response.data.data || []
    };
  }

  async searchSuggestions(
    term: string
  ): Promise<ResponseMetadata & { suggestions: Array<{ name: string }> }> {
    let response = await this.request(api, `/v1/tags/related/${encodeURIComponent(term)}`, {
      params: this.params()
    });
    return {
      raw: response.data,
      suggestions: this.items(response.data.data).map((item: any) => ({
        name: item.name
      }))
    };
  }

  async autocomplete(options: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<ResponseMetadata & { tags: Array<{ name: string }> }> {
    let response = await this.request(api, '/v1/gifs/search/tags', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset
      })
    });
    return {
      raw: response.data,
      tags: this.items(response.data.data).map((item: any) => ({
        name: item.name
      }))
    };
  }

  async getCategories(): Promise<
    ResponseMetadata & {
      categories: Array<{
        name: string;
        nameEncoded: string;
        subcategories: Array<{ name: string; nameEncoded: string }>;
      }>;
    }
  > {
    let response = await this.request(api, '/v1/gifs/categories', {
      params: this.params()
    });
    return {
      raw: response.data,
      categories: this.items(response.data.data).map((cat: any) => ({
        name: cat.name,
        nameEncoded: cat.name_encoded,
        subcategories: this.items(cat.subcategories).map((sub: any) => ({
          name: sub.name,
          nameEncoded: sub.name_encoded
        }))
      }))
    };
  }

  async uploadGif(options: {
    sourceImageUrl?: string;
    tags?: string;
    sourcePostUrl?: string;
    username?: string;
  }): Promise<ResponseMetadata & { gifId: string }> {
    let response = await this.request(uploadApi, '/v1/gifs', {
      method: 'POST',
      data: this.params({
        source_image_url: options.sourceImageUrl,
        tags: options.tags,
        source_post_url: options.sourcePostUrl,
        username: options.username
      })
    });
    if (typeof response.data.data?.id !== 'string' || !response.data.data.id) {
      throw createApiServiceError(
        'GIPHY accepted the upload response but did not return a GIF ID. Check your channel before retrying the upload.'
      );
    }
    return {
      raw: response.data,
      gifId: response.data.data.id
    };
  }

  async searchChannels(options: { query: string; limit?: number; offset?: number }): Promise<
    ResponseMetadata & {
      channels: Array<{
        channelId: number;
        url: string;
        displayName: string;
        slug: string;
        type: string;
        shortDisplayName: string;
        description: string;
        bannerImage: string;
        username: string;
        featuredGif: GifObject | null;
        raw: Record<string, unknown>;
      }>;
      pagination: PaginationInfo;
    }
  > {
    let response = await this.request(api, '/v1/channels/search', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset
      })
    });
    return {
      raw: response.data,
      channels: this.items(response.data.data).map((ch: any) => ({
        channelId: ch.id,
        url: ch.url,
        displayName: ch.display_name,
        slug: ch.slug,
        type: ch.type,
        shortDisplayName: ch.short_display_name,
        description: ch.description,
        bannerImage: ch.banner_image,
        username: ch.user?.username || '',
        raw: ch,
        featuredGif: ch.featured_gif ? normalizeGif(ch.featured_gif) : null
      })),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async createRandomId(): Promise<ResponseMetadata & { randomId: string }> {
    let response = await this.request(api, '/v1/randomid', { params: this.params() });
    let randomId = response.data.data?.random_id;
    if (typeof randomId !== 'string' || !randomId) {
      throw createApiServiceError('GIPHY did not return a random identifier.');
    }
    return { randomId, raw: response.data };
  }

  async registerAction(options: {
    analyticsUrl: string;
    customerId: string;
    timestamp: number;
  }): Promise<{ status: number }> {
    let url: URL;
    try {
      url = new URL(options.analyticsUrl);
    } catch {
      throw createApiServiceError('Use an analytics URL returned by a GIPHY GIF response.');
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'giphy-analytics.giphy.com' ||
      url.port ||
      url.username ||
      url.password ||
      url.pathname !== '/v2/pingback_simple'
    ) {
      throw createApiServiceError(
        'Use the HTTPS giphy-analytics.giphy.com/v2/pingback_simple URL returned by GIPHY.'
      );
    }
    url.searchParams.set('customer_id', options.customerId);
    url.searchParams.set('ts', String(options.timestamp));
    try {
      // Analytics URLs are public and must never receive the API key or follow redirects.
      let response = await api.get(url.toString(), { maxRedirects: 0 });
      if (response.status !== 200) {
        throw createApiServiceError('GIPHY did not confirm the analytics event.', {
          upstreamStatus: response.status
        });
      }
      return { status: response.status };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GIPHY',
        reason: 'giphy_analytics_error',
        extractResponse: (value, helpers) => helpers.getResponseWithBody(value)
      });
    }
  }
}
