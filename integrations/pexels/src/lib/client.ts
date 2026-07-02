import { createAxios } from 'slates';

let photosAxios = createAxios({
  baseURL: 'https://api.pexels.com/v1'
});

let videosAxios = createAxios({
  baseURL: 'https://api.pexels.com/videos'
});

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

let mapPhoto = (raw: any) => ({
  photoId: raw.id,
  width: raw.width,
  height: raw.height,
  url: raw.url,
  photographer: raw.photographer,
  photographerUrl: raw.photographer_url,
  photographerId: raw.photographer_id,
  avgColor: raw.avg_color,
  src: raw.src,
  alt: raw.alt,
  liked: raw.liked
});

let mapVideoFile = (raw: any) => ({
  fileId: raw.id,
  quality: raw.quality,
  fileType: raw.file_type,
  width: raw.width ?? 0,
  height: raw.height ?? 0,
  fps: raw.fps,
  link: raw.link
});

let mapVideoPicture = (raw: any) => ({
  pictureId: raw.id,
  picture: raw.picture,
  nr: raw.nr
});

let mapVideo = (raw: any) => ({
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
  videoFiles: (raw.video_files ?? []).map(mapVideoFile),
  videoPictures: (raw.video_pictures ?? []).map(mapVideoPicture)
});

let mapCollection = (raw: any) => ({
  collectionId: raw.id,
  title: raw.title,
  description: raw.description,
  isPrivate: raw.private,
  mediaCount: raw.media_count,
  photosCount: raw.photos_count,
  videosCount: raw.videos_count
});

let mapPagination = (raw: any) => ({
  page: raw.page,
  perPage: raw.per_page,
  totalResults: raw.total_results,
  nextPage: raw.next_page,
  prevPage: raw.prev_page
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private authHeaders() {
    return { Authorization: this.token };
  }

  async searchPhotos(params: PhotoSearchParams) {
    let response = await photosAxios.get('/search', {
      headers: this.authHeaders(),
      params: {
        query: params.query,
        orientation: params.orientation,
        size: params.size,
        color: params.color,
        locale: params.locale,
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    return {
      photos: (data.photos ?? []).map(mapPhoto),
      pagination: mapPagination(data)
    };
  }

  async getCuratedPhotos(params: PaginationParams = {}) {
    let response = await photosAxios.get('/curated', {
      headers: this.authHeaders(),
      params: {
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    return {
      photos: (data.photos ?? []).map(mapPhoto),
      pagination: mapPagination(data)
    };
  }

  async getPhoto(photoId: number) {
    let response = await photosAxios.get(`/photos/${photoId}`, {
      headers: this.authHeaders()
    });

    return mapPhoto(response.data);
  }

  async searchVideos(params: VideoSearchParams) {
    let response = await videosAxios.get('/search', {
      headers: this.authHeaders(),
      params: {
        query: params.query,
        orientation: params.orientation,
        size: params.size,
        locale: params.locale,
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    return {
      videos: (data.videos ?? []).map(mapVideo),
      pagination: mapPagination(data)
    };
  }

  async getPopularVideos(params: PopularVideosParams = {}) {
    let response = await videosAxios.get('/popular', {
      headers: this.authHeaders(),
      params: {
        min_width: params.minWidth,
        min_height: params.minHeight,
        min_duration: params.minDuration,
        max_duration: params.maxDuration,
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    return {
      videos: (data.videos ?? []).map(mapVideo),
      pagination: mapPagination(data)
    };
  }

  async getVideo(videoId: number) {
    let response = await videosAxios.get(`/videos/${videoId}`, {
      headers: this.authHeaders()
    });

    return mapVideo(response.data);
  }

  async getFeaturedCollections(params: PaginationParams = {}) {
    let response = await photosAxios.get('/collections/featured', {
      headers: this.authHeaders(),
      params: {
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    return {
      collections: (data.collections ?? []).map(mapCollection),
      pagination: mapPagination(data)
    };
  }

  async getMyCollections(params: PaginationParams = {}) {
    let response = await photosAxios.get('/collections', {
      headers: this.authHeaders(),
      params: {
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    return {
      collections: (data.collections ?? []).map(mapCollection),
      pagination: mapPagination(data)
    };
  }

  async getCollectionMedia(collectionId: string, params: CollectionMediaParams = {}) {
    let response = await photosAxios.get(`/collections/${collectionId}`, {
      headers: this.authHeaders(),
      params: {
        type: params.type,
        sort: params.sort,
        page: params.page,
        per_page: params.perPage
      }
    });

    let data = response.data;
    let media = (data.media ?? []).map((item: any) => {
      if (item.type === 'Video') {
        return { type: 'video' as const, video: mapVideo(item) };
      }
      return { type: 'photo' as const, photo: mapPhoto(item) };
    });

    return {
      collectionId: data.id,
      media,
      pagination: mapPagination(data)
    };
  }
}
