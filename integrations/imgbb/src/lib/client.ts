import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getBase64ByteLength,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export interface UploadImageParams {
  image: string;
  name?: string;
  expiration?: number;
}

// ImgBB's documented response encodes these values as decimal strings.
let responseNumber = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().nonnegative());
let imageVariant = z.object({
  filename: z.string().min(1),
  name: z.string(),
  mime: z.string().min(1),
  extension: z.string(),
  url: z.url({ protocol: /^https?$/ })
});
let imageData = z.object({
  id: z.string().min(1),
  title: z.string(),
  url_viewer: z.url({ protocol: /^https?$/ }),
  url: z.url({ protocol: /^https?$/ }),
  display_url: z.url({ protocol: /^https?$/ }),
  width: responseNumber,
  height: responseNumber,
  size: responseNumber,
  expiration: responseNumber,
  image: imageVariant,
  thumb: imageVariant,
  medium: imageVariant.optional(),
  delete_url: z.url({ protocol: /^https?$/ })
});

export type ImageData = z.infer<typeof imageData>;

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Reconnect with your ImgBB API key.', {
        reason: 'imgbb_missing_api_key'
      });
    }
    this.token = config.token;
  }

  async uploadImage(params: UploadImageParams): Promise<ImageData> {
    if (!params.image.trim()) {
      throw createApiServiceError('Provide base64 image data or an image URL.', {
        reason: 'imgbb_invalid_image'
      });
    }
    if (
      params.expiration !== undefined &&
      (!Number.isInteger(params.expiration) ||
        params.expiration < 60 ||
        params.expiration > 15552000)
    ) {
      throw createApiServiceError(
        'Expiration must be a whole number from 60 to 15,552,000 seconds.',
        { reason: 'imgbb_invalid_expiration' }
      );
    }
    if (
      /^[A-Za-z0-9+/\s]+={0,2}$/.test(params.image) &&
      getBase64ByteLength(params.image) > 32 * 1024 * 1024
    ) {
      throw createApiServiceError('The image exceeds ImgBB’s 32 MB upload limit.', {
        reason: 'imgbb_image_too_large'
      });
    }

    let httpClient = createAxios({ baseURL: 'https://api.imgbb.com/1' });

    let formData = new FormData();
    formData.append('image', params.image);

    if (params.name !== undefined) {
      formData.append('name', params.name);
    }

    if (params.expiration !== undefined) {
      formData.append('expiration', String(params.expiration));
    }

    try {
      let response = await httpClient.post<unknown>('/upload', formData, {
        params: { key: this.token }
      });
      let body = response.data;
      if (isApiErrorRecord(body) && body.success === false) {
        throw buildApiServiceError(
          { response: { status: body.status ?? response.status, data: body } },
          {
            providerLabel: 'ImgBB',
            operation: 'image upload',
            reason: 'imgbb_api_error',
            nestedKeys: ['error', 'errors']
          }
        );
      }
      let result = imageData.safeParse(isApiErrorRecord(body) ? body.data : undefined);
      if (!isApiErrorRecord(body) || body.success !== true || !result.success) {
        throw createApiServiceError(
          'ImgBB returned an incomplete upload response. The image may have been uploaded; check your account before retrying.',
          { reason: 'imgbb_invalid_response' }
        );
      }
      return result.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'ImgBB',
        operation: 'image upload',
        reason: 'imgbb_api_error',
        nestedKeys: ['error', 'errors'],
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }
}
