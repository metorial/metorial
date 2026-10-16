import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

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
  muted?: boolean;
  response?: unknown;
}

export interface CurrentMessage {
  layout: CharacterGrid;
  messageId?: string;
}

export interface TransitionConfig {
  transition: 'classic' | 'wave' | 'drift' | 'curtain';
  transitionSpeed: 'gentle' | 'fast';
}

export interface LocalTransition {
  strategy: 'column' | 'reverse-column' | 'edges-to-center' | 'row' | 'diagonal' | 'random';
  stepIntervalMs?: number;
  stepSize?: number;
}

export interface Subscription {
  subscriptionId: string;
  boardId: string;
}

let transitionSchema = z.object({
  transition: z.enum(['classic', 'wave', 'drift', 'curtain']),
  transitionSpeed: z.enum(['gentle', 'fast'])
});

let parseTransition = (value: unknown): TransitionConfig => {
  let parsed = transitionSchema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError('Vestaboard returned an invalid transition configuration.');
  }
  return parsed.data;
};

let gridSchema = z.array(z.array(z.number().int().min(0).max(71)).min(1)).min(1);

export let parseCharacterGrid = (value: unknown, label: string): CharacterGrid => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      throw createApiServiceError(`${label} was not a valid JSON character array.`, {
        parent: error
      });
    }
  }

  let parsed = gridSchema.safeParse(value);
  if (!parsed.success || parsed.data.some(row => row.length !== parsed.data[0]?.length)) {
    throw createApiServiceError(
      `${label} must be a nonempty rectangular array of integer character codes from 0 to 71.`
    );
  }
  return parsed.data;
};

let normalizeSendResult = (data: unknown): SendMessageResult => {
  let result = isApiErrorRecord(data) ? data : {};
  let created =
    typeof result.created === 'number' || typeof result.created === 'string'
      ? Number(result.created)
      : undefined;
  return {
    status:
      typeof result.status === 'string'
        ? result.status
        : result.muted === true
          ? 'muted'
          : 'ok',
    messageId: typeof result.id === 'string' ? result.id : undefined,
    created: created !== undefined && Number.isFinite(created) ? created : undefined,
    muted: typeof result.muted === 'boolean' ? result.muted : undefined,
    response: data
  };
};

export class CloudClient {
  private http;

  constructor(token: string) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://cloud.vestaboard.com',
      timeout: 30_000,
      authHeader: { name: 'X-Vestaboard-Token', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Vestaboard Cloud',
          reason: 'vestaboard_api_error'
        })
    });
  }

  async readMessage(): Promise<CurrentMessage> {
    let response = await this.http.get('/');
    let data: unknown = response.data;
    let record = isApiErrorRecord(data) ? data : undefined;
    let currentMessage = isApiErrorRecord(record?.currentMessage)
      ? record.currentMessage
      : undefined;
    let messageId = currentMessage?.id ?? record?.id;
    return {
      layout: parseCharacterGrid(
        currentMessage?.layout ?? record?.layout ?? data,
        'Vestaboard Cloud message layout'
      ),
      messageId: typeof messageId === 'string' ? messageId : undefined
    };
  }

  async sendText(text: string, forced?: boolean): Promise<SendMessageResult> {
    let response = await this.http.post('/', { text, ...(forced ? { forced } : {}) });
    return normalizeSendResult(response.data);
  }

  async sendCharacters(
    characters: CharacterGrid,
    forced?: boolean
  ): Promise<SendMessageResult> {
    let response = await this.http.post('/', { characters, ...(forced ? { forced } : {}) });
    return normalizeSendResult(response.data);
  }

  async getTransition(): Promise<TransitionConfig> {
    let response = await this.http.get<TransitionConfig>('/transition');
    return parseTransition(response.data);
  }

  async setTransition(transition: TransitionConfig): Promise<TransitionConfig> {
    let response = await this.http.put<TransitionConfig>('/transition', transition);
    return parseTransition(response.data);
  }
}

export class SubscriptionClient {
  private http;

