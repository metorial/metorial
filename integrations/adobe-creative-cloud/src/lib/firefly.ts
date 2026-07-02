import { type AdobeAuthConfig, createAdobeAxios } from './client';

let FIREFLY_BASE_URL = 'https://firefly-api.adobe.io';

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
      numVariations: params.numVariations || 1,
      ...(params.size ? { size: params.size } : {}),
      ...(params.contentClass ? { contentClass: params.contentClass } : {}),
      ...(params.style ? { style: params.style } : {}),
      ...(params.seeds ? { seeds: params.seeds } : {}),
      ...(params.visualIntensity ? { visualIntensity: params.visualIntensity } : {}),
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
      image: params.image,
      mask: params.mask,
      ...(params.prompt ? { prompt: params.prompt } : {}),
      numVariations: params.numVariations || 1,
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
      numVariations: params.numVariations || 1,
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
