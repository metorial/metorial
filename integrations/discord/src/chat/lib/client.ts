import { ChatErrors } from '@slates/adapter-chat';
import { createAxios } from '@slates/provider';
import axios, { type AxiosAdapter, getAdapter, isAxiosError } from 'axios';
import type { DiscordApiMessage, DiscordAuthOutput } from './types';

export let DISCORD_API_BASE_URL = 'https://discord.com/api/v10';

let readRetryAfterMs = (error: {
  response?: { data?: unknown; headers?: Record<string, unknown> | object };
}) => {
  let data = error.response?.data as { retry_after?: unknown } | undefined;
  if (typeof data?.retry_after === 'number') return Math.ceil(data.retry_after * 1000);

  let header = (error.response?.headers as Record<string, unknown> | undefined)?.[
    'retry-after'
  ];
  let seconds = typeof header === 'string' ? Number(header) : undefined;
  return seconds !== undefined && Number.isFinite(seconds)
    ? Math.ceil(seconds * 1000)
    : undefined;
};

let parseRetryBody = (data: unknown) => {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};

// Short rate limits (Discord often answers bursts with a sub-second `retry_after`) are
// waited out here; longer ones surface as `chat.rate_limit.exceeded` with the delay.
// https://docs.discord.com/developers/topics/rate-limits
let MAX_RATE_LIMIT_RETRIES = 2;
let MAX_RATE_LIMIT_WAIT_MS = 5_000;

let rateLimitRetryAdapter = (): AxiosAdapter => {
  let send = getAdapter(axios.defaults.adapter);
  return async config => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await send(config);
      } catch (error) {
        if (!isAxiosError(error) || error.response?.status !== 429) throw error;
        let waitMs = readRetryAfterMs({
          response: {
            data: parseRetryBody(error.response.data),
            headers: error.response.headers
          }
        });
        if (
          attempt >= MAX_RATE_LIMIT_RETRIES ||
          waitMs === undefined ||
          waitMs > MAX_RATE_LIMIT_WAIT_MS
        ) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, waitMs + 50));
      }
    }
  };
};

/**
 * Discord returns numeric JSON error codes (for example `10008` Unknown Message), which
 * the generic axios mapping does not read. Keep them as the upstream code so the chat
 * error mapper can classify by operation.
 */
export let createDiscordAxios = (headers: Record<string, string> = {}) =>
  createAxios({
    baseURL: DISCORD_API_BASE_URL,
    headers,
    adapter: rateLimitRetryAdapter(),
    errorMapping: {
      mapAxiosError: (error, inferred) => {
        let data = error.response?.data as { code?: unknown; message?: unknown } | undefined;
        let code =
          typeof data?.code === 'number' || typeof data?.code === 'string'
            ? String(data.code)
            : inferred.upstream?.code;
        let retryAfterMs = readRetryAfterMs(error);
        // Interaction webhook paths embed the interaction token; keep it out of errors.
        let url = inferred.upstream?.url?.replace(
          /\/(webhooks|interactions)\/([^/]+)\/[^/?]+/,
          '/$1/$2/[redacted]'
        );

        return {
          ...inferred,
          message:
            typeof data?.message === 'string' && data.message
              ? `Discord API error: ${data.message}`
              : inferred.message,
          upstream: { ...inferred.upstream, code, url },
          baggage: {
            ...inferred.baggage,
            ...(retryAfterMs !== undefined ? { retryAfterMs } : {})
          }
        };
      }
    }
  });

export interface DiscordUploadFile {
  filename: string;
  contentType?: string;
  bytes: Uint8Array;
  description?: string;
}

export interface DiscordMessagePayload {
  content?: string;
  embeds?: object[];
  message_reference?: Record<string, unknown>;
  allowed_mentions?: Record<string, unknown>;
  attachments?: Record<string, unknown>[];
  flags?: number;
}

/**
 * Builds a Discord multipart body: `payload_json` plus `files[n]`, with each new
 * attachment's `id` matching its `n`.
 * https://docs.discord.com/developers/reference#uploading-files
 */
export let buildDiscordMultipart = (
  payload: DiscordMessagePayload,
  files: DiscordUploadFile[],
  keptAttachments: Record<string, unknown>[] = []
) => {
  let form = new FormData();
  let attachments = [
    ...keptAttachments,
    ...files.map((file, index) => ({
      id: index,
      filename: file.filename,
      ...(file.description ? { description: file.description } : {})
    }))
  ];

  form.append('payload_json', JSON.stringify({ ...payload, attachments }));
  files.forEach((file, index) => {
    form.append(
      `files[${index}]`,
      new Blob([file.bytes], {
        type: file.contentType ?? 'application/octet-stream'
      }),
      file.filename
    );
  });

  return form;
};

export class DiscordChatClient {
  private api: ReturnType<typeof createDiscordAxios>;

  constructor(private readonly auth: DiscordAuthOutput) {
    if (auth.tokenType === 'Bearer') {
      throw ChatErrors.authInvalid({
        message:
          'Discord chat actions require the Bot Token connection; a user OAuth token cannot act as the bot.'
      });
    }

    this.api = createDiscordAxios({ Authorization: `Bot ${auth.token}` });
  }

