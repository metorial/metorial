import { createAxios } from 'slates';

export interface UploadImageParams {
  image: string;
  name?: string;
  expiration?: number;
}

export interface ImageVariant {
  filename: string;
  name: string;
  mime: string;
  extension: string;
  url: string;
}

export interface ImageData {
  id: string;
  title: string;
  url_viewer: string;
  url: string;
  display_url: string;
  width: number;
  height: number;
  size: number;
  time: number;
  expiration: number;
  image: ImageVariant;
  thumb: ImageVariant;
  medium?: ImageVariant;
  delete_url: string;
}

export interface ImgBBResponse {
  data: ImageData;
  success: boolean;
  status: number;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async uploadImage(params: UploadImageParams): Promise<ImageData> {
    let httpClient = createAxios({
      baseURL: 'https://api.imgbb.com/1'
    });

    let formData = new FormData();
    formData.append('image', params.image);

    if (params.name) {
      formData.append('name', params.name);
    }

    if (params.expiration !== undefined) {
      formData.append('expiration', String(params.expiration));
    }

    let response = await httpClient.post<ImgBBResponse>('/upload', formData, {
      params: {
        key: this.token
      }
    });

    return response.data.data;
  }
}
