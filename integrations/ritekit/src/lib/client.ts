import { createAxios } from 'slates';

export interface HashtagStats {
  tag: string;
  tweets: number;
  exposure: number;
  retweets: number;
  images: number;
  links: number;
  mentions: number;
  color: number;
}

export interface HashtagSuggestion {
  tag: string;
  tweets: number;
  exposure: number;
  retweets: number;
  images: number;
  links: number;
  mentions: number;
  color: number;
}

export interface TrendingHashtag {
  tag: string;
  tweets: number;
  exposure: number;
  retweets: number;
  images: number;
  links: number;
  mentions: number;
  color: number;
}

export interface HashtagHistory {
  date: string;
  tweets: number;
  retweets: number;
  exposure: number;
  links: number;
  photos: number;
  mentions: number;
  color: number;
}

export interface EmojiSuggestion {
  emoji: string;
  score: number;
}

export interface QuoteImageOptions {
  quote: string;
  author: string;
  fontSize?: number;
  quoteFont?: string;
  quoteFontColor?: string;
  authorFont?: string;
  authorFontColor?: string;
  enableHighlight?: number;
  highlightColor?: string;
  bgType?: string;
  backgroundColor?: string;
  gradientType?: string;
  gradientColor1?: string;
  gradientColor2?: string;
  brandLogo?: string;
  animation?: string;
  showQuoteMark?: number;
}

export interface CompanyLogo {
  url: string;
  permanentUrl?: string;
  domain?: string;
}

export interface BrandColor {
  color: string;
}

export interface PersonInsights {
  name?: string;
  surname?: string;
  isFreemail?: boolean;
  isDisposable?: boolean;
  emailTypoSuggestions?: string[];
}

export class RiteKitClient {
  private axios: ReturnType<typeof createAxios>;
  private clientId: string;

