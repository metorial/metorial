import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

interface PaginationParams {
  page?: number;
  perPage?: number;
}

interface PhotoSearchParams extends PaginationParams {
  query: string;
  orientation?: string;
  size?: string;
  color?: string;
  locale?: string;
}

interface VideoSearchParams extends PaginationParams {
  query: string;
  orientation?: string;
  size?: string;
  locale?: string;
}

interface PopularVideosParams extends PaginationParams {
  minWidth?: number;
  minHeight?: number;
  minDuration?: number;
  maxDuration?: number;
}

interface CollectionMediaParams extends PaginationParams {
  type?: string;
  sort?: string;
}

interface Photo {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string | null;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string | null;
  liked?: boolean;
}

interface VideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number | null;
  height: number | null;
  fps?: number | null;
  link: string;
}

interface Video {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: { id: number; name: string; url: string };
  video_files: VideoFile[];
  video_pictures: { id: number; picture: string; nr: number }[];
}

interface Collection {
  id: string;
  title: string;
  description?: string | null;
  private: boolean;
  media_count: number;
  photos_count: number;
  videos_count: number;
}

interface Pagination<Total = number> {
  page: number;
  per_page: number;
  total_results: Total;
  next_page?: string;
  prev_page?: string;
}

type PhotoPage<Total = number> = Pagination<Total> & { photos: Photo[] };
type VideoPage = Pagination & { videos: Video[] };
type CollectionPage = Pagination & { collections: Collection[] };
type CollectionMediaPage = Pagination & {
  id: string;
  media: ((Photo & { type: 'Photo' }) | (Video & { type: 'Video' }))[];
};

let mapPhoto = (raw: Photo) => ({
  photoId: raw.id,
  width: raw.width,
  height: raw.height,
  url: raw.url,
  photographer: raw.photographer,
  photographerUrl: raw.photographer_url,
  photographerId: raw.photographer_id,
  avgColor: raw.avg_color ?? undefined,
  src: raw.src,
  alt: raw.alt ?? undefined,
  liked: raw.liked,
  raw: { ...raw }
});

let mapVideoFile = (raw: VideoFile) => ({
  fileId: raw.id,
  quality: raw.quality,
  fileType: raw.file_type,
  width: raw.width ?? undefined,
  height: raw.height ?? undefined,
  fps: raw.fps ?? undefined,
  link: raw.link,
  raw: { ...raw }
});

let mapVideo = (raw: Video) => ({
  videoId: raw.id,
  width: raw.width,
  height: raw.height,
  url: raw.url,
  image: raw.image,
  duration: raw.duration,
  user: {
    userId: raw.user.id,
    name: raw.user.name,
    url: raw.user.url
  },
  videoFiles: raw.video_files.map(mapVideoFile),
  videoPictures: raw.video_pictures.map(picture => ({
    pictureId: picture.id,
    picture: picture.picture,
    nr: picture.nr
  })),
  raw: { ...raw }
});

let mapCollection = (raw: Collection) => ({
  collectionId: raw.id,
  title: raw.title,
  description: raw.description ?? undefined,
  isPrivate: raw.private,
  mediaCount: raw.media_count,
  photosCount: raw.photos_count,
  videosCount: raw.videos_count,
  raw: { ...raw }
});

let mapPagination = <Total>(raw: Pagination<Total>) => ({
  page: raw.page,
  perPage: raw.per_page,
  totalResults: raw.total_results,
  nextPage: raw.next_page,
  prevPage: raw.prev_page
});

let validatePagination = (params: PaginationParams) => {
  if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
    throw createApiServiceError('page must be a positive whole number.');
  }
  if (
    params.perPage !== undefined &&
    (!Number.isInteger(params.perPage) || params.perPage < 1 || params.perPage > 80)
  ) {
    throw createApiServiceError('perPage must be a whole number between 1 and 80.');
  }
};

let validateQuery = (query: string) => {
  if (!query.trim()) throw createApiServiceError('Provide a non-empty search query.');
};

