import { createAxios } from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.spotlightr.com'
});

export interface Video {
  videoId: string;
  name: string;
  watchPageUrl?: string;
  videoGroup?: string;
  created?: string;
  [key: string]: any;
}

export interface VideoMetrics {
  loads: number;
  watched: number;
  plays: number;
  playRate: number;
  completitionRate: number;
  shares: number;
}

export interface VideoView {
  viewId: string;
  [key: string]: any;
}

export interface TopVideo {
  videoId: string;
  name: string;
  [key: string]: any;
}

export interface Group {
  groupId: string;
  name: string;
  [key: string]: any;
}

export class Client {
  constructor(private config: { token: string }) {}

  private get authParams() {
    return { vooKey: this.config.token };
  }

  async listVideos(params?: { videoId?: string; videoGroup?: string }): Promise<any[]> {
    let response = await apiAxios.get('/api/videos', {
      params: {
        ...this.authParams,
        ...(params?.videoId ? { videoID: params.videoId } : {}),
        ...(params?.videoGroup ? { videoGroup: params.videoGroup } : {})
      }
    });
    return response.data;
  }

  async createVideo(params: {
    name: string;
    url?: string;
    playerSettings?: string;
    videoGroup?: string;
    hls?: boolean;
  }): Promise<any> {
    let formData: Record<string, any> = {
      vooKey: this.config.token,
      name: params.name
    };

    if (params.url) {
      formData.URL = params.url;
    }
    if (params.playerSettings) {
      formData.playerSettings = params.playerSettings;
    }
    if (params.videoGroup) {
      formData.videoGroup = params.videoGroup;
    }
    if (params.hls !== undefined) {
      formData.hls = params.hls ? 1 : 0;
    }

    let response = await apiAxios.post('/api/createVideo', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async deleteVideos(videoIds: string[]): Promise<any> {
    let response = await apiAxios.post(
      '/api/deleteVideo',
      {
        vooKey: this.config.token,
        IDs: videoIds
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async getVideoMetrics(videoId: string): Promise<any> {
    let response = await apiAxios.get('/api/video/metrics', {
      params: {
        ...this.authParams,
        videoID: videoId
      }
    });
    return response.data;
  }

  async getVideoViews(params: {
    videoId: string;
    customViewerId?: string;
    onlyWatched?: boolean;
    allViews?: boolean;
  }): Promise<any> {
    let response = await apiAxios.get('/api/views/getViews', {
      params: {
        ...this.authParams,
        videoID: params.videoId,
        ...(params.customViewerId ? { customViewerID: params.customViewerId } : {}),
        ...(params.onlyWatched !== undefined ? { onlyWatched: params.onlyWatched } : {}),
        ...(params.allViews !== undefined ? { allViews: params.allViews } : {})
      }
    });
    return response.data;
  }

  async getTopVideos(params?: { days?: number; total?: number }): Promise<any> {
    let response = await apiAxios.get('/api/getTopVideos', {
      params: {
        ...this.authParams,
        ...(params?.days ? { days: params.days } : {}),
        ...(params?.total ? { total: params.total } : {})
      }
    });
    return response.data;
  }

  async updateVideoSource(videoId: string, url: string): Promise<any> {
    let response = await apiAxios.get('/api/videoSource', {
      params: {
        ...this.authParams,
        id: videoId,
        URL: url
      }
    });
    return response.data;
  }

  async getGroups(): Promise<any> {
    let response = await apiAxios.get('/groups', {
      params: this.authParams
    });
    return response.data;
  }

  async createGroup(name: string): Promise<any> {
    let response = await apiAxios.post(
      '/groups',
      {
        vooKey: this.config.token,
        name
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async updatePlayerSettings(videoId: string, settings: Record<string, any>): Promise<any> {
    let response = await apiAxios.post(
      '/video/updateSettings',
      {
        vooKey: this.config.token,
        id: videoId,
        settings: JSON.stringify(settings)
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async getWhitelistedDomains(): Promise<any> {
    let response = await apiAxios.get('/api/user/domain', {
      params: this.authParams
    });
    return response.data;
  }

  async addWhitelistedDomain(domain: string): Promise<any> {
    let response = await apiAxios.post(
      '/api/user/domain',
      {
        vooKey: this.config.token,
        domain
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async globalSearch(query: string): Promise<any> {
    let response = await apiAxios.post(
      '/search/global',
      {
        vooKey: this.config.token,
        query
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async createAccessCodes(params: {
    galleryId: string;
    quantity: number;
    never?: boolean;
    unlocks?: number;
    time?: number;
    expires?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      vooKey: this.config.token,
      id: params.galleryId,
      quantity: params.quantity
    };
    if (params.never !== undefined) body.never = params.never;
    if (params.unlocks !== undefined) body.unlocks = params.unlocks;
    if (params.time !== undefined) body.time = params.time;
    if (params.expires) body.expires = params.expires;

    let response = await apiAxios.post('/spotlight/codes', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async updateAccessCode(codeId: string, expires: string): Promise<any> {
    let response = await apiAxios.post(
      '/spotlight/updateCode',
      {
        vooKey: this.config.token,
        id: codeId,
        expires
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async uploadAsset(file: any): Promise<any> {
    let response = await apiAxios.post(
      '/assets',
      {
        vooKey: this.config.token,
        file
      },
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  }
}
