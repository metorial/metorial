import { createApiServiceError, isApiErrorRecord } from 'slates';
import { type AdobeAuthConfig, createAdobeAxios } from './client';

let FIREFLY_BASE_URL = 'https://firefly-api.adobe.io';

export let fireflyImages = (result: unknown) => {
  if (!isApiErrorRecord(result)) {
    throw createApiServiceError('Adobe Firefly returned an invalid image response.');
  }
  let images = result.outputs ?? result.images;
  if (!Array.isArray(images)) {
    throw createApiServiceError('Adobe Firefly did not return image outputs.');
  }
  return images.map((image: unknown) => {
    if (!isApiErrorRecord(image)) {
      throw createApiServiceError('Adobe Firefly returned an invalid image output.');
    }
    let imageUrl = (isApiErrorRecord(image.image) ? image.image.url : undefined) ?? image.url;
    if (typeof imageUrl !== 'string' || !imageUrl) {
      throw createApiServiceError('Adobe Firefly did not return a generated image URL.');
    }
    return { imageUrl, seed: typeof image.seed === 'number' ? image.seed : undefined };
  });
};

export class FireflyClient {
  private http;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(FIREFLY_BASE_URL, auth);
  }

  async generateImages(params: {
    prompt: string;
    negativePrompt?: string;
    numVariations?: number;
    size?: { width: number; height: number };
    contentClass?: 'photo' | 'art';
    style?: {
      presets?: string[];
      referenceImage?: { source: { url: string } };
      strength?: number;
    };
    seeds?: number[];
    visualIntensity?: number;
    locale?: string;
  }) {
    let response = await this.http.post('/v3/images/generate', {
      prompt: params.prompt,
      ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
      numVariations: params.numVariations ?? 1,
      ...(params.size ? { size: params.size } : {}),
      ...(params.contentClass ? { contentClass: params.contentClass } : {}),
      ...(params.style ? { style: params.style } : {}),
      ...(params.seeds ? { seeds: params.seeds } : {}),
      ...(params.visualIntensity !== undefined
        ? { visualIntensity: params.visualIntensity }
        : {}),
      ...(params.locale ? { locale: params.locale } : {})
    });
    return response.data;
  }

  async generativeFill(params: {
    image: { source: { url: string } };
    mask: { source: { url: string } };
    prompt?: string;
    numVariations?: number;
    size?: { width: number; height: number };
  }) {
    let response = await this.http.post('/v3/images/fill', {
      image: {
        ...params.image,
        mask: params.mask.source
      },
      ...(params.prompt ? { prompt: params.prompt } : {}),
      numVariations: params.numVariations ?? 1,
      ...(params.size ? { size: params.size } : {})
    });
    return response.data;
  }

  async generativeExpand(params: {
    image: { source: { url: string } };
    size: { width: number; height: number };
    prompt?: string;
    numVariations?: number;
    placement?: { insets: { left: number; top: number; right: number; bottom: number } };
  }) {
    let response = await this.http.post('/v3/images/expand', {
      image: params.image,
      size: params.size,
      ...(params.prompt ? { prompt: params.prompt } : {}),
      numVariations: params.numVariations ?? 1,
      ...(params.placement ? { placement: params.placement } : {})
    });
    return response.data;
  }

  async generateObjectComposite(params: {
    image: { source: { url: string } };
    placement?: { insets: { left: number; top: number; right: number; bottom: number } };
    contentClass?: string;
  }) {
    let response = await this.http.post('/v3/images/generate-object-composite', {
      image: params.image,
      ...(params.placement ? { placement: params.placement } : {}),
      ...(params.contentClass ? { contentClass: params.contentClass } : {})
    });
    return response.data;
  }
}
