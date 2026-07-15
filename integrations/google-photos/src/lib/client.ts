import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue
} from 'slates';

let PHOTOS_LIBRARY_BASE_URL = 'https://photoslibrary.googleapis.com/v1';
let PHOTOS_PICKER_BASE_URL = 'https://photospicker.googleapis.com/v1';
let PHOTOS_UPLOAD_URL = `${PHOTOS_LIBRARY_BASE_URL}/uploads`;
export let MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES = 50 * 1024 * 1024;

let PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
let GIF87A_SIGNATURE = Buffer.from('GIF87a', 'ascii');
let GIF89A_SIGNATURE = Buffer.from('GIF89a', 'ascii');
let RIFF_SIGNATURE = Buffer.from('RIFF', 'ascii');
let WEBP_SIGNATURE = Buffer.from('WEBP', 'ascii');
let AVI_SIGNATURE = Buffer.from('AVI ', 'ascii');
let ISO_BASE_MEDIA_FILE_SIGNATURE = Buffer.from('ftyp', 'ascii');
let EBML_SIGNATURE = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

export interface AlbumResponse {
  id: string;
  title: string;
  productUrl?: string;
  isWriteable?: boolean;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

export interface MediaItemResponse {
  id: string;
  description?: string;
  productUrl?: string;
  baseUrl?: string;
  mimeType?: string;
  filename?: string;
  mediaMetadata?: {
    creationTime?: string;
    width?: string;
    height?: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
      exposureTime?: string;
    };
    video?: {
      cameraMake?: string;
      cameraModel?: string;
      fps?: number;
      status?: string;
    };
  };
}

export interface MediaItemDownload {
  mediaItemId: string;
  filename?: string;
  mimeType: string;
  mediaType: 'photo' | 'video';
  content: Buffer;
}

let mediaMimeTypePattern = /^(image|video)\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*$/;

let startsWith = (content: Buffer, signature: Buffer, offset = 0) =>
  content.length >= offset + signature.length &&
  content.subarray(offset, offset + signature.length).equals(signature);

let hasKnownMediaSignature = (mimeType: string, content: Buffer) => {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return startsWith(content, JPEG_SIGNATURE);
    case 'image/png':
      return startsWith(content, PNG_SIGNATURE);
    case 'image/gif':
      return startsWith(content, GIF87A_SIGNATURE) || startsWith(content, GIF89A_SIGNATURE);
    case 'image/webp':
      return startsWith(content, RIFF_SIGNATURE) && startsWith(content, WEBP_SIGNATURE, 8);
    case 'image/avif':
    case 'image/heic':
    case 'image/heif':
    case 'video/mp4':
    case 'video/quicktime':
    case 'video/x-m4v':
    case 'video/3gpp':
    case 'video/3gpp2':
      return startsWith(content, ISO_BASE_MEDIA_FILE_SIGNATURE, 4);
    case 'video/avi':
    case 'video/x-msvideo':
      return startsWith(content, RIFF_SIGNATURE) && startsWith(content, AVI_SIGNATURE, 8);
    case 'video/webm':
    case 'video/x-matroska':
      return startsWith(content, EBML_SIGNATURE);
    default:
      // Google Photos also supports RAW image and legacy video formats whose
      // signatures are not uniform. Keep those downloadable after the trusted-host
      // and MIME-family checks, while validating common formats strictly.
      return true;
  }
};

let binaryResponseToBuffer = (value: unknown): Buffer | undefined => {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return undefined;
};

export interface DateFilter {
  dates?: Array<{ year?: number; month?: number; day?: number }>;
  ranges?: Array<{
    startDate: { year?: number; month?: number; day?: number };
    endDate: { year?: number; month?: number; day?: number };
  }>;
}

export interface ContentFilter {
  includedContentCategories?: string[];
  excludedContentCategories?: string[];
}

export interface MediaTypeFilter {
  mediaTypes?: string[];
}

export interface SearchFilters {
  dateFilter?: DateFilter;
  contentFilter?: ContentFilter;
  mediaTypeFilter?: MediaTypeFilter;
  featureFilter?: { includedFeatures?: string[] };
  includeArchivedMedia?: boolean;
  excludeNonAppCreatedData?: boolean;
}

