import { createAxios } from 'slates';

export interface TakeScreenshotOptions {
  url: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
  darkMode?: boolean;
  disableCookieBanners?: boolean;
  format?: 'png' | 'jpg' | 'jpeg';
}

export interface ScreenshotResponse {
  screenshotUrl: string;
  [key: string]: unknown;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async takeScreenshot(options: TakeScreenshotOptions): Promise<ScreenshotResponse> {
    let axios = createAxios({
      baseURL: 'https://screenshot.fyi/api'
    });

    let params: Record<string, string | number | boolean> = {
      accessKey: this.token,
      url: options.url
    };

    if (options.fullPage !== undefined) {
      params.fullPage = options.fullPage;
    }

    if (options.width !== undefined) {
      params.width = options.width;
    }

    if (options.height !== undefined) {
      params.height = options.height;
    }

    if (options.darkMode !== undefined) {
      params.darkMode = options.darkMode;
    }

    if (options.disableCookieBanners !== undefined) {
      params.disableCookieBanners = options.disableCookieBanners;
    }

    if (options.format !== undefined) {
      params.format = options.format;
    }

    let response = await axios.get('/take', { params });

    return response.data as ScreenshotResponse;
  }
}
