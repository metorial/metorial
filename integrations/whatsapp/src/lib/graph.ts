import { createAxios } from 'slates';
import { whatsappGraphErrorMapping } from './graphErrors';

export let DEFAULT_WHATSAPP_API_VERSION = 'v21.0';

export interface WhatsAppGraphConfig {
  token: string;
  apiVersion?: string;
}

export type WhatsAppGraphMethod = 'GET' | 'POST' | 'DELETE';

export interface WhatsAppGraphRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

// Shared Graph transport; failures reject with the mapped Graph SlateError.
export class WhatsAppGraphApi {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: WhatsAppGraphConfig) {
    this.axios = createAxios({
      baseURL: `https://graph.facebook.com/${config.apiVersion || DEFAULT_WHATSAPP_API_VERSION}`,
      headers: { Authorization: `Bearer ${config.token}` },
      errorMapping: whatsappGraphErrorMapping
    });
  }

  async request<T>(
    method: WhatsAppGraphMethod,
    path: string,
    options: WhatsAppGraphRequestOptions = {}
  ): Promise<T> {
    let isJson = method === 'POST' && !(options.body instanceof FormData);
    let response = await this.axios.request({
      method,
      url: path,
      params: options.params,
      data: options.body,
      headers: isJson ? { 'Content-Type': 'application/json' } : undefined
    });
    return response.data as T;
  }
}
