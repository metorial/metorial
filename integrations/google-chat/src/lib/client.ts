import { createAxios, requestAxiosData } from 'slates';
import { googleChatApiError, googleChatValidationError } from './errors';

export let GOOGLE_CHAT_API_ORIGIN = 'https://chat.googleapis.com';
export let GOOGLE_CHAT_API_BASE_URL = `${GOOGLE_CHAT_API_ORIGIN}/v1/`;

export type GoogleChatRequestOptions = {
  method?: 'delete' | 'get' | 'patch' | 'post' | 'put';
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: 'arraybuffer' | 'json' | 'text';
  operation?: string;
};

let absoluteUrlPattern = /^[A-Za-z][A-Za-z\d+.-]*:/;

export let resolveGoogleChatRequestUrl = (url: string) => {
  let resolved = url.trim();
  if (!resolved) throw googleChatValidationError('Google Chat request URL is required.');

  let isAbsolute = absoluteUrlPattern.test(resolved) || resolved.startsWith('//');
  let parsed: URL;
  try {
    parsed = new URL(resolved, GOOGLE_CHAT_API_BASE_URL);
  } catch (error) {
    throw googleChatValidationError('Google Chat request URL is invalid.', error);
  }

  if (
    parsed.origin !== GOOGLE_CHAT_API_ORIGIN ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw googleChatValidationError(
      'Authenticated Google Chat requests can use absolute URLs only on https://chat.googleapis.com and cannot contain URL credentials.'
    );
  }

  return isAbsolute ? parsed.toString() : resolved;
};

export class GoogleChatClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    if (!token.trim()) {
      throw googleChatValidationError('A Google Chat OAuth access token is required.');
    }

    this.http = createAxios({
      baseURL: GOOGLE_CHAT_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async request<T>(url: string, options: GoogleChatRequestOptions = {}): Promise<T> {
    let { operation = 'request', ...requestOptions } = options;
    let safeUrl = resolveGoogleChatRequestUrl(url);

    return requestAxiosData<T>(
      operation,
      () => this.http.request<T>({ url: safeUrl, ...requestOptions }),
      googleChatApiError
    );
  }
}