export interface EnrichmentItem {
  textEnrichment?: { text: string };
  locationEnrichment?: {
    location: {
      locationName: string;
      latlng?: { latitude: number; longitude: number };
    };
  };
  mapEnrichment?: {
    origin: {
      locationName: string;
      latlng?: { latitude: number; longitude: number };
    };
    destination: {
      locationName: string;
      latlng?: { latitude: number; longitude: number };
    };
  };
}

export class GooglePhotosLibraryClient {
  private axios: ReturnType<typeof createAxios>;
  private downloadAxios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: PHOTOS_LIBRARY_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    // Library API base URLs do not need OAuth. Keep their requester separate so the
    // bearer token can never be forwarded to the temporary media URL or its host.
    this.downloadAxios = createAxios();
  }

  // --- Albums ---

  async createAlbum(title: string): Promise<AlbumResponse> {
    let response = await this.axios.post('/albums', {
      album: { title }
    });
    return response.data;
  }

  async getAlbum(albumId: string): Promise<AlbumResponse> {
    let response = await this.axios.get(`/albums/${albumId}`);
    return response.data;
  }

  async listAlbums(params?: {
    pageSize?: number;
    pageToken?: string;
    excludeNonAppCreatedData?: boolean;
  }): Promise<{ albums: AlbumResponse[]; nextPageToken?: string }> {
    let response = await this.axios.get('/albums', { params });
    return {
      albums: response.data.albums || [],
      nextPageToken: response.data.nextPageToken
    };
  }

  async updateAlbum(
    albumId: string,
    updates: { title?: string; coverPhotoMediaItemId?: string }
  ): Promise<AlbumResponse> {
    let updateMaskFields: string[] = [];
    let albumBody: Record<string, string> = { id: albumId };

    if (updates.title !== undefined) {
      updateMaskFields.push('title');
      albumBody.title = updates.title;
    }
    if (updates.coverPhotoMediaItemId !== undefined) {
      updateMaskFields.push('coverPhotoMediaItemId');
      albumBody.coverPhotoMediaItemId = updates.coverPhotoMediaItemId;
    }

    let response = await this.axios.patch(`/albums/${albumId}`, albumBody, {
      params: { updateMask: updateMaskFields.join(',') }
    });
    return response.data;
  }

  async addMediaItemsToAlbum(albumId: string, mediaItemIds: string[]): Promise<void> {
    await this.axios.post(`/albums/${albumId}:batchAddMediaItems`, {
      mediaItemIds
    });
  }

  async removeMediaItemsFromAlbum(albumId: string, mediaItemIds: string[]): Promise<void> {
    await this.axios.post(`/albums/${albumId}:batchRemoveMediaItems`, {
      mediaItemIds
    });
  }

  async addEnrichmentToAlbum(
    albumId: string,
    enrichment: EnrichmentItem,
    albumPosition?: {
      position?: string;
      relativeMediaItemId?: string;
      relativeEnrichmentItemId?: string;
    }
  ): Promise<{ enrichmentItem: { id: string } }> {
    let response = await this.axios.post(`/albums/${albumId}:addEnrichment`, {
      newEnrichmentItem: enrichment,
      albumPosition: albumPosition || { position: 'LAST_IN_ALBUM' }
    });
    return response.data;
  }

  // --- Media Items ---

  async getMediaItem(mediaItemId: string): Promise<MediaItemResponse> {
    let response = await this.axios.get(`/mediaItems/${encodeURIComponent(mediaItemId)}`);
    return response.data;
  }

  async downloadMediaItem(mediaItemId: string): Promise<MediaItemDownload> {
    let mediaItem: MediaItemResponse;
    try {
      mediaItem = await this.getMediaItem(mediaItemId);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Photos',
        operation: 'retrieve media item for download',
        reason: 'google_photos_media_item_api_error',
        nestedKeys: ['error', 'errors']
      });
    }

    if (
      !mediaItem ||
      typeof mediaItem.id !== 'string' ||
      mediaItem.id.length === 0 ||
      mediaItem.id !== mediaItemId
    ) {
      throw createApiServiceError(
        'Google Photos returned invalid media item metadata. Retry the download.',
        { reason: 'google_photos_media_item_invalid' }
      );
    }

    let declaredMimeType =
      typeof mediaItem.mimeType === 'string' ? mediaItem.mimeType.trim().toLowerCase() : '';
    let mimeTypeMatch = mediaMimeTypePattern.exec(declaredMimeType);
    if (!mimeTypeMatch) {
      throw createApiServiceError(
        'Google Photos returned a media item without a valid image or video MIME type.',
        { reason: 'google_photos_media_item_mime_type_invalid' }
      );
    }

    let mediaType: 'photo' | 'video' = mimeTypeMatch[1] === 'video' ? 'video' : 'photo';
    if (mediaType === 'video') {
      let videoMetadata = mediaItem.mediaMetadata?.video;
      if (!videoMetadata) {
        throw createApiServiceError(
          'Google Photos did not include video metadata for this media item, so its processing status cannot be verified.',
          { reason: 'google_photos_video_metadata_unavailable' }
        );
      }
      if (videoMetadata.status !== 'READY') {
        throw createApiServiceError(
          'This Google Photos video is not ready to download yet. Wait for processing to finish and retry.',
          { reason: 'google_photos_video_not_ready' }
        );
      }
    }

    let baseUrl = typeof mediaItem.baseUrl === 'string' ? mediaItem.baseUrl.trim() : '';
    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      throw createApiServiceError(
        'Google Photos returned an invalid media base URL. Retry the download to request a fresh URL.',
        { reason: 'google_photos_media_base_url_invalid' }
      );
    }
    if (
      parsedBaseUrl.protocol !== 'https:' ||
      parsedBaseUrl.username.length > 0 ||
      parsedBaseUrl.password.length > 0 ||
      parsedBaseUrl.port.length > 0 ||
      parsedBaseUrl.search.length > 0 ||
      parsedBaseUrl.hash.length > 0 ||
      !parsedBaseUrl.hostname.toLowerCase().endsWith('.googleusercontent.com')
    ) {
      throw createApiServiceError(
        'Google Photos returned an unsafe media base URL, so no download was attempted.',
        { reason: 'google_photos_media_base_url_invalid' }
      );
    }

    let downloadResponse: any;
    try {
      downloadResponse = await this.downloadAxios.get(
        `${parsedBaseUrl.toString()}=${mediaType === 'video' ? 'dv' : 'd'}`,
        {
          responseType: 'arraybuffer',
          maxRedirects: 0,
          maxBodyLength: MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES,
          maxContentLength: MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES
        }
      );
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Photos',
        operation: 'download media item bytes',
        reason: 'google_photos_media_download_error',
        nestedKeys: ['error', 'errors']
      });
    }

    let declaredContentLength = getResponseHeaderValue(
      downloadResponse?.headers,
      'content-length'
    );
    if (/^\d+$/.test(declaredContentLength ?? '')) {
      let contentLength = Number(declaredContentLength);
      if (contentLength > MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES) {
        throw createApiServiceError(
          `Google Photos returned media larger than the ${MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES}-byte attachment limit.`,
          { reason: 'google_photos_media_content_too_large' }
        );
      }
    }

    let content = binaryResponseToBuffer(downloadResponse?.data);
    if (!content || content.length === 0) {
      throw createApiServiceError(
        'Google Photos returned an empty or invalid media download response.',
        { reason: 'google_photos_media_content_invalid' }
      );
    }
    if (content.length > MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES) {
      throw createApiServiceError(
        `Google Photos returned media larger than the ${MAX_GOOGLE_PHOTOS_DOWNLOAD_BYTES}-byte attachment limit.`,
        { reason: 'google_photos_media_content_too_large' }
      );
    }

    let downloadedMimeType = getResponseHeaderValue(downloadResponse.headers, 'content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    let downloadedMimeTypeMatch = downloadedMimeType
      ? mediaMimeTypePattern.exec(downloadedMimeType)
      : null;
    let expectedMimeFamily = mediaType === 'video' ? 'video' : 'image';
    if (
      !downloadedMimeType ||
      !downloadedMimeTypeMatch ||
      downloadedMimeTypeMatch[1] !== expectedMimeFamily
    ) {
      throw createApiServiceError(
        downloadedMimeType
          ? `Google Photos returned downloaded content with unexpected MIME type "${downloadedMimeType}".`
          : 'Google Photos returned downloaded content without an image or video MIME type.',
        { reason: 'google_photos_media_download_mime_type_invalid' }
      );
    }
    if (!hasKnownMediaSignature(downloadedMimeType, content)) {
      throw createApiServiceError(
        `Google Photos returned content that does not match the ${downloadedMimeType} file signature.`,
        { reason: 'google_photos_media_content_invalid' }
      );
    }

    return {
      mediaItemId: mediaItem.id,
      filename: mediaItem.filename,
      mimeType: downloadedMimeType,
      mediaType,
      content
    };
  }

  async batchGetMediaItems(
    mediaItemIds: string[]
  ): Promise<{ mediaItemResults: Array<{ mediaItem: MediaItemResponse; status?: any }> }> {
    let response = await this.axios.get('/mediaItems:batchGet', {
      params: { mediaItemIds }
    });
    return response.data;
  }

  async listMediaItems(params?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<{ mediaItems: MediaItemResponse[]; nextPageToken?: string }> {
    let response = await this.axios.get('/mediaItems', { params });
    return {
      mediaItems: response.data.mediaItems || [],
      nextPageToken: response.data.nextPageToken
    };
  }

  async searchMediaItems(params: {
    albumId?: string;
    pageSize?: number;
    pageToken?: string;
    filters?: SearchFilters;
    orderBy?: string;
  }): Promise<{ mediaItems: MediaItemResponse[]; nextPageToken?: string }> {
    let response = await this.axios.post('/mediaItems:search', params);
    return {
      mediaItems: response.data.mediaItems || [],
      nextPageToken: response.data.nextPageToken
    };
  }

  async updateMediaItem(mediaItemId: string, description: string): Promise<MediaItemResponse> {
    let response = await this.axios.patch(
      `/mediaItems/${mediaItemId}`,
      { description },
      { params: { updateMask: 'description' } }
    );
    return response.data;
  }

  // --- Upload ---

  async uploadBytes(
    fileContent: string | Uint8Array | ArrayBuffer,
    mimeType: string
  ): Promise<string> {
    let response = await this.axios.post(PHOTOS_UPLOAD_URL, fileContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-Content-Type': mimeType,
        'X-Goog-Upload-Protocol': 'raw'
      },
      baseURL: ''
    });
    if (typeof response.data === 'string') {
      return response.data.trim();
    }

    throw new Error('Google Photos uploads endpoint did not return a string upload token.');
  }

  async createMediaItems(
    items: Array<{
      description?: string;
      fileName: string;
      uploadToken: string;
    }>,
    albumId?: string
  ): Promise<{
    newMediaItemResults: Array<{
      uploadToken: string;
      status: { message: string };
      mediaItem?: MediaItemResponse;
    }>;
  }> {
    let body: Record<string, any> = {
      newMediaItems: items.map(item => ({
        description: item.description || '',
        simpleMediaItem: {
          fileName: item.fileName,
          uploadToken: item.uploadToken
        }
      }))
    };

    if (albumId) {
      body.albumId = albumId;
    }

    let response = await this.axios.post('/mediaItems:batchCreate', body);
    return response.data;
  }
}