  get botUserId() {
    return this.auth.botUserId;
  }

  async getCurrentUser(): Promise<any> {
    return (await this.api.get('/users/@me')).data;
  }

  async getCurrentApplication(): Promise<any> {
    return (await this.api.get('/applications/@me')).data;
  }

  async getUser(userId: string): Promise<any> {
    return (await this.api.get(`/users/${encodeURIComponent(userId)}`)).data;
  }

  async listGuilds(params: { limit?: number; after?: string }): Promise<any[]> {
    let query: Record<string, string> = {};
    if (params.limit) query.limit = String(params.limit);
    if (params.after) query.after = params.after;
    return (await this.api.get('/users/@me/guilds', { params: query })).data;
  }

  async getGuild(guildId: string): Promise<any> {
    return (await this.api.get(`/guilds/${encodeURIComponent(guildId)}`)).data;
  }

  async getGuildChannels(guildId: string): Promise<any[]> {
    return (await this.api.get(`/guilds/${encodeURIComponent(guildId)}/channels`)).data;
  }

  async getChannel(channelId: string): Promise<any> {
    return (await this.api.get(`/channels/${encodeURIComponent(channelId)}`)).data;
  }

  async createDm(userId: string): Promise<any> {
    return (await this.api.post('/users/@me/channels', { recipient_id: userId })).data;
  }

  async getMessage(channelId: string, messageId: string): Promise<DiscordApiMessage> {
    return (
      await this.api.get(
        `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`
      )
    ).data;
  }

  async listMessages(
    channelId: string,
    params: { limit: number; before?: string; after?: string }
  ): Promise<DiscordApiMessage[]> {
    let query: Record<string, string> = { limit: String(params.limit) };
    if (params.before) query.before = params.before;
    if (params.after) query.after = params.after;
    return (
      await this.api.get(`/channels/${encodeURIComponent(channelId)}/messages`, {
        params: query
      })
    ).data;
  }

  async createMessage(
    channelId: string,
    payload: DiscordMessagePayload,
    files: DiscordUploadFile[] = []
  ): Promise<DiscordApiMessage> {
    let path = `/channels/${encodeURIComponent(channelId)}/messages`;
    let body = files.length > 0 ? buildDiscordMultipart(payload, files) : payload;
    return (await this.api.post(path, body)).data;
  }

  async editMessage(
    channelId: string,
    messageId: string,
    payload: DiscordMessagePayload,
    files: DiscordUploadFile[] = [],
    keptAttachments?: Record<string, unknown>[]
  ): Promise<DiscordApiMessage> {
    let path = `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`;
    let body =
      files.length > 0
        ? buildDiscordMultipart(payload, files, keptAttachments ?? [])
        : keptAttachments
          ? { ...payload, attachments: keptAttachments }
          : payload;
    return (await this.api.patch(path, body)).data;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.api.delete(
      `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`
    );
  }

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await this.api.put(
      `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}/@me`
    );
  }

  async removeOwnReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await this.api.delete(
      `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}/@me`
    );
  }

  async triggerTyping(channelId: string): Promise<void> {
    await this.api.post(`/channels/${encodeURIComponent(channelId)}/typing`);
  }

  async listApplicationCommands(applicationId: string, guildId?: string): Promise<any[]> {
    let path = guildId
      ? `/applications/${encodeURIComponent(applicationId)}/guilds/${encodeURIComponent(guildId)}/commands`
      : `/applications/${encodeURIComponent(applicationId)}/commands`;
    return (await this.api.get(path)).data;
  }
}

/**
 * Interaction webhooks are authorized by the interaction token in the path, so these
 * calls carry no bot credential (matching the official client libraries).
 * https://docs.discord.com/developers/interactions/receiving-and-responding#followup-messages
 */
export class DiscordInteractionClient {
  private api = createDiscordAxios();

  constructor(
    private readonly applicationId: string,
    private readonly interactionToken: string
  ) {}

  private get basePath() {
    return `/webhooks/${encodeURIComponent(this.applicationId)}/${encodeURIComponent(this.interactionToken)}`;
  }

  async editOriginal(
    payload: DiscordMessagePayload,
    files: DiscordUploadFile[] = []
  ): Promise<DiscordApiMessage> {
    let body = files.length > 0 ? buildDiscordMultipart(payload, files) : payload;
    return (await this.api.patch(`${this.basePath}/messages/@original`, body)).data;
  }

  async getOriginal(): Promise<DiscordApiMessage> {
    return (await this.api.get(`${this.basePath}/messages/@original`)).data;
  }

  async respond(
    interactionId: string,
    type: number,
    data: DiscordMessagePayload,
    files: DiscordUploadFile[] = []
  ): Promise<void> {
    let path = `/interactions/${encodeURIComponent(interactionId)}/${encodeURIComponent(this.interactionToken)}/callback`;
    if (files.length > 0) {
      let form = buildDiscordMultipart(data, files);
      let payload = JSON.parse(String(form.get('payload_json')));
      form.set('payload_json', JSON.stringify({ type, data: payload }));
      await this.api.post(path, form);
      return;
    }
    await this.api.post(path, { type, data });
  }
}