let validateMediaId = (id: number, field: string) => {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw createApiServiceError(`${field} must be a positive whole-number Pexels ID.`);
  }
};

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token.trim()) throw createApiServiceError('Provide a Pexels API key.');
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.pexels.com',
      authHeader: { value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Pexels',
          reason: 'pexels_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
        })
    });
  }

  private async get<T>(path: string, params?: Record<string, string | number | undefined>) {
    let response = await this.api.get<T>(path, { params });
    if (isApiErrorRecord(response.data) && typeof response.data.error === 'string') {
      throw buildApiServiceError(
        { response: { status: response.status, data: response.data } },
        { providerLabel: 'Pexels', reason: 'pexels_api_error' }
      );
    }
    return response.data;
  }

  async searchPhotos(params: PhotoSearchParams) {
    validatePagination(params);
    validateQuery(params.query);
    let data = await this.get<PhotoPage>('/v1/search', {
      query: params.query,
      orientation: params.orientation,
      size: params.size,
      color: params.color,
      locale: params.locale,
      page: params.page,
      per_page: params.perPage
    });
    return { photos: data.photos.map(mapPhoto), pagination: mapPagination(data) };
  }

  async getCuratedPhotos(params: PaginationParams = {}) {
    validatePagination(params);
    let data = await this.get<PhotoPage<number | undefined>>('/v1/curated', {
      page: params.page,
      per_page: params.perPage
    });
    return { photos: data.photos.map(mapPhoto), pagination: mapPagination(data) };
  }

  async getPhoto(photoId: number) {
    validateMediaId(photoId, 'photoId');
    return mapPhoto(await this.get<Photo>(`/v1/photos/${photoId}`));
  }

  async searchVideos(params: VideoSearchParams) {
    validatePagination(params);
    validateQuery(params.query);
    let data = await this.get<VideoPage>('/videos/search', {
      query: params.query,
      orientation: params.orientation,
      size: params.size,
      locale: params.locale,
      page: params.page,
      per_page: params.perPage
    });
    return { videos: data.videos.map(mapVideo), pagination: mapPagination(data) };
  }

  async getPopularVideos(params: PopularVideosParams = {}) {
    validatePagination(params);
    for (let field of ['minWidth', 'minHeight', 'minDuration', 'maxDuration'] as const) {
      let value = params[field];
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw createApiServiceError(`${field} must be a non-negative whole number.`);
      }
    }
    if (
      params.minDuration !== undefined &&
      params.maxDuration !== undefined &&
      params.minDuration > params.maxDuration
    ) {
      throw createApiServiceError('minDuration must not exceed maxDuration.');
    }
    let data = await this.get<VideoPage>('/videos/popular', {
      min_width: params.minWidth,
      min_height: params.minHeight,
      min_duration: params.minDuration,
      max_duration: params.maxDuration,
      page: params.page,
      per_page: params.perPage
    });
    return { videos: data.videos.map(mapVideo), pagination: mapPagination(data) };
  }

  async getVideo(videoId: number) {
    validateMediaId(videoId, 'videoId');
    return mapVideo(await this.get<Video>(`/videos/videos/${videoId}`));
  }

  async getFeaturedCollections(params: PaginationParams = {}) {
    validatePagination(params);
    let data = await this.get<CollectionPage>('/v1/collections/featured', {
      page: params.page,
      per_page: params.perPage
    });
    return {
      collections: data.collections.map(mapCollection),
      pagination: mapPagination(data)
    };
  }

  async getMyCollections(params: PaginationParams = {}) {
    validatePagination(params);
    let data = await this.get<CollectionPage>('/v1/collections', {
      page: params.page,
      per_page: params.perPage
    });
    return {
      collections: data.collections.map(mapCollection),
      pagination: mapPagination(data)
    };
  }

  async getCollectionMedia(collectionId: string, params: CollectionMediaParams = {}) {
    validatePagination(params);
    if (!collectionId.trim()) throw createApiServiceError('Provide a collection ID.');
    let data = await this.get<CollectionMediaPage>(
      `/v1/collections/${encodeURIComponent(collectionId)}`,
      {
        type: params.type,
        sort: params.sort,
        page: params.page,
        per_page: params.perPage
      }
    );
    let media = data.media.map(item => {
      if (item.type === 'Video') {
        return { type: 'video' as const, video: mapVideo(item) };
      }
      return { type: 'photo' as const, photo: mapPhoto(item) };
    });
    return { collectionId: data.id, media, pagination: mapPagination(data) };
  }
}
