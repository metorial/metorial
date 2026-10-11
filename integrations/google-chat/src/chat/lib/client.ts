import { ChatErrors } from '@slates/adapter-chat';
import { createAxios } from 'slates';
import { GOOGLE_CHAT_API_BASE_URL, resolveGoogleChatRequestUrl } from '../../lib/client';
import { type GoogleChatChatErrorContext, mapGoogleChatChatError } from './errors';

export type GoogleChatAppRequestOptions = {
  method?: 'delete' | 'get' | 'patch' | 'post';
  params?: Record<string, unknown>;
  data?: unknown;
  context?: GoogleChatChatErrorContext;
};

export class GoogleChatAppClient {
  private http: ReturnType<typeof createAxios>;

  constructor(
    token: string | undefined,
    private readonly context: GoogleChatChatErrorContext = {}
  ) {
    if (!token?.trim()) {
      throw ChatErrors.authInvalid({
        action: context.action,
        message: 'A Google Chat app access token is required.'
      });
    }
    this.http = createAxios({
      baseURL: GOOGLE_CHAT_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async request<T>(path: string, options: GoogleChatAppRequestOptions = {}): Promise<T> {
    let { context, ...requestOptions } = options;
    let errorContext = { ...this.context, ...context };
    try {
      let url = resolveGoogleChatRequestUrl(path);
      let response = await this.http.request<T>({ url, ...requestOptions });
      return response.data;
    } catch (error) {
      throw mapGoogleChatChatError(error, errorContext);
    }
  }
}

export let createGoogleChatAppClient = (
  ctx: { auth: { token?: string } },
  context: GoogleChatChatErrorContext = {}
) => new GoogleChatAppClient(ctx.auth.token, context);
