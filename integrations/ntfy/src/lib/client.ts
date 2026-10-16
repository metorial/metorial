import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface NtfyAuth {
  token?: string;
  username?: string;
  password?: string;
}

export interface NtfyClientConfig {
  serverUrl: string;
  auth: NtfyAuth;
}

export interface PublishOptions {
  topic: string;
  message?: string;
  title?: string;
  priority?: number;
  tags?: string[];
  markdown?: boolean;
  clickUrl?: string;
  iconUrl?: string;
  attachUrl?: string;
  filename?: string;
  delay?: string;
  timezone?: string;
  sequenceId?: string;
  email?: string;
  call?: string;
  actions?: ActionButton[];
  cacheDisabled?: boolean;
  firebaseDisabled?: boolean;
}

export interface ActionButton {
  action: 'view' | 'http' | 'broadcast' | 'copy';
  label: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  intent?: string;
  extras?: Record<string, string>;
  value?: string;
  clear?: boolean;
}

export interface NtfyMessage {
  messageId: string;
  sequenceId?: string;
  time: number;
  expires?: number;
  event: string;
  topic: string;
  title?: string;
  message?: string;
  priority?: number;
  tags?: string[];
  clickUrl?: string;
  iconUrl?: string;
  actions?: ActionButton[];
  attachment?: {
    name: string;
    url: string;
    type?: string;
    size?: number;
    expires?: number;
  };
}

export interface UpdateMessageOptions {
  topic: string;
  messageId: string;
  eventType: string;
  message?: string;
  title?: string;
  priority?: number;
  tags?: string[];
  markdown?: boolean;
}

export interface PollOptions {
  topic: string;
  since?: string;
  scheduled?: boolean;
  includeEvents?: boolean;
  filterMessageId?: string;
  filterMessage?: string;
  filterTitle?: string;
  filterPriority?: string;
  filterTags?: string;
}

let messageResponse = z.object({
  id: z.string().min(1),
  time: z.number(),
  event: z.string(),
  topic: z.string(),
  sequence_id: z.string().nullish(),
  expires: z.number().nullish(),
  title: z.string().nullish(),
  message: z.string().nullish(),
  priority: z.number().nullish(),
  tags: z.array(z.string()).nullish(),
  click: z.string().nullish(),
  icon: z.string().nullish(),
  attachment: z
    .object({
      name: z.string(),
      url: z.string(),
      type: z.string().nullish(),
      size: z.number().nullish(),
      expires: z.number().nullish()
    })
    .nullish()
});

let accountResponse = z.object({
  username: z.string(),
  role: z.string().nullish(),
  tier: z.object({ code: z.string().optional(), name: z.string().optional() }).nullish(),
  limits: z.record(z.string(), z.union([z.string(), z.number()])).nullish(),
  stats: z.record(z.string(), z.number()).nullish(),
  reservations: z.array(z.object({ topic: z.string(), everyone: z.string() })).nullish()
});

let validateTopic = (topic: string, multiple = false) => {
  let topics = multiple ? topic.split(',') : [topic];
  if (!topics.every(value => /^[-_A-Za-z0-9]{1,64}$/.test(value))) {
    throw createApiServiceError(
      'Topic names must contain 1–64 letters, numbers, underscores, or dashes. Separate polling topics with commas.'
    );
  }
};

let validatePriority = (priority?: number) => {
  if (
    priority !== undefined &&
    (!Number.isInteger(priority) || priority < 1 || priority > 5)
  ) {
    throw createApiServiceError('Priority must be a whole number from 1 to 5.');
  }
};

export class Client {
  private http;

