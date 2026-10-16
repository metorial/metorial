import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

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
}

export class Client {
  private token: string;
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A Screenshot.fyi API key is required. Reconnect your account.'
      );
    }
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://screenshot.fyi/api',
      maxRedirects: 0,
      timeout: 120000,
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Screenshot.fyi',
          reason: 'screenshot_fyi_api_error',
          detailKeys: ['error', 'details', 'message', 'detail'],
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
          formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
            `${providerLabel} API ${operation} failed: ${statusLabel}${this.redact(message)}`,
          parent: {}
        })
    });
  }

  private redact(value: string): string {
    return value
      .split(this.token)
      .join('[redacted]')
      .split(encodeURIComponent(this.token))
      .join('[redacted]')
      .replace(
        /(^|[?&\s{,]["']?)((?:access[_-]?key|api[_-]?key|token|secret|password|authorization)["']?\s*(?:=|:|%3[dD])\s*["']?)[^\s&#"'<>]+/gi,
        '$1$2[redacted]'
      );
  }

  async takeScreenshot(options: TakeScreenshotOptions): Promise<ScreenshotResponse> {
    let target: URL;
    try {
      target = new URL(options.url);
    } catch {
      throw createApiServiceError('url must be a fully qualified HTTP or HTTPS URL.');
    }
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) {
      throw createApiServiceError('url must use HTTP or HTTPS without embedded credentials.');
    }
    for (let field of ['width', 'height'] as const) {
      let value = options[field];
      if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
        throw createApiServiceError(`${field} must be a positive integer in pixels.`);
      }
    }

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

    let response = await this.axios.get<unknown>('/take', { params });
    let data = response.data;
    if (!isApiErrorRecord(data) || typeof data.url !== 'string' || !data.url.trim()) {
      throw createApiServiceError('Screenshot.fyi returned no valid screenshot URL.', {
        reason: 'screenshot_fyi_invalid_response'
      });
    }

    let screenshot: URL;
    try {
      screenshot = new URL(data.url);
    } catch {
      throw createApiServiceError('Screenshot.fyi returned an invalid screenshot URL.', {
        reason: 'screenshot_fyi_invalid_response'
      });
    }
    let decodedUrl = data.url;
    try {
      decodedUrl = decodeURIComponent(data.url);
    } catch {
      // The URL parser already checked the URL; retain any literal percent characters.
    }
    // Scoped file signatures are retained. Account credentials must never enter public output.
    if (
      screenshot.protocol !== 'https:' ||
      screenshot.username ||
      screenshot.password ||
      data.url.includes(this.token) ||
      screenshot.href.includes(this.token) ||
      decodedUrl.includes(this.token) ||
      Array.from(screenshot.searchParams.values()).some(value => value.includes(this.token)) ||
      Array.from(screenshot.searchParams.keys()).some(key => /^accessKey$/i.test(key))
    ) {
      throw createApiServiceError('Screenshot.fyi returned an unsafe screenshot URL.', {
        reason: 'screenshot_fyi_invalid_response'
      });
    }

    return { screenshotUrl: data.url };
  }

  async downloadScreenshot(url: string): Promise<{ content: Response; filename: string }> {
    let location: URL;
    try {
      location = new URL(url);
    } catch {
      throw createApiServiceError('The screenshot download URL is invalid.');
    }
    // This exact file host is the provider's OpenAPI 200-response example.
    if (
      location.protocol !== 'https:' ||
      location.hostname !== 'blob.screenshot.fyi' ||
      location.port ||
      location.username ||
      location.password
    ) {
      throw createApiServiceError('The screenshot download host is not documented.');
    }

    let bytes: Uint8Array<ArrayBuffer>;
    try {
      let response = await fetch(location, {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        signal: AbortSignal.timeout(60000)
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw createApiServiceError('The screenshot download was unavailable.');
      }
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Screenshot.fyi',
        operation: 'image download',
        reason: 'screenshot_fyi_download_error',
        extractMessage: () => 'The generated image could not be downloaded.',
        parent: {}
      });
    }

    let png =
      bytes.length >= 45 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) &&
      new TextDecoder().decode(bytes.subarray(12, 16)) === 'IHDR' &&
      new DataView(bytes.buffer, bytes.byteOffset).getUint32(16) > 0 &&
      new DataView(bytes.buffer, bytes.byteOffset).getUint32(20) > 0 &&
      [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130].every(
        (value, index) => bytes[bytes.length - 12 + index] === value
      );
    let jpeg =
      bytes.length >= 16 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255 &&
      bytes[bytes.length - 2] === 255 &&
      bytes[bytes.length - 1] === 217;
    if (!png && !jpeg) {
      throw createApiServiceError(
        'The screenshot download did not contain a PNG or JPEG image.'
      );
    }

    return {
      content: new Response(bytes, {
        headers: { 'content-type': png ? 'image/png' : 'image/jpeg' }
      }),
      filename: png ? 'screenshot.png' : 'screenshot.jpg'
    };
  }
}
