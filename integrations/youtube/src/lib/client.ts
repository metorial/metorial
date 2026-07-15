import { ServiceError } from '@lowerdeck/error';
import { createAxios } from '@slates/provider';
import { youtubeApiError, youtubeServiceError } from './errors';
import { probeSourceUrl, readSourceUrlChunk } from './source-url';
import type {
  YouTubeActivity,
  YouTubeCaption,
  YouTubeChannel,
  YouTubeComment,
  YouTubeCommentThread,
  YouTubeListResponse,
  YouTubePlaylist,
  YouTubePlaylistItem,
  YouTubeSearchResult,
  YouTubeSubscription,
  YouTubeVideo
} from './types';

type YouTubeAuthConfig = {
  token?: string;
  apiKey?: string;
  authType?: string;
};

type AxiosResponse<T> = {
  data: T;
  headers?: unknown;
  status?: number;
};

// The pinned @slates/provider version used by integrations does not yet expose
// the workspace's shared response-header helper.
let getHeaderValue = (headers: unknown, name: string) => {
  if (!headers || typeof headers !== 'object') return undefined;
  let getter = (headers as { get?: unknown }).get;
  if (typeof getter === 'function') {
    let value = getter.call(headers, name);
    return typeof value === 'string' ? value : undefined;
  }
  let lowerName = name.toLowerCase();
  for (let [headerName, value] of Object.entries(headers as Record<string, unknown>)) {
    if (headerName.toLowerCase() !== lowerName) continue;
    if (Array.isArray(value)) value = value[0];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
};

export const MAX_BASE64_VIDEO_BYTES = 6 * 1024 * 1024;
export const MAX_YOUTUBE_VIDEO_BYTES = 256 * 1000 * 1000 * 1000;
// Operational cap for server-side sourceUrl fetches. YouTube itself accepts up
// to 256 GB, but streaming that through sequential 8 MiB chunk round-trips is
// guaranteed to outlive any tool-invocation window and is a resource-
// consumption vector, so sourceUrl uploads are bounded to 2 GiB.
export const MAX_SOURCE_URL_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 2 * 1000 * 1000;
const RESUMABLE_CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_RETRIES = 3;

type UploadVideoParams = {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'public' | 'unlisted';
  notifySubscribers?: boolean;
  mimeType?: string;
  content?: Buffer;
  sourceUrl?: string;
};

type ThumbnailResource = Partial<
  Record<
    'default' | 'medium' | 'high' | 'standard' | 'maxres',
    { url: string; width?: number; height?: number }
  >
>;

type ThumbnailSetResponse = {
  items?: ThumbnailResource[];
};

export class Client {
  private axios;
  private apiKey?: string;
  private oauthToken?: string;

  constructor(config: YouTubeAuthConfig) {
    this.apiKey =
      config.authType === 'apiKey' || config.apiKey
        ? (config.apiKey ?? config.token)
        : undefined;
    let oauthToken = this.apiKey ? undefined : config.token;
    this.oauthToken = oauthToken;

    if (!this.apiKey && !oauthToken) {
      throw youtubeServiceError('YouTube credentials are missing');
    }

    this.axios = createAxios({
      baseURL: 'https://www.googleapis.com/youtube/v3',
      headers: oauthToken
        ? {
            Authorization: `Bearer ${oauthToken}`
          }
        : undefined
    });
  }

  static fromAuth(auth: YouTubeAuthConfig) {
    return new Client(auth);
  }

  private withAuthParams(params: Record<string, unknown>) {
    return this.apiKey
      ? {
          ...params,
          key: this.apiKey
        }
      : params;
  }

  private async request<T>(
    operation: string,
    run: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw youtubeApiError(error, operation);
    }
  }

  private requireOAuth(operation: string) {
    if (!this.oauthToken) {
      throw youtubeServiceError(`${operation} requires OAuth 2.0 authentication.`);
    }
  }

  private validateMediaMimeType(mimeType: string) {
    let normalized = mimeType.trim().toLowerCase();
    if (
      normalized !== 'application/octet-stream' &&
      !/^video\/[a-z0-9!#$&^_.+-]+$/.test(normalized)
    ) {
      throw youtubeServiceError('Video mimeType must be video/* or application/octet-stream.');
    }
    return normalized;
  }

  private validateUploadSessionUrl(value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw youtubeServiceError('YouTube returned an invalid resumable upload URL.');
    }
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.googleapis.com') ||
      !url.pathname.startsWith('/upload/youtube/v3/videos')
    ) {
      throw youtubeServiceError('YouTube returned an unexpected resumable upload URL.');
    }
    return url.toString();
  }

  private async startVideoUpload(params: {
    title: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus: 'private' | 'public' | 'unlisted';
    notifySubscribers: boolean;
    contentLength: number;
    mimeType: string;
  }) {
    let snippet: Record<string, unknown> = { title: params.title };
    if (params.description !== undefined) snippet.description = params.description;
    if (params.tags !== undefined) snippet.tags = params.tags;
    if (params.categoryId !== undefined) snippet.categoryId = params.categoryId;

    let response: AxiosResponse<unknown>;
    try {
      response = await this.axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos',
        {
          snippet,
          status: { privacyStatus: params.privacyStatus }
        },
        {
          params: {
            uploadType: 'resumable',
            part: 'snippet,status',
            notifySubscribers: params.notifySubscribers
          },
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': String(params.contentLength),
            'X-Upload-Content-Type': params.mimeType
          }
        }
      );
    } catch (error) {
      throw youtubeApiError(error, 'start resumable video upload');
    }

    let location = getHeaderValue(response.headers, 'location');
    if (!location) {
      throw youtubeServiceError('YouTube did not return a resumable upload URL.');
    }
    return this.validateUploadSessionUrl(location);
  }

  // Returns the number of bytes YouTube has committed, or undefined when the
  // 308 response carries no Range header — which, per the resumable upload
  // protocol, means no bytes have been committed yet.
  private committedUploadOffset(headers: unknown): number | undefined {
    let range = getHeaderValue(headers, 'range');
    if (!range) return undefined;
    let match = range.match(/^bytes=0-(\d+)$/i);
    let offset = match ? Number(match[1]) + 1 : Number.NaN;
    if (!Number.isSafeInteger(offset) || offset <= 0) {
      throw youtubeServiceError('YouTube returned an invalid resumable upload range.');
    }
    return offset;
  }

  private retryAfterMs(headers: unknown, attempt: number) {
    let value = getHeaderValue(headers, 'retry-after');
    let requestedDelay: number | undefined;
    if (value !== undefined) {
      let seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        requestedDelay = seconds * 1000;
      } else {
        let timestamp = Date.parse(value);
        if (Number.isFinite(timestamp)) requestedDelay = Math.max(0, timestamp - Date.now());
      }
    }
    return Math.min(requestedDelay ?? 250 * 2 ** Math.max(0, attempt - 1), 60_000);
  }

  private isRetryableUploadError(error: unknown) {
    if (error instanceof ServiceError) return false;
    let status = (error as any)?.response?.status;
    return status === undefined || [500, 502, 503, 504].includes(Number(status));
  }

  private requireUploadedVideo(value: unknown) {
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof (value as { id?: unknown }).id !== 'string' ||
      (value as { id: string }).id.length === 0
    ) {
      throw youtubeServiceError(
        'YouTube completed the resumable upload without returning a video resource.'
      );
    }
    return value as YouTubeVideo;
  }

  private async queryUploadStatus(sessionUrl: string, totalBytes: number) {
    let response: AxiosResponse<YouTubeVideo> = await this.axios.put(sessionUrl, null, {
      headers: {
        'Content-Length': '0',
        'Content-Range': `bytes */${totalBytes}`
      },
      validateStatus: (status: number) => status === 308 || (status >= 200 && status < 300)
    });
    if (response.status === 308) {
      let retryAfter = getHeaderValue(response.headers, 'retry-after');
      return {
        // No Range header on a 308 means nothing was committed yet.
        offset: this.committedUploadOffset(response.headers) ?? 0,
        retryAfterMs: retryAfter === undefined ? 0 : this.retryAfterMs(response.headers, 1)
      };
    }
    return {
      offset: totalBytes,
      video: this.requireUploadedVideo(response.data),
      retryAfterMs: 0
    };
  }

  private async recoverUploadStatus(
    sessionUrl: string,
    totalBytes: number,
    initialError?: unknown
  ) {
    let error = initialError;
    for (let attempt = 0; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
      if (error !== undefined) {
        if (!this.isRetryableUploadError(error) || attempt === MAX_UPLOAD_RETRIES) {
          throw youtubeApiError(error, 'query resumable video upload status');
        }
        let headers = (error as any)?.response?.headers;
        await new Promise(resolve =>
          setTimeout(resolve, this.retryAfterMs(headers, attempt + 1))
        );
      }

      try {
        return await this.queryUploadStatus(sessionUrl, totalBytes);
      } catch (statusError) {
        error = statusError;
      }
    }
    throw youtubeApiError(error, 'query resumable video upload status');
  }

  private async uploadVideoChunks(
    sessionUrl: string,
    totalBytes: number,
    mimeType: string,
    readChunk: (start: number, end: number) => Promise<Buffer>
  ) {
    let offset = 0;
    let stalledAttempts = 0;

    while (offset < totalBytes) {
      let end = Math.min(offset + RESUMABLE_CHUNK_BYTES, totalBytes) - 1;
      let chunk = await readChunk(offset, end);
      if (chunk.length !== end - offset + 1) {
        throw youtubeServiceError('Video source returned an incomplete upload chunk.');
      }

      try {
        let response: AxiosResponse<YouTubeVideo> = await this.axios.put(sessionUrl, chunk, {
          headers: {
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${offset}-${end}/${totalBytes}`,
            'Content-Type': mimeType
          },
          maxBodyLength: Number.POSITIVE_INFINITY,
          maxContentLength: Number.POSITIVE_INFINITY,
          validateStatus: (status: number) => status === 308 || (status >= 200 && status < 300)
        });

        if (response.status !== 308) {
          return this.requireUploadedVideo(response.data);
        }
        let committed = this.committedUploadOffset(response.headers);
        if (committed !== undefined && (committed < offset || committed > end + 1)) {
          throw youtubeServiceError('YouTube returned an invalid resumable upload range.');
        }
        // A Range-less 308 means nothing was committed: restart from byte 0,
        // bounded by the stalled-attempt retry limit below.
        let nextOffset = committed ?? 0;
        let madeProgress = nextOffset > offset;
        if (!madeProgress) {
          stalledAttempts += 1;
          if (stalledAttempts > MAX_UPLOAD_RETRIES) {
            throw youtubeServiceError(
              'YouTube resumable upload made no progress after repeated attempts.'
            );
          }
        } else {
          stalledAttempts = 0;
        }
        offset = nextOffset;
        let retryAfter = getHeaderValue(response.headers, 'retry-after');
        if (retryAfter !== undefined || !madeProgress) {
          await new Promise(resolve =>
            setTimeout(resolve, this.retryAfterMs(response.headers, stalledAttempts || 1))
          );
        }
      } catch (error) {
        if (error instanceof ServiceError) throw error;
        if (!this.isRetryableUploadError(error)) {
          throw youtubeApiError(error, 'upload video bytes');
        }

        let statusResult = await this.recoverUploadStatus(sessionUrl, totalBytes, error);
        if (statusResult.video) return statusResult.video;
        // An offset of 0 is a Range-less 308 status probe: nothing committed,
        // so restart from byte 0 under the same stalled-attempt bound.
        if (
          (statusResult.offset !== 0 && statusResult.offset < offset) ||
          statusResult.offset > end + 1
        ) {
          throw youtubeServiceError('YouTube returned an invalid resumable upload range.');
        }
        stalledAttempts = statusResult.offset > offset ? 0 : stalledAttempts + 1;
        if (stalledAttempts > MAX_UPLOAD_RETRIES) {
          throw youtubeServiceError(
            'YouTube resumable upload made no progress after repeated retries.'
          );
        }
        offset = statusResult.offset;
        if (statusResult.retryAfterMs > 0) {
          await new Promise(resolve => setTimeout(resolve, statusResult.retryAfterMs));
        }
      }
    }

    let statusResult = await this.recoverUploadStatus(sessionUrl, totalBytes);
    if (statusResult.video) return statusResult.video;
    throw youtubeServiceError('YouTube resumable upload did not return a video resource.');
  }

  // --- Videos ---

  async uploadVideo(params: UploadVideoParams): Promise<{
    video: YouTubeVideo;
    mimeType: string;
    sizeBytes: number;
    sourceType: 'base64' | 'url';
  }> {
    this.requireOAuth('Uploading videos');
    let hasContent = params.content !== undefined;
    let hasSourceUrl = params.sourceUrl !== undefined;
    if (hasContent === hasSourceUrl) {
      throw youtubeServiceError('Provide exactly one video source: content or sourceUrl.');
    }

    let sizeBytes: number;
    let mimeType: string;
    let sourceType: 'base64' | 'url';
    let readChunk: (start: number, end: number) => Promise<Buffer>;

    if (params.content) {
      sizeBytes = params.content.length;
      mimeType = params.mimeType ?? 'application/octet-stream';
      sourceType = 'base64';
      readChunk = async (start, end) => params.content!.subarray(start, end + 1);
    } else {
      let source = await probeSourceUrl(params.sourceUrl!);
      if (source.contentLength > MAX_SOURCE_URL_UPLOAD_BYTES) {
        throw youtubeServiceError(
          `sourceUrl reports ${source.contentLength} bytes, above the ${MAX_SOURCE_URL_UPLOAD_BYTES}-byte (2 GiB) operational limit for server-side URL uploads.`
        );
      }
      sizeBytes = source.contentLength;
      mimeType = params.mimeType ?? source.mimeType;
      sourceType = 'url';
      readChunk = async (start, end) => {
        // Defense in depth: never stream source bytes past the operational cap
        // even if the declared length were bypassed or inconsistent.
        if (end + 1 > MAX_SOURCE_URL_UPLOAD_BYTES) {
          throw youtubeServiceError(
            `sourceUrl uploads are limited to ${MAX_SOURCE_URL_UPLOAD_BYTES} bytes (2 GiB); refusing to stream past that limit.`
          );
        }
        return await readSourceUrlChunk(source, start, end);
      };
    }

    if (sizeBytes <= 0 || sizeBytes > MAX_YOUTUBE_VIDEO_BYTES) {
      throw youtubeServiceError(
        `Video content must be between 1 byte and ${MAX_YOUTUBE_VIDEO_BYTES} bytes.`
      );
    }
    mimeType = this.validateMediaMimeType(mimeType);

    let privacyStatus = params.privacyStatus ?? 'private';
    let sessionUrl = await this.startVideoUpload({
      title: params.title,
      description: params.description,
      tags: params.tags,
      categoryId: params.categoryId,
      privacyStatus,
      notifySubscribers: params.notifySubscribers ?? false,
      contentLength: sizeBytes,
      mimeType
    });
    let video = await this.uploadVideoChunks(sessionUrl, sizeBytes, mimeType, readChunk);
    return { video, mimeType, sizeBytes, sourceType };
  }

  async setThumbnail(params: {
    videoId: string;
    content: Buffer;
    mimeType: 'image/jpeg' | 'image/png';
  }): Promise<ThumbnailSetResponse> {
    this.requireOAuth('Setting a video thumbnail');
    if (params.content.length === 0 || params.content.length > MAX_THUMBNAIL_BYTES) {
      throw youtubeServiceError(
        `Thumbnail content must be between 1 byte and ${MAX_THUMBNAIL_BYTES} bytes.`
      );
    }

    return await this.request('set video thumbnail', () =>
      this.axios.post(
        'https://www.googleapis.com/upload/youtube/v3/thumbnails/set',
        params.content,
        {
          params: { videoId: params.videoId, uploadType: 'media' },
          headers: {
            'Content-Length': String(params.content.length),
            'Content-Type': params.mimeType
          },
          maxBodyLength: MAX_THUMBNAIL_BYTES,
          maxContentLength: MAX_THUMBNAIL_BYTES
        }
      )
    );
  }

  async listVideos(params: {
    part: string[];
    videoId?: string;
    chart?: string;
    myRating?: string;
    maxResults?: number;
    pageToken?: string;
    regionCode?: string;
    videoCategoryId?: string;
  }): Promise<YouTubeListResponse<YouTubeVideo>> {
    return await this.request('list videos', () =>
      this.axios.get('/videos', {
        params: this.withAuthParams({
          part: params.part.join(','),
          id: params.videoId,
          chart: params.chart,
          myRating: params.myRating,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          regionCode: params.regionCode,
          videoCategoryId: params.videoCategoryId
        })
      })
    );
  }

  async updateVideo(params: {
    part: string[];
    videoId: string;
    snippet?: {
      title?: string;
      description?: string;
      tags?: string[];
      categoryId?: string;
      defaultLanguage?: string;
    };
    status?: {
      privacyStatus?: string;
      publishAt?: string;
      license?: string;
      embeddable?: boolean;
      publicStatsViewable?: boolean;
      selfDeclaredMadeForKids?: boolean;
    };
  }): Promise<YouTubeVideo> {
    let current = await this.listVideos({
      part: ['snippet', 'status'],
      videoId: params.videoId
    });
    let currentVideo = current.items[0];
    if (!currentVideo) {
      throw youtubeServiceError(`Video ${params.videoId} was not found`);
    }

    let body: Record<string, any> = {
      id: params.videoId
    };
    if (params.snippet) {
      let currentSnippet = currentVideo.snippet;
      let title = params.snippet.title ?? currentSnippet?.title;
      let categoryId = params.snippet.categoryId ?? currentSnippet?.categoryId;

      if (!title) {
        throw youtubeServiceError('Video title is required when updating snippet metadata');
      }

      if (!categoryId) {
        throw youtubeServiceError(
          'Video categoryId is required when updating snippet metadata'
        );
      }

      body.snippet = {
        title,
        categoryId,
        description: params.snippet.description ?? currentSnippet?.description,
        tags: params.snippet.tags ?? currentSnippet?.tags,
        defaultLanguage: params.snippet.defaultLanguage ?? currentSnippet?.defaultLanguage
      };
    }
    if (params.status) {
      let currentStatus = currentVideo.status;
      body.status = {
        privacyStatus: params.status.privacyStatus ?? currentStatus?.privacyStatus,
        publishAt: params.status.publishAt ?? currentStatus?.publishAt,
        license: params.status.license ?? currentStatus?.license,
        embeddable: params.status.embeddable ?? currentStatus?.embeddable,
        publicStatsViewable:
          params.status.publicStatsViewable ?? currentStatus?.publicStatsViewable,
        selfDeclaredMadeForKids:
          params.status.selfDeclaredMadeForKids ?? currentStatus?.selfDeclaredMadeForKids
      };
    }

    return await this.request('update video', () =>
      this.axios.put('/videos', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.request('delete video', () =>
      this.axios.delete('/videos', {
        params: this.withAuthParams({ id: videoId })
      })
    );
  }

  async rateVideo(videoId: string, rating: string): Promise<void> {
    await this.request('rate video', () =>
      this.axios.post('/videos/rate', null, {
        params: this.withAuthParams({
          id: videoId,
          rating
        })
      })
    );
  }

  async getVideoRating(
    videoIds: string[]
  ): Promise<{ items: Array<{ videoId: string; rating: string }> }> {
    this.requireOAuth('Getting video ratings');
    return await this.request('get video rating', () =>
      this.axios.get('/videos/getRating', {
        params: this.withAuthParams({
          id: videoIds.join(',')
        })
      })
    );
  }

  // --- Search ---

  async search(params: {
    query?: string;
    part?: string[];
    type?: string[];
    channelId?: string;
    maxResults?: number;
    pageToken?: string;
    order?: string;
    publishedAfter?: string;
    publishedBefore?: string;
    regionCode?: string;
    relevanceLanguage?: string;
    videoDuration?: string;
    videoDefinition?: string;
    videoType?: string;
    videoCaption?: string;
    topicId?: string;
    eventType?: string;
    location?: string;
    locationRadius?: string;
  }): Promise<YouTubeListResponse<YouTubeSearchResult>> {
    return await this.request('search content', () =>
      this.axios.get('/search', {
        params: this.withAuthParams({
          q: params.query,
          part: (params.part || ['snippet']).join(','),
          type: params.type?.join(','),
          channelId: params.channelId,
          maxResults: params.maxResults || 25,
          pageToken: params.pageToken,
          order: params.order,
          publishedAfter: params.publishedAfter,
          publishedBefore: params.publishedBefore,
          regionCode: params.regionCode,
          relevanceLanguage: params.relevanceLanguage,
          videoDuration: params.videoDuration,
          videoDefinition: params.videoDefinition,
          videoType: params.videoType,
          videoCaption: params.videoCaption,
          topicId: params.topicId,
          eventType: params.eventType,
          location: params.location,
          locationRadius: params.locationRadius
        })
      })
    );
  }

  // --- Channels ---

  async listChannels(params: {
    part: string[];
    channelId?: string;
    forUsername?: string;
    mine?: boolean;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeListResponse<YouTubeChannel>> {
    return await this.request('list channels', () =>
      this.axios.get('/channels', {
        params: this.withAuthParams({
          part: params.part.join(','),
          id: params.channelId,
          forUsername: params.forUsername,
          mine: params.mine,
          maxResults: params.maxResults,
          pageToken: params.pageToken
        })
      })
    );
  }

  async updateChannel(params: {
    part: string[];
    channelId: string;
    brandingSettings?: {
      channel?: {
        title?: string;
        description?: string;
        keywords?: string;
        unsubscribedTrailer?: string;
        country?: string;
      };
    };
  }): Promise<YouTubeChannel> {
    let current = await this.listChannels({
      part: ['brandingSettings'],
      channelId: params.channelId
    });
    let currentChannel = current.items[0];
    if (!currentChannel) {
      throw youtubeServiceError(`Channel ${params.channelId} was not found`);
    }

    let currentBrandingSettings = currentChannel.brandingSettings ?? {};
    let currentChannelSettings = currentBrandingSettings.channel ?? {};
    let body: Record<string, any> = {
      id: params.channelId
    };
    if (params.brandingSettings) {
      body.brandingSettings = {
        ...currentBrandingSettings,
        ...params.brandingSettings,
        channel: {
          ...currentChannelSettings,
          ...params.brandingSettings.channel
        }
      };
    }

    return await this.request('update channel', () =>
      this.axios.put('/channels', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  // --- Playlists ---

  async listPlaylists(params: {
    part: string[];
    playlistId?: string;
    channelId?: string;
    mine?: boolean;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeListResponse<YouTubePlaylist>> {
    return await this.request('list playlists', () =>
      this.axios.get('/playlists', {
        params: this.withAuthParams({
          part: params.part.join(','),
          id: params.playlistId,
          channelId: params.channelId,
          mine: params.mine,
          maxResults: params.maxResults,
          pageToken: params.pageToken
        })
      })
    );
  }

  async createPlaylist(params: {
    part: string[];
    title: string;
    description?: string;
    privacyStatus?: string;
    defaultLanguage?: string;
    tags?: string[];
  }): Promise<YouTubePlaylist> {
    let body: Record<string, any> = {
      snippet: {
        title: params.title,
        description: params.description,
        defaultLanguage: params.defaultLanguage,
        tags: params.tags
      }
    };
    if (params.privacyStatus) {
      body.status = { privacyStatus: params.privacyStatus };
    }

    return await this.request('create playlist', () =>
      this.axios.post('/playlists', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async updatePlaylist(params: {
    part: string[];
    playlistId: string;
    title?: string;
    description?: string;
    privacyStatus?: string;
    defaultLanguage?: string;
  }): Promise<YouTubePlaylist> {
    let current = await this.listPlaylists({
      part: ['snippet', 'status'],
      playlistId: params.playlistId
    });
    let currentPlaylist = current.items[0];
    if (!currentPlaylist) {
      throw youtubeServiceError(`Playlist ${params.playlistId} was not found`);
    }

    let title = params.title ?? currentPlaylist.snippet?.title;
    if (!title) {
      throw youtubeServiceError('Playlist title is required when updating a playlist');
    }

    let body: Record<string, any> = {
      id: params.playlistId,
      snippet: {
        title,
        description: params.description ?? currentPlaylist.snippet?.description,
        defaultLanguage: params.defaultLanguage ?? currentPlaylist.snippet?.defaultLanguage
      }
    };
    if (params.part.includes('status')) {
      body.status = {
        privacyStatus: params.privacyStatus ?? currentPlaylist.status?.privacyStatus
      };
    }

    return await this.request('update playlist', () =>
      this.axios.put('/playlists', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.request('delete playlist', () =>
      this.axios.delete('/playlists', {
        params: this.withAuthParams({ id: playlistId })
      })
    );
  }

  // --- Playlist Items ---

  async listPlaylistItems(params: {
    part: string[];
    playlistId: string;
    maxResults?: number;
    pageToken?: string;
    videoId?: string;
  }): Promise<YouTubeListResponse<YouTubePlaylistItem>> {
    return await this.request('list playlist items', () =>
      this.axios.get('/playlistItems', {
        params: this.withAuthParams({
          part: params.part.join(','),
          playlistId: params.playlistId,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          videoId: params.videoId
        })
      })
    );
  }

  async addPlaylistItem(params: {
    part: string[];
    playlistId: string;
    videoId: string;
    position?: number;
  }): Promise<YouTubePlaylistItem> {
    let body: Record<string, any> = {
      snippet: {
        playlistId: params.playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: params.videoId
        }
      }
    };
    if (params.position !== undefined) {
      body.snippet.position = params.position;
    }

    return await this.request('add playlist item', () =>
      this.axios.post('/playlistItems', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async updatePlaylistItem(params: {
    part: string[];
    playlistItemId: string;
    playlistId: string;
    videoId: string;
    position?: number;
  }): Promise<YouTubePlaylistItem> {
    let body: Record<string, any> = {
      id: params.playlistItemId,
      snippet: {
        playlistId: params.playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: params.videoId
        }
      }
    };
    if (params.position !== undefined) {
      body.snippet.position = params.position;
    }

    return await this.request('update playlist item', () =>
      this.axios.put('/playlistItems', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deletePlaylistItem(playlistItemId: string): Promise<void> {
    await this.request('delete playlist item', () =>
      this.axios.delete('/playlistItems', {
        params: this.withAuthParams({ id: playlistItemId })
      })
    );
  }

  // --- Comment Threads ---

  async listCommentThreads(params: {
    part: string[];
    videoId?: string;
    channelId?: string;
    allThreadsRelatedToChannelId?: string;
    commentThreadId?: string;
    maxResults?: number;
    pageToken?: string;
    order?: string;
    searchTerms?: string;
    moderationStatus?: string;
  }): Promise<YouTubeListResponse<YouTubeCommentThread>> {
    return await this.request('list comment threads', () =>
      this.axios.get('/commentThreads', {
        params: this.withAuthParams({
          part: params.part.join(','),
          videoId: params.videoId,
          channelId: params.channelId,
          allThreadsRelatedToChannelId: params.allThreadsRelatedToChannelId,
          id: params.commentThreadId,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          order: params.order,
          searchTerms: params.searchTerms,
          moderationStatus: params.moderationStatus
        })
      })
    );
  }

  async createCommentThread(params: {
    part: string[];
    videoId: string;
    channelId: string;
    text: string;
  }): Promise<YouTubeCommentThread> {
    let body = {
      snippet: {
        videoId: params.videoId,
        channelId: params.channelId,
        topLevelComment: {
          snippet: {
            textOriginal: params.text
          }
        }
      }
    };

    return await this.request('create comment thread', () =>
      this.axios.post('/commentThreads', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  // --- Comments ---

  async listComments(params: {
    part: string[];
    parentId: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeListResponse<YouTubeComment>> {
    return await this.request('list comments', () =>
      this.axios.get('/comments', {
        params: this.withAuthParams({
          part: params.part.join(','),
          parentId: params.parentId,
          maxResults: params.maxResults,
          pageToken: params.pageToken
        })
      })
    );
  }

  async createComment(params: {
    part: string[];
    parentId: string;
    text: string;
  }): Promise<YouTubeComment> {
    let body = {
      snippet: {
        parentId: params.parentId,
        textOriginal: params.text
      }
    };

    return await this.request('create comment', () =>
      this.axios.post('/comments', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async updateComment(params: {
    part: string[];
    commentId: string;
    text: string;
  }): Promise<YouTubeComment> {
    let body = {
      id: params.commentId,
      snippet: {
        textOriginal: params.text
      }
    };

    return await this.request('update comment', () =>
      this.axios.put('/comments', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.request('delete comment', () =>
      this.axios.delete('/comments', {
        params: this.withAuthParams({ id: commentId })
      })
    );
  }

  async setCommentModerationStatus(params: {
    commentIds: string[];
    moderationStatus: string;
    banAuthor?: boolean;
  }): Promise<void> {
    await this.request('set comment moderation status', () =>
      this.axios.post('/comments/setModerationStatus', null, {
        params: this.withAuthParams({
          id: params.commentIds.join(','),
          moderationStatus: params.moderationStatus,
          banAuthor: params.banAuthor
        })
      })
    );
  }

  // --- Subscriptions ---

  async listSubscriptions(params: {
    part: string[];
    mine?: boolean;
    channelId?: string;
    forChannelId?: string;
    subscriptionId?: string;
    maxResults?: number;
    pageToken?: string;
    order?: string;
  }): Promise<YouTubeListResponse<YouTubeSubscription>> {
    return await this.request('list subscriptions', () =>
      this.axios.get('/subscriptions', {
        params: this.withAuthParams({
          part: params.part.join(','),
          mine: params.mine,
          channelId: params.channelId,
          forChannelId: params.forChannelId,
          id: params.subscriptionId,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          order: params.order
        })
      })
    );
  }

  async createSubscription(params: {
    part: string[];
    channelId: string;
  }): Promise<YouTubeSubscription> {
    let body = {
      snippet: {
        resourceId: {
          kind: 'youtube#channel',
          channelId: params.channelId
        }
      }
    };

    return await this.request('create subscription', () =>
      this.axios.post('/subscriptions', body, {
        params: this.withAuthParams({
          part: params.part.join(',')
        })
      })
    );
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.request('delete subscription', () =>
      this.axios.delete('/subscriptions', {
        params: this.withAuthParams({ id: subscriptionId })
      })
    );
  }

  // --- Captions ---

  async listCaptions(params: {
    part: string[];
    videoId: string;
  }): Promise<YouTubeListResponse<YouTubeCaption>> {
    return await this.request('list captions', () =>
      this.axios.get('/captions', {
        params: this.withAuthParams({
          part: params.part.join(','),
          videoId: params.videoId
        })
      })
    );
  }

  async deleteCaption(captionId: string): Promise<void> {
    await this.request('delete caption', () =>
      this.axios.delete('/captions', {
        params: this.withAuthParams({ id: captionId })
      })
    );
  }

  async downloadCaption(params: {
    captionId: string;
    format?: 'sbv' | 'scc' | 'srt' | 'ttml' | 'vtt';
    language?: string;
  }): Promise<{ content: Buffer; mimeType: string }> {
    this.requireOAuth('Downloading captions');
    let response: AxiosResponse<ArrayBuffer>;
    try {
      response = await this.axios.get(`/captions/${encodeURIComponent(params.captionId)}`, {
        params: {
          tfmt: params.format,
          tlang: params.language
        },
        responseType: 'arraybuffer'
      });
    } catch (error) {
      throw youtubeApiError(error, 'download caption');
    }

    let content = Buffer.from(response.data);
    let mimeType =
      getHeaderValue(response.headers, 'content-type') ?? 'application/octet-stream';
    return { content, mimeType: mimeType.split(';')[0]!.trim() };
  }

  // --- Activities ---

  async listActivities(params: {
    part: string[];
    channelId?: string;
    mine?: boolean;
    maxResults?: number;
    pageToken?: string;
    publishedAfter?: string;
    publishedBefore?: string;
  }): Promise<YouTubeListResponse<YouTubeActivity>> {
    return await this.request('list activities', () =>
      this.axios.get('/activities', {
        params: this.withAuthParams({
          part: params.part.join(','),
          channelId: params.channelId,
          mine: params.mine,
          maxResults: params.maxResults,
          pageToken: params.pageToken,
          publishedAfter: params.publishedAfter,
          publishedBefore: params.publishedBefore
        })
      })
    );
  }

  // --- Video Categories ---

  async listVideoCategories(params: {
    part: string[];
    regionCode?: string;
    videoCategoryId?: string;
    hl?: string;
  }): Promise<
    YouTubeListResponse<{
      id: string;
      snippet: { channelId: string; title: string; assignable: boolean };
    }>
  > {
    return await this.request('list video categories', () =>
      this.axios.get('/videoCategories', {
        params: this.withAuthParams({
          part: params.part.join(','),
          regionCode: params.regionCode,
          id: params.videoCategoryId,
          hl: params.hl
        })
      })
    );
  }

  // --- i18n ---

  async listRegions(params: {
    part: string[];
    hl?: string;
  }): Promise<YouTubeListResponse<{ id: string; snippet: { gl: string; name: string } }>> {
    return await this.request('list i18n regions', () =>
      this.axios.get('/i18nRegions', {
        params: this.withAuthParams({
          part: params.part.join(','),
          hl: params.hl
        })
      })
    );
  }

  async listLanguages(params: {
    part: string[];
    hl?: string;
  }): Promise<YouTubeListResponse<{ id: string; snippet: { hl: string; name: string } }>> {
    return await this.request('list i18n languages', () =>
      this.axios.get('/i18nLanguages', {
        params: this.withAuthParams({
          part: params.part.join(','),
          hl: params.hl
        })
      })
    );
  }
}
