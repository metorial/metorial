import { createAxios } from 'slates';
import type { GifObject, PaginationInfo } from './types';

let api = createAxios({
  baseURL: 'https://api.giphy.com'
});

let uploadApi = createAxios({
  baseURL: 'https://upload.giphy.com'
});

let normalizeGif = (raw: any): GifObject => {
  return {
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
    user: raw.user
      ? {
          avatarUrl: raw.user.avatar_url,
          bannerImage: raw.user.banner_image,
          bannerUrl: raw.user.banner_url,
          profileUrl: raw.user.profile_url,
          username: raw.user.username,
          displayName: raw.user.display_name,
          description: raw.user.description,
          isVerified: raw.user.is_verified
        }
      : undefined
  };
};

let normalizePagination = (raw: any): PaginationInfo => {
  return {
    totalCount: raw?.total_count,
    count: raw?.count,
    offset: raw?.offset
  };
};

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private params(extra: Record<string, any> = {}): Record<string, any> {
    let params: Record<string, any> = { api_key: this.token };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) {
        params[key] = value;
      }
    }
    return params;
  }

  async searchGifs(options: {
    query: string;
    limit?: number;
    offset?: number;
    rating?: string;
    lang?: string;
    bundle?: string;
  }): Promise<{ gifs: GifObject[]; pagination: PaginationInfo }> {
    let response = await api.get('/v1/gifs/search', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        lang: options.lang,
        bundle: options.bundle
      })
    });
    return {
      gifs: (response.data.data || []).map(normalizeGif),
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
  }): Promise<{ stickers: GifObject[]; pagination: PaginationInfo }> {
    let response = await api.get('/v1/stickers/search', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        lang: options.lang,
        bundle: options.bundle
      })
    });
    return {
      stickers: (response.data.data || []).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async trendingGifs(options: {
    limit?: number;
    offset?: number;
    rating?: string;
    bundle?: string;
  }): Promise<{ gifs: GifObject[]; pagination: PaginationInfo }> {
    let response = await api.get('/v1/gifs/trending', {
      params: this.params({
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        bundle: options.bundle
      })
    });
    return {
      gifs: (response.data.data || []).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async trendingStickers(options: {
    limit?: number;
    offset?: number;
    rating?: string;
    bundle?: string;
  }): Promise<{ stickers: GifObject[]; pagination: PaginationInfo }> {
    let response = await api.get('/v1/stickers/trending', {
      params: this.params({
        limit: options.limit,
        offset: options.offset,
        rating: options.rating,
        bundle: options.bundle
      })
    });
    return {
      stickers: (response.data.data || []).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async translateGif(options: {
    searchTerm: string;
    rating?: string;
  }): Promise<{ gif: GifObject }> {
    let response = await api.get('/v1/gifs/translate', {
      params: this.params({
        s: options.searchTerm,
        rating: options.rating
      })
    });
    return {
      gif: normalizeGif(response.data.data)
    };
  }

  async translateSticker(options: {
    searchTerm: string;
    rating?: string;
  }): Promise<{ sticker: GifObject }> {
    let response = await api.get('/v1/stickers/translate', {
      params: this.params({
        s: options.searchTerm,
        rating: options.rating
      })
    });
    return {
      sticker: normalizeGif(response.data.data)
    };
  }

  async randomGif(options: { tag?: string; rating?: string }): Promise<{ gif: GifObject }> {
    let response = await api.get('/v1/gifs/random', {
      params: this.params({
        tag: options.tag,
        rating: options.rating
      })
    });
    return {
      gif: normalizeGif(response.data.data)
    };
  }

  async randomSticker(options: {
    tag?: string;
    rating?: string;
  }): Promise<{ sticker: GifObject }> {
    let response = await api.get('/v1/stickers/random', {
      params: this.params({
        tag: options.tag,
        rating: options.rating
      })
    });
    return {
      sticker: normalizeGif(response.data.data)
    };
  }

  async getGifById(gifId: string): Promise<{ gif: GifObject }> {
    let response = await api.get(`/v1/gifs/${gifId}`, {
      params: this.params()
    });
    return {
      gif: normalizeGif(response.data.data)
    };
  }

  async getGifsByIds(
    gifIds: string[]
  ): Promise<{ gifs: GifObject[]; pagination: PaginationInfo }> {
    let response = await api.get('/v1/gifs', {
      params: this.params({
        ids: gifIds.join(',')
      })
    });
    return {
      gifs: (response.data.data || []).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async getEmoji(options: {
    limit?: number;
    offset?: number;
  }): Promise<{ emojis: GifObject[]; pagination: PaginationInfo }> {
    let response = await api.get('/v2/emoji', {
      params: this.params({
        limit: options.limit,
        offset: options.offset
      })
    });
    return {
      emojis: (response.data.data || []).map(normalizeGif),
      pagination: normalizePagination(response.data.pagination)
    };
  }

  async getEmojiVariations(gifId: string): Promise<{ variations: GifObject[] }> {
    let response = await api.get(`/v2/emoji/${gifId}/variations`, {
      params: this.params()
    });
    return {
      variations: (response.data.data || []).map(normalizeGif)
    };
  }

  async trendingSearchTerms(): Promise<{ terms: string[] }> {
    let response = await api.get('/v1/trending/searches', {
      params: this.params()
    });
    return {
      terms: response.data.data || []
    };
  }

  async searchSuggestions(term: string): Promise<{ suggestions: Array<{ name: string }> }> {
    let response = await api.get(`/v1/tags/related/${encodeURIComponent(term)}`, {
      params: this.params()
    });
    return {
      suggestions: (response.data.data || []).map((item: any) => ({
        name: item.name
      }))
    };
  }

  async autocomplete(options: {
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tags: Array<{ name: string }> }> {
    let response = await api.get('/v1/gifs/search/tags', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset
      })
    });
    return {
      tags: (response.data.data || []).map((item: any) => ({
        name: item.name
      }))
    };
  }

  async getCategories(): Promise<{
    categories: Array<{
      name: string;
      nameEncoded: string;
      subcategories: Array<{ name: string; nameEncoded: string }>;
    }>;
  }> {
    let response = await api.get('/v1/gifs/categories', {
      params: this.params()
    });
    return {
      categories: (response.data.data || []).map((cat: any) => ({
        name: cat.name,
        nameEncoded: cat.name_encoded,
        subcategories: (cat.subcategories || []).map((sub: any) => ({
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
  }): Promise<{ gifId: string }> {
    let response = await uploadApi.post('/v1/gifs', null, {
      params: this.params({
        source_image_url: options.sourceImageUrl,
        tags: options.tags,
        source_post_url: options.sourcePostUrl,
        username: options.username
      })
    });
    return {
      gifId: response.data.data?.id || ''
    };
  }

  async searchChannels(options: { query: string; limit?: number; offset?: number }): Promise<{
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
    }>;
    pagination: PaginationInfo;
  }> {
    let response = await api.get('/v1/channels/search', {
      params: this.params({
        q: options.query,
        limit: options.limit,
        offset: options.offset
      })
    });
    return {
      channels: (response.data.data || []).map((ch: any) => ({
        channelId: ch.id,
        url: ch.url,
        displayName: ch.display_name,
        slug: ch.slug,
        type: ch.type,
        shortDisplayName: ch.short_display_name,
        description: ch.description,
        bannerImage: ch.banner_image,
        username: ch.user?.username || '',
        featuredGif: ch.featured_gif ? normalizeGif(ch.featured_gif) : null
      })),
      pagination: normalizePagination(response.data.pagination)
    };
  }
}
