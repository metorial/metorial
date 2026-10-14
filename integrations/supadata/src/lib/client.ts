import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  SlateError
} from 'slates';

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Supadata API key is required.');
    }

    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'Supadata',
        reason: 'supadata_api_error',
        detailKeys: ['message', 'details', 'error'],
        extractResponse: (error, helpers) => {
          let response = helpers.getResponse(error);
          // Shared HTTP normalization retains the provider payload in baggage.
          return SlateError.is(error) && error.data.baggage?.response !== undefined
            ? { ...response, data: error.data.baggage.response }
            : response;
        },
        extractUpstreamCode: (error, response, helpers) => {
          if (helpers.isRecord(response?.data) && typeof response.data.error === 'string') {
            return response.data.error;
          }
          return SlateError.is(error) ? error.data.upstream?.code : undefined;
        }
      });

    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.supadata.ai/v1',
      timeout: 120_000,
      authHeader: { name: 'x-api-key', value: config.token },
      errorAdapter
    });
    this.http.interceptors.response.use(response => {
      // Supadata uses HTTP 206 for transcript-unavailable error responses.
      if (typeof response.data?.error === 'string') {
        throw errorAdapter({ response });
      }
      return response;
    });
  }

  async getCurrentAccount() {
    let response = await this.http.get<{
      organizationId: string;
      plan: string;
      maxCredits: number;
      usedCredits: number;
    }>('/me');
    return response.data;
  }

  // ── Transcript ───────────────────────────────────────────────────────

  async getTranscript(params: {
    url: string;
    lang?: string;
    text?: boolean;
    chunkSize?: number;
    mode?: 'native' | 'generate' | 'auto';
  }) {
    let response = await this.http.get('/transcript', {
      params
    });
    return response.data;
  }

  async getTranscriptResult(jobId: string) {
    let response = await this.http.get(`/transcript/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  // ── Metadata ─────────────────────────────────────────────────────────

  async getMetadata(params: { url: string }) {
    let response = await this.http.get('/metadata', {
      params
    });
    return response.data;
  }

  // ── Extract (AI) ─────────────────────────────────────────────────────

  async createExtraction(params: {
    url: string;
    prompt?: string;
    schema?: Record<string, any>;
  }) {
    let response = await this.http.post('/extract', params);
    return response.data;
  }

  async getExtractionResult(jobId: string) {
    let response = await this.http.get(`/extract/${encodeURIComponent(jobId)}`);
    return response.data;
  }

  // ── Web Scrape ───────────────────────────────────────────────────────

  async scrapeWebPage(params: { url: string; noLinks?: boolean; lang?: string }) {
    let response = await this.http.get('/web/scrape', {
      params
    });
    return response.data;
  }

  // ── Web Map ──────────────────────────────────────────────────────────

  async mapWebsite(params: { url: string }) {
    let response = await this.http.get('/web/map', {
      params
    });
    return response.data;
  }

  // ── Web Crawl ────────────────────────────────────────────────────────

  async createCrawl(params: { url: string; limit?: number }) {
    let response = await this.http.post('/web/crawl', params);
    return response.data;
  }

  async getCrawlStatus(jobId: string, skip?: number) {
    let response = await this.http.get(`/web/crawl/${encodeURIComponent(jobId)}`, {
      params: { skip }
    });
    return response.data;
  }

  // ── YouTube Video Metadata ───────────────────────────────────────────

  async getYouTubeVideo(params: { url: string }) {
    let response = await this.http.get('/youtube/video', {
      params: { id: params.url }
    });
    return response.data;
  }

  // ── YouTube Channel ──────────────────────────────────────────────────

  async getYouTubeChannel(params: { url: string }) {
    let response = await this.http.get('/youtube/channel', {
      params: { id: params.url }
    });
    return response.data;
  }

  async getYouTubeChannelVideos(params: {
    url: string;
    type?: 'video' | 'short' | 'live' | 'all';
    limit?: number;
  }) {
    let response = await this.http.get('/youtube/channel/videos', {
      params: { id: params.url, type: params.type, limit: params.limit }
    });
    return response.data;
  }

  // ── YouTube Playlist ─────────────────────────────────────────────────

  async getYouTubePlaylist(params: { url: string }) {
    let response = await this.http.get('/youtube/playlist', {
      params: { id: params.url }
    });
    return response.data;
  }

  async getYouTubePlaylistVideos(params: { url: string; limit?: number }) {
    let response = await this.http.get('/youtube/playlist/videos', {
      params: { id: params.url, limit: params.limit }
    });
    return response.data;
  }

  // ── YouTube Search ───────────────────────────────────────────────────

  async searchYouTube(params: {
    query: string;
    type?: 'video' | 'channel' | 'playlist' | 'all' | 'movie';
    limit?: number;
    order?: 'relevance' | 'date' | 'viewCount' | 'rating';
    nextPageToken?: string;
    uploadDate?: 'all' | 'hour' | 'today' | 'week' | 'month' | 'year';
    duration?: 'all' | 'short' | 'medium' | 'long';
    features?: string[];
  }) {
    let response = await this.http.get('/youtube/search', {
      params: {
        query: params.query,
        type: params.type,
        limit: params.limit,
        sortBy: params.order === 'viewCount' ? 'views' : params.order,
        nextPageToken: params.nextPageToken,
        uploadDate: params.uploadDate,
        duration: params.duration,
        features: params.features
      },
      paramsSerializer: { indexes: null }
    });
    return response.data;
  }

  // ── YouTube Transcript ───────────────────────────────────────────────

  async getYouTubeTranscript(params: {
    url: string;
    lang?: string;
    text?: boolean;
    chunkSize?: number;
  }) {
    let response = await this.http.get('/youtube/transcript', {
      params
    });
    return response.data;
  }

  async translateYouTubeTranscript(params: { videoId: string; lang: string; text?: boolean }) {
    let response = await this.http.get('/youtube/transcript/translate', {
      params
    });
    return response.data;
  }

  async createYouTubeTranscriptBatch(params: {
    videoIds?: string[];
    playlistId?: string;
    channelId?: string;
    lang?: string;
    text?: boolean;
    limit?: number;
  }) {
    let response = await this.http.post('/youtube/transcript/batch', params);
    return response.data;
  }
}