  constructor(apiKey: string, apiSecret?: string) {
    if (!apiSecret) {
      throw createApiServiceError(
        'Subscription API credentials are missing an API secret. Reconnect using the API key and secret.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://subscriptions.vestaboard.com',
      timeout: 30_000,
      headers: {
        'x-vestaboard-api-key': apiKey,
        'x-vestaboard-api-secret': apiSecret
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Vestaboard Subscription',
          reason: 'vestaboard_api_error'
        })
    });
  }

  async listSubscriptions(): Promise<Subscription[]> {
    let response = await this.http.get<unknown>('/subscriptions');
    let data = response.data;
    let subscriptions = Array.isArray(data)
      ? data
      : isApiErrorRecord(data)
        ? data.subscriptions
        : undefined;
    if (!Array.isArray(subscriptions)) {
      throw createApiServiceError('Vestaboard returned an invalid subscriptions response.');
    }
    return subscriptions.map(subscription => {
      let id = isApiErrorRecord(subscription)
        ? (subscription.id ?? subscription._id)
        : undefined;
      if (
        !isApiErrorRecord(subscription) ||
        typeof id !== 'string' ||
        typeof subscription.boardId !== 'string'
      ) {
        throw createApiServiceError(
          'Vestaboard returned a subscription without board identifiers.'
        );
      }
      return { subscriptionId: id, boardId: subscription.boardId };
    });
  }

  async sendText(subscriptionId: string, text: string): Promise<SendMessageResult> {
    let response = await this.http.post(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/message`,
      { text }
    );
    return normalizeSendResult(response.data);
  }

  async sendCharacters(
    subscriptionId: string,
    characters: CharacterGrid
  ): Promise<SendMessageResult> {
    let response = await this.http.post(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/message`,
      { characters }
    );
    return normalizeSendResult(response.data);
  }
}

export class LocalClient {
  private http;

  constructor(token: string, baseUrl: string) {
    let normalizedUrl: URL;
    try {
      normalizedUrl = new URL(baseUrl);
    } catch (error) {
      throw createApiServiceError(
        'Local API base URL must be a complete HTTP or HTTPS URL, such as http://vestaboard.local:7000.',
        { parent: error }
      );
    }
    if (!['http:', 'https:'].includes(normalizedUrl.protocol)) {
      throw createApiServiceError('Local API base URL must use HTTP or HTTPS.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: normalizedUrl.href.replace(/\/$/, ''),
      timeout: 30_000,
      authHeader: { name: 'X-Vestaboard-Local-Api-Key', value: token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Vestaboard Local',
          reason: 'vestaboard_api_error'
        })
    });
  }

  async readMessage(): Promise<CurrentMessage> {
    let response = await this.http.get('/local-api/message');
    let data: unknown = response.data;
    let record = isApiErrorRecord(data) ? data : undefined;
    return {
      layout: parseCharacterGrid(
        record?.message ?? record?.layout ?? data,
        'Vestaboard Local message'
      )
    };
  }

  async sendCharacters(
    characters: CharacterGrid,
    transition?: LocalTransition
  ): Promise<SendMessageResult> {
    let body = transition
      ? {
          characters,
          strategy: transition.strategy,
          ...(transition.stepIntervalMs !== undefined
            ? { step_interval_ms: transition.stepIntervalMs }
            : {}),
          ...(transition.stepSize !== undefined ? { step_size: transition.stepSize } : {})
        }
      : characters;
    let response = await this.http.post('/local-api/message', body);
    return normalizeSendResult(response.data);
  }
}

export let createClient = (auth: AuthConfig) => {
  if (auth.apiType === 'cloud') {
    return { cloud: new CloudClient(auth.token) };
  }
  if (auth.apiType === 'subscription') {
    return { subscription: new SubscriptionClient(auth.token, auth.apiSecret) };
  }
  if (auth.apiType === 'local') {
    let baseUrl = auth.baseUrl ?? 'http://vestaboard.local:7000';
    return { local: new LocalClient(auth.token, baseUrl) };
  }
  throw createApiServiceError(`Unknown API type: ${auth.apiType}`);
};