  constructor(config: { token: string }) {
    this.clientId = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.ritekit.com'
    });
  }

  private params(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { client_id: this.clientId, ...extra };
  }

  // --- Hashtag Analytics ---

  async autoHashtag(
    post: string,
    maxHashtags?: number,
    hashtagPosition?: string
  ): Promise<{ post: string }> {
    let response = await this.axios.get('/v1/stats/auto-hashtag', {
      params: this.params({ post, maxHashtags, hashtagPosition })
    });
    return response.data;
  }

  async hashtagSuggestions(text: string): Promise<{ data: HashtagSuggestion[] }> {
    let response = await this.axios.get('/v1/stats/hashtag-suggestions', {
      params: this.params({ text })
    });
    return response.data;
  }

  async hashtagSuggestionsForImage(imageUrl: string): Promise<{ data: HashtagSuggestion[] }> {
    let response = await this.axios.get('/v1/stats/hashtag-suggestions-image', {
      params: this.params({ url: imageUrl })
    });
    return response.data;
  }

  async hashtagsForUrl(url: string): Promise<{ data: HashtagSuggestion[] }> {
    let response = await this.axios.get('/v2/stats/hashtags-for-url', {
      params: this.params({ url })
    });
    return response.data;
  }

  async hashtagStats(tags: string[]): Promise<{ stats: HashtagStats[] }> {
    let response = await this.axios.get('/v1/stats/multiple-hashtags', {
      params: this.params({ tags: tags.join(',') })
    });
    return response.data;
  }

  async hashtagHistory(hashtag: string): Promise<{ data: HashtagHistory[] }> {
    let response = await this.axios.get(`/v1/stats/history/${encodeURIComponent(hashtag)}`, {
      params: this.params()
    });
    return response.data;
  }

  async trendingHashtags(
    green?: boolean,
    latin?: boolean
  ): Promise<{ tags: TrendingHashtag[] }> {
    let response = await this.axios.get('/v1/search/trending', {
      params: this.params({
        green: green !== undefined ? (green ? 1 : 0) : undefined,
        latin: latin !== undefined ? (latin ? 1 : 0) : undefined
      })
    });
    return response.data;
  }

  async bannedInstagramHashtags(
    post: string
  ): Promise<{ bannedHashtags: string[]; post: string }> {
    let response = await this.axios.get('/v2/instagram/hashtags-cleaner', {
      params: this.params({ post })
    });
    return response.data;
  }

  // --- Person Insights ---

  async freemailDetection(email: string): Promise<{ freemail: boolean }> {
    let response = await this.axios.get('/v2/person-insights/freemail-detection', {
      params: this.params({ email })
    });
    return response.data;
  }

  async disposableEmailDetection(email: string): Promise<{ disposable: boolean }> {
    let response = await this.axios.get('/v2/person-insights/disposable-email-detection', {
      params: this.params({ email })
    });
    return response.data;
  }

  async emailTypo(email: string): Promise<{ suggestions: string[] }> {
    let response = await this.axios.get('/v2/person-insights/email-typo', {
      params: this.params({ email })
    });
    return response.data;
  }

  async nameFromEmail(email: string): Promise<{ name: string; surname: string }> {
    let response = await this.axios.get('/v2/person-insights/name-from-email-address', {
      params: this.params({ email })
    });
    return response.data;
  }

  async fullEmailInsights(email: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/person-insights/full-email-insights', {
      params: this.params({ email })
    });
    return response.data;
  }

  // --- Company Insights ---

  async companyNameToDomain(companyName: string): Promise<{ domains: string[] }> {
    let response = await this.axios.get('/v2/company-insights/name-to-domain', {
      params: this.params({ name: companyName })
    });
    return response.data;
  }

  async companyLogo(domain: string): Promise<CompanyLogo> {
    let response = await this.axios.get('/v2/company-insights/logo', {
      params: this.params({ domain })
    });
    return response.data;
  }

  async brandColors(domain: string): Promise<{ colors: string[] }> {
    let response = await this.axios.get('/v2/company-insights/brand-colors', {
      params: this.params({ domain })
    });
    return response.data;
  }

  // --- Emoji ---

  async emojiSuggestions(text: string): Promise<{ emojis: EmojiSuggestion[] }> {
    let response = await this.axios.get('/v1/emoji/suggestions', {
      params: this.params({ text })
    });
    return response.data;
  }

  async autoEmojify(text: string): Promise<{ text: string }> {
    let response = await this.axios.get('/v1/emoji/auto-emojify', {
      params: this.params({ text })
    });
    return response.data;
  }

  // --- Images ---

  async textToImage(options: QuoteImageOptions): Promise<{ url: string }> {
    let response = await this.axios.get('/v2/image/quote', {
      params: this.params(options as unknown as Record<string, unknown>)
    });
    return response.data;
  }

  async animateImage(imageUrl: string, animationType: string): Promise<{ url: string }> {
    let response = await this.axios.get('/v1/images/animate', {
      params: this.params({ url: imageUrl, type: animationType })
    });
    return response.data;
  }

  async extractImageFromUrl(url: string): Promise<{ url: string }> {
    let response = await this.axios.get('/v2/image/extract-image', {
      params: this.params({ url })
    });
    return response.data;
  }

  // --- Text Extraction ---

  async extractArticle(url: string): Promise<{ title: string; text: string }> {
    let response = await this.axios.get('/v2/text/extract-article', {
      params: this.params({ url })
    });
    return response.data;
  }

  async linkPreview(
    url: string
  ): Promise<{ title: string; description: string; image: string }> {
    let response = await this.axios.get('/v2/text/link-preview', {
      params: this.params({ url })
    });
    return response.data;
  }

  // --- Link Shortening ---

  async shortenLink(
    url: string,
    ctaId: number
  ): Promise<{ url: string; original: string; service: string; ctaId: number }> {
    let response = await this.axios.get('/v1/link/short-link', {
      params: this.params({ url, cta: ctaId })
    });
    return response.data;
  }

  async listCtas(): Promise<{ list: Array<{ ctaId: number; name: string }> }> {
    let response = await this.axios.get('/v1/link/cta', {
      params: this.params()
    });
    return response.data;
  }
}
