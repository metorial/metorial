import { createAxios } from 'slates';

let PHOTOS_LIBRARY_BASE_URL = 'https://photoslibrary.googleapis.com/v1';
let PHOTOS_PICKER_BASE_URL = 'https://photospicker.googleapis.com/v1';
let PHOTOS_UPLOAD_URL = `${PHOTOS_LIBRARY_BASE_URL}/uploads`;

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

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: PHOTOS_LIBRARY_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
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
    let response = await this.axios.get(`/mediaItems/${mediaItemId}`);
    return response.data;
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
