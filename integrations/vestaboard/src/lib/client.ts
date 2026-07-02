import { createAxios } from 'slates';

export type ApiType = 'cloud' | 'subscription' | 'local';

export type CharacterGrid = number[][];

export interface AuthConfig {
  token: string;
  apiType: ApiType;
  apiSecret?: string;
  baseUrl?: string;
}

export interface SendMessageResult {
  status: string;
  messageId?: string;
  created?: number;
}

export interface CurrentMessage {
  layout: CharacterGrid;
  messageId?: string;
}

export interface TransitionConfig {
  transition: 'classic' | 'wave' | 'drift' | 'curtain';
  transitionSpeed: 'gentle' | 'fast';
}

export interface Subscription {
  subscriptionId: string;
  boardId: string;
}

export class CloudClient {
  private http;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://cloud.vestaboard.com',
      headers: {
        'X-Vestaboard-Token': token,
        'Content-Type': 'application/json'
      }
    });
  }

  async readMessage(): Promise<CurrentMessage> {
    let response = await this.http.get('/');
    let data = response.data;
    return {
      layout: data.currentMessage?.layout ?? data.layout ?? data,
      messageId: data.currentMessage?.id ?? data.id
    };
  }

  async sendText(text: string, forced?: boolean): Promise<SendMessageResult> {
    let body: Record<string, unknown> = { text };
    if (forced) {
      body.forced = true;
    }
    let response = await this.http.post('/', body);
    return {
      status: response.data?.status ?? 'ok',
      messageId: response.data?.id,
      created: response.data?.created
    };
  }

  async sendCharacters(
    characters: CharacterGrid,
    forced?: boolean
  ): Promise<SendMessageResult> {
    let body: Record<string, unknown> = { characters };
    if (forced) {
      body.forced = true;
    }
    let response = await this.http.post('/', body);
    return {
      status: response.data?.status ?? 'ok',
      messageId: response.data?.id,
      created: response.data?.created
    };
  }

  async getTransition(): Promise<TransitionConfig> {
    let response = await this.http.get('/transition');
    return {
      transition: response.data.transition,
      transitionSpeed: response.data.transitionSpeed
    };
  }

  async setTransition(transition: TransitionConfig): Promise<TransitionConfig> {
    let response = await this.http.put('/transition', transition);
    return {
      transition: response.data.transition ?? transition.transition,
      transitionSpeed: response.data.transitionSpeed ?? transition.transitionSpeed
    };
  }
}

export class SubscriptionClient {
  private http;

  constructor(apiKey: string, apiSecret: string) {
    this.http = createAxios({
      baseURL: 'https://subscriptions.vestaboard.com',
      headers: {
        'x-vestaboard-api-key': apiKey,
        'x-vestaboard-api-secret': apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  async listSubscriptions(): Promise<Subscription[]> {
    let response = await this.http.get('/subscriptions');
    let subs = Array.isArray(response.data)
      ? response.data
      : (response.data?.subscriptions ?? []);
    return subs.map((s: any) => ({
      subscriptionId: s.id ?? s._id,
      boardId: s.boardId
    }));
  }

  async sendText(subscriptionId: string, text: string): Promise<SendMessageResult> {
    let response = await this.http.post(`/subscriptions/${subscriptionId}/message`, { text });
    return {
      status: response.data?.status ?? 'ok',
      messageId: response.data?.id,
      created: response.data?.created
    };
  }

  async sendCharacters(
    subscriptionId: string,
    characters: CharacterGrid
  ): Promise<SendMessageResult> {
    let response = await this.http.post(`/subscriptions/${subscriptionId}/message`, {
      characters
    });
    return {
      status: response.data?.status ?? 'ok',
      messageId: response.data?.id,
      created: response.data?.created
    };
  }
}

export class LocalClient {
  private http;

  constructor(token: string, baseUrl: string) {
    let normalizedUrl = baseUrl.replace(/\/$/, '');
    this.http = createAxios({
      baseURL: normalizedUrl,
      headers: {
        'X-Vestaboard-Local-Api-Key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  async readMessage(): Promise<CurrentMessage> {
    let response = await this.http.get('/local-api/message');
    let data = response.data;
    return {
      layout: data.message ?? data.layout ?? data
    };
  }

  async sendCharacters(characters: CharacterGrid): Promise<SendMessageResult> {
    let response = await this.http.post('/local-api/message', characters);
    return {
      status: response.data?.status ?? 'ok',
      messageId: response.data?.id
    };
  }
}

export let createClient = (auth: AuthConfig) => {
  if (auth.apiType === 'cloud') {
    return { cloud: new CloudClient(auth.token) };
  }
  if (auth.apiType === 'subscription') {
    if (!auth.apiSecret) {
      throw new Error('Subscription API requires an API secret');
    }
    return { subscription: new SubscriptionClient(auth.token, auth.apiSecret) };
  }
  if (auth.apiType === 'local') {
    let baseUrl = auth.baseUrl ?? 'http://vestaboard.local:7000';
    return { local: new LocalClient(auth.token, baseUrl) };
  }
  throw new Error(`Unknown API type: ${auth.apiType}`);
};
