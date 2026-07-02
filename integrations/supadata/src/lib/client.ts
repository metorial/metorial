import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.supadata.ai/v1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'x-api-key': this.token
    };
  }

  // ── Transcript ───────────────────────────────────────────────────────

  async getTranscript(params: {
    url: string;
    lang?: string;
    text?: boolean;
    chunkSize?: number;
    mode?: 'native' | 'generate' | 'auto';
  }) {
    let response = await http.get('/transcript', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  async getTranscriptResult(jobId: string) {
    let response = await http.get(`/transcript/${jobId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Metadata ─────────────────────────────────────────────────────────

  async getMetadata(params: { url: string }) {
    let response = await http.get('/metadata', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  // ── Extract (AI) ─────────────────────────────────────────────────────

  async createExtraction(params: {
    url: string;
    prompt?: string;
    schema?: Record<string, any>;
  }) {
    let response = await http.post('/extract', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getExtractionResult(jobId: string) {
    let response = await http.get(`/extract/${jobId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── Web Scrape ───────────────────────────────────────────────────────

  async scrapeWebPage(params: { url: string; noLinks?: boolean; lang?: string }) {
    let response = await http.get('/web/scrape', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  // ── Web Map ──────────────────────────────────────────────────────────

  async mapWebsite(params: { url: string }) {
    let response = await http.get('/web/map', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  // ── Web Crawl ────────────────────────────────────────────────────────

  async createCrawl(params: { url: string; limit?: number }) {
    let response = await http.post('/web/crawl', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getCrawlStatus(jobId: string) {
    let response = await http.get(`/web/crawl/${jobId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ── YouTube Video Metadata ───────────────────────────────────────────

  async getYouTubeVideo(params: { url: string }) {
    let response = await http.get('/youtube/video', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  // ── YouTube Channel ──────────────────────────────────────────────────

  async getYouTubeChannel(params: { url: string }) {
    let response = await http.get('/youtube/channel', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  async getYouTubeChannelVideos(params: {
    url: string;
    type?: 'video' | 'short' | 'live' | 'all';
    limit?: number;
  }) {
    let response = await http.get('/youtube/channel/videos', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  // ── YouTube Playlist ─────────────────────────────────────────────────

  async getYouTubePlaylist(params: { url: string }) {
    let response = await http.get('/youtube/playlist', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  async getYouTubePlaylistVideos(params: { url: string; limit?: number }) {
    let response = await http.get('/youtube/playlist/videos', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  // ── YouTube Search ───────────────────────────────────────────────────

  async searchYouTube(params: {
    query: string;
    type?: 'video' | 'channel' | 'playlist';
    limit?: number;
    order?: 'relevance' | 'date' | 'viewCount' | 'rating';
  }) {
    let response = await http.get('/youtube/search', {
      params,
      headers: this.headers
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
    let response = await http.get('/youtube/transcript', {
      params,
      headers: this.headers
    });
    return response.data;
  }

  async translateYouTubeTranscript(params: { videoId: string; lang: string; text?: boolean }) {
    let response = await http.get('/youtube/transcript/translate', {
      params,
      headers: this.headers
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
    let response = await http.post('/youtube/transcript/batch', params, {
      headers: this.headers
    });
    return response.data;
  }
}