  constructor(config: NtfyClientConfig) {
    let serverUrl = z.url().safeParse(config.serverUrl);
    if (!serverUrl.success) {
      throw createApiServiceError('Provide a valid http:// or https:// ntfy server URL.');
    }
    let url = new URL(serverUrl.data);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw createApiServiceError(
        'Use an http:// or https:// ntfy server URL without embedded credentials, query parameters, or fragments.'
      );
    }
    let headers: Record<string, string> = {};
    if (config.auth.token !== undefined) {
      if (!config.auth.token.trim()) {
        throw createApiServiceError('Reconnect with a non-empty ntfy access token.');
      }
      headers.Authorization = `Bearer ${config.auth.token}`;
    } else if (config.auth.username !== undefined || config.auth.password !== undefined) {
      if (
        config.auth.username === undefined ||
        !config.auth.password ||
        config.auth.username.includes(':')
      ) {
        throw createApiServiceError(
          'Reconnect with a valid ntfy username and password, or an empty username and access token as the password.'
        );
      }
      let encoded = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
        'base64'
      );
      headers.Authorization = `Basic ${encoded}`;
    }
    this.http = createAuthenticatedAxios({
      baseURL: url.toString().replace(/\/+$/, ''),
      headers,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ntfy',
          reason: 'ntfy_api_error',
          extractResponse: (error, helpers) => {
            let response = helpers.getResponseWithBody(error);
            if (typeof response?.data === 'string') {
              try {
                return { ...response, data: JSON.parse(response.data) };
              } catch {
                return response;
              }
            }
            return response;
          },
          extractUpstreamCode: (_error, response, helpers) => {
            let data = response?.data;
            return helpers.isRecord(data) &&
              (typeof data.code === 'number' || typeof data.code === 'string')
              ? String(data.code)
              : undefined;
          }
        })
    });
  }

  async publish(options: PublishOptions): Promise<NtfyMessage> {
    validateTopic(options.topic);
    validatePriority(options.priority);
    if (options.cacheDisabled && options.delay) {
      throw createApiServiceError(
        'Scheduled delivery requires message caching. Remove delay or enable caching.'
      );
    }
    for (let action of options.actions ?? []) {
      if ((action.action === 'view' || action.action === 'http') && !action.url?.trim()) {
        throw createApiServiceError(`Provide a URL for the ${action.action} action button.`);
      }
      if (action.action === 'copy' && action.value === undefined) {
        throw createApiServiceError('Provide a value for the copy action button.');
      }
    }
    let payload = pickDefined({
      topic: options.topic,
      message: options.message,
      title: options.title,
      priority: options.priority,
      tags: options.tags,
      markdown: options.markdown,
      click: options.clickUrl,
      icon: options.iconUrl,
      attach: options.attachUrl,
      filename: options.filename,
      delay: options.delay,
      timezone: options.timezone,
      sequence_id: options.sequenceId,
      email: options.email,
      call: options.call,
      cache: options.cacheDisabled ? 'no' : undefined,
      firebase: options.firebaseDisabled ? 'no' : undefined,
      actions: options.actions
    });
    let response = await this.http.post('/', payload);
    return mapMessage(response.data);
  }

  async updateMessage(options: UpdateMessageOptions): Promise<NtfyMessage> {
    validateTopic(options.topic);
    validatePriority(options.priority);
    if (!options.messageId.trim()) {
      throw createApiServiceError(
        'Provide the original message ID or the sequence ID used for the first notification.'
      );
    }
    let path = `/${encodeURIComponent(options.topic)}/${encodeURIComponent(options.messageId)}`;
    if (options.eventType === 'message_clear') {
      let response = await this.http.put(`${path}/clear`);
      return mapMessage(response.data);
    }
    if (options.eventType === 'message_delete') {
      let response = await this.http.delete(path);
      return mapMessage(response.data);
    }
    if (options.eventType !== 'message') {
      throw createApiServiceError(
        'Choose update, clear, or delete for the notification action.'
      );
    }
    let response = await this.http.post(
      '/',
      pickDefined({
        topic: options.topic,
        sequence_id: options.messageId,
        message: options.message,
        title: options.title,
        priority: options.priority,
        tags: options.tags,
        markdown: options.markdown
      })
    );
    return mapMessage(response.data);
  }

  async pollMessages(
    options: PollOptions
  ): Promise<{ messages: NtfyMessage[]; truncated: boolean }> {
    validateTopic(options.topic, true);
    let params = pickDefined({
      poll: '1',
      since: options.since,
      scheduled: options.scheduled ? '1' : undefined,
      id: options.filterMessageId,
      message: options.filterMessage,
      title: options.filterTitle,
      priority: options.filterPriority,
      tags: options.filterTags
    });
    let response = await this.http.get(
      `/${options.topic.split(',').map(encodeURIComponent).join(',')}/json`,
      {
        params,
        responseType: 'text',
        transformResponse: [(data: unknown) => data]
      }
    );
    if (typeof response.data !== 'string') {
      throw createApiServiceError('ntfy returned an unexpected message stream.', {
        reason: 'ntfy_invalid_response'
      });
    }
    let messages: NtfyMessage[] = [];
    for (let line of response.data.split('\n')) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw createApiServiceError(
          'ntfy returned a malformed message stream. Retry the poll.',
          { reason: 'ntfy_invalid_response' }
        );
      }
      let message = mapMessage(parsed);
      if (
        message.event === 'message' ||
        (options.includeEvents && ['message_clear', 'message_delete'].includes(message.event))
      ) {
        messages.push(message);
      }
    }
    return {
      messages,
      truncated: getResponseHeaderValue(response.headers, 'x-messages-truncated') === '1'
    };
  }

  async getAccount() {
    let response = await this.http.get('/v1/account');
    let parsed = accountResponse.safeParse(response.data);
    if (!parsed.success) {
      throw createApiServiceError('ntfy returned an unexpected account response.', {
        reason: 'ntfy_invalid_response'
      });
    }
    let data = parsed.data;
    return {
      username: data.username,
      ...pickDefined({
        role: data.role ?? undefined,
        tier: data.tier ?? undefined,
        limits: data.limits ?? undefined,
        stats: data.stats ?? undefined,
        reservations: data.reservations ?? undefined
      })
    };
  }
}

export let mapMessage = (data: unknown): NtfyMessage => {
  let result = messageResponse.safeParse(data);
  if (!result.success) {
    throw createApiServiceError('ntfy returned an unexpected notification response.', {
      reason: 'ntfy_invalid_response'
    });
  }
  let value = result.data;
  return {
    messageId: value.id,
    time: value.time,
    event: value.event,
    topic: value.topic,
    ...pickDefined({
      sequenceId: value.sequence_id ?? undefined,
      expires: value.expires ?? undefined,
      title: value.title ?? undefined,
      message: value.message ?? undefined,
      priority: value.priority ?? undefined,
      tags: value.tags ?? undefined,
      clickUrl: value.click ?? undefined,
      iconUrl: value.icon ?? undefined,
      attachment: value.attachment
        ? {
            name: value.attachment.name,
            url: value.attachment.url,
            ...pickDefined({
              type: value.attachment.type ?? undefined,
              size: value.attachment.size ?? undefined,
              expires: value.attachment.expires ?? undefined
            })
          }
        : undefined
    })
  };
};