export class GooglePhotosPickerClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: PHOTOS_PICKER_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async createSession(maxItemCount?: number): Promise<{
    id: string;
    pickerUri: string;
    pollingConfig?: {
      pollInterval?: string;
      timeoutIn?: string;
    };
    expireTime?: string;
    mediaItemsSet?: boolean;
  }> {
    let body: Record<string, any> = {};
    if (maxItemCount !== undefined) {
      body.pickingConfig = { maxItemCount };
    }
    let response = await this.axios.post('/sessions', body);
    return response.data;
  }

  async getSession(sessionId: string): Promise<{
    id: string;
    pickerUri: string;
    pollingConfig?: {
      pollInterval?: string;
      timeoutIn?: string;
    };
    expireTime?: string;
    mediaItemsSet?: boolean;
  }> {
    let response = await this.axios.get(`/sessions/${sessionId}`);
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.axios.delete(`/sessions/${sessionId}`);
  }

  async listPickedMediaItems(
    sessionId: string,
    params?: { pageSize?: number; pageToken?: string }
  ): Promise<{
    mediaItems: Array<{
      id: string;
      type?: string;
      mediaFile?: {
        baseUrl?: string;
        mimeType?: string;
        filename?: string;
        mediaFileMetadata?: {
          width?: number;
          height?: number;
          cameraMake?: string;
          cameraModel?: string;
          creationTime?: string;
          photoMetadata?: Record<string, any>;
          videoMetadata?: Record<string, any>;
        };
      };
    }>;
    nextPageToken?: string;
  }> {
    let response = await this.axios.get('/mediaItems', {
      params: {
        sessionId,
        ...params
      }
    });
    return {
      mediaItems: response.data.mediaItems || [],
      nextPageToken: response.data.nextPageToken
    };
  }
}
