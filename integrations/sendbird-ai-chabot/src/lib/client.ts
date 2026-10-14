import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

let optionalString = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
let optionalBoolean = z
  .boolean()
  .nullish()
  .transform(value => value ?? undefined);
let botSchema = z.object({
  bot: z.object({
    bot_userid: z.string(),
    bot_nickname: z.string(),
    bot_profile_url: optionalString,
    bot_type: optionalString,
    bot_token: optionalString
  }),
  bot_callback_url: optionalString,
  is_privacy_mode: optionalBoolean,
  enable_mark_as_read: optionalBoolean,
  show_member: optionalBoolean,
  channel_invitation_preference: z
    .number()
    .nullish()
    .transform(value => value ?? undefined)
});
let messageSchema = z.object({
  message_id: z.number(),
  message: optionalString,
  channel_url: optionalString,
  created_at: z.number(),
  custom_type: optionalString,
  type: optionalString,
  data: optionalString,
  user: z.object({ user_id: z.string() }).nullish()
});

export interface BotAiConfig {
  backend?: string;
  model?: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface CreateBotParams {
  botUserId: string;
  botNickname: string;
  botProfileUrl?: string;
  botCallbackUrl?: string;
  botType?: string;
  isPrivacyMode?: boolean;
  enableMarkAsRead?: boolean;
  showMember?: boolean;
  channelInvitationPreference?: number;
  ai?: BotAiConfig;
}

export interface UpdateBotParams {
  botNickname?: string;
  botProfileUrl?: string;
  botCallbackUrl?: string;
  botType?: string;
  isPrivacyMode?: boolean;
  enableMarkAsRead?: boolean;
  showMember?: boolean;
  channelInvitationPreference?: number;
  ai?: BotAiConfig;
}

export interface ConversationMessage {
  role: string;
  content: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  includeMembersInPayload?: boolean;
  enabledEvents: string[];
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string; applicationId: unknown }) {
    if (typeof params.token !== 'string' || !params.token.trim()) {
      throw createApiServiceError('Provide a Sendbird API token.');
    }
    if (
      typeof params.applicationId !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9-]{0,62}$/.test(params.applicationId)
    ) {
      throw createApiServiceError(
        'Provide a valid Sendbird Application ID in authentication.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: `https://api-${params.applicationId}.sendbird.com/v3`,
      authHeader: { name: 'Api-Token', value: params.token },
      contentType: 'application/json; charset=utf8',
      timeout: 60000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Sendbird',
          reason: 'sendbird_api_error',
          extractUpstreamCode: (_error, response) => {
            let code = isApiErrorRecord(response?.data) ? response.data.code : undefined;
            return typeof code === 'string' || typeof code === 'number'
              ? String(code)
              : undefined;
          }
        })
    });
    this.http.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.error === true) {
        throw createApiServiceError(
          typeof response.data.message === 'string'
            ? response.data.message
            : 'Sendbird rejected the request.',
          {
            reason: 'sendbird_api_error',
            upstreamStatus: response.status,
            upstreamCode:
              typeof response.data.code === 'number' || typeof response.data.code === 'string'
                ? String(response.data.code)
                : undefined
          }
        );
      }
      return response;
    });
  }

  private parseResponse<T extends z.ZodType>(data: unknown, schema: T): z.output<T> {
    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(
        'Sendbird returned an unexpected response. Please retry or check the application API access.',
        {
          reason: 'sendbird_invalid_response'
        }
      );
    }
    return result.data;
  }

  // --- Bot Management ---

  async createBot(params: CreateBotParams) {
    if (!params.ai && !params.botCallbackUrl) {
      throw createApiServiceError(
        'Provide botCallbackUrl for a regular bot, or ai configuration for an AI bot.'
      );
    }
    let body: Record<string, unknown> = {
      bot_userid: params.botUserId,
      bot_nickname: params.botNickname,
      bot_profile_url: params.botProfileUrl ?? '',
      bot_type: params.botType ?? '',
      is_privacy_mode: params.isPrivacyMode ?? false
    };

    if (params.botCallbackUrl !== undefined) body.bot_callback_url = params.botCallbackUrl;
    if (params.enableMarkAsRead !== undefined)
      body.enable_mark_as_read = params.enableMarkAsRead;
    if (params.showMember !== undefined) body.show_member = params.showMember;
    if (params.channelInvitationPreference !== undefined)
      body.channel_invitation_preference = params.channelInvitationPreference;

    if (params.ai) {
      body.ai = this.serializeAiConfig(params.ai);
    }

    let response = await this.http.post('/bots', body);
    return this.parseResponse(response.data, botSchema);
  }

  async listBots(params?: { paginationToken?: string; limit?: number }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.paginationToken) queryParams.token = params.paginationToken;
    if (params?.limit !== undefined) queryParams.limit = params.limit;

    let response = await this.http.get('/bots', { params: queryParams });
    return this.parseResponse(
      response.data,
      z.object({ bots: z.array(botSchema), next: optionalString })
    );
  }

  async getBot(botUserId: string) {
    let response = await this.http.get(`/bots/${encodeURIComponent(botUserId)}`);
    return this.parseResponse(response.data, botSchema);
  }

  async updateBot(botUserId: string, params: UpdateBotParams) {
    if (Object.values(params).every(value => value === undefined)) {
      throw createApiServiceError('Provide at least one bot field to update.');
    }
    let body: Record<string, unknown> = {};

    if (params.botNickname !== undefined) body.bot_nickname = params.botNickname;
    if (params.botProfileUrl !== undefined) body.bot_profile_url = params.botProfileUrl;
    if (params.botCallbackUrl !== undefined) body.bot_callback_url = params.botCallbackUrl;
    if (params.botType !== undefined) body.bot_type = params.botType;
    if (params.isPrivacyMode !== undefined) body.is_privacy_mode = params.isPrivacyMode;
    if (params.enableMarkAsRead !== undefined)
      body.enable_mark_as_read = params.enableMarkAsRead;
    if (params.showMember !== undefined) body.show_member = params.showMember;
    if (params.channelInvitationPreference !== undefined)
      body.channel_invitation_preference = params.channelInvitationPreference;

    if (params.ai) {
      body.ai = this.serializeAiConfig(params.ai);
    }

    let response = await this.http.put(`/bots/${encodeURIComponent(botUserId)}`, body);
    return this.parseResponse(response.data, botSchema);
  }

  async deleteBot(botUserId: string) {
    let response = await this.http.delete(`/bots/${encodeURIComponent(botUserId)}`);
    return response.data;
  }

  // --- Bot Channel Management ---

  async joinChannels(botUserId: string, channelUrls: string[]) {
    let response = await this.http.post(`/bots/${encodeURIComponent(botUserId)}/channels`, {
      channel_urls: channelUrls
    });
    return response.data;
  }

  async leaveChannel(botUserId: string, channelUrl: string) {
    let response = await this.http.delete(
      `/bots/${encodeURIComponent(botUserId)}/channels/${encodeURIComponent(channelUrl)}`
    );
    return response.data;
  }

  async leaveAllChannels(botUserId: string) {
    let response = await this.http.delete(`/bots/${encodeURIComponent(botUserId)}/channels`);
    return response.data;
  }

  // --- Messaging ---

  async sendBotMessage(
    botUserId: string,
    channelUrl: string,
    message: string,
    customType?: string
  ) {
    let body: Record<string, unknown> = {
      message,
      channel_url: channelUrl,
      message_type: 'MESG'
    };

    if (customType !== undefined) body.custom_type = customType;

    let response = await this.http.post(`/bots/${encodeURIComponent(botUserId)}/send`, body);
    let data: unknown = response.data;
    if (isApiErrorRecord(data)) {
      data = isApiErrorRecord(data.message) ? data.message : (data.message_info ?? data);
    }
    return this.parseResponse(data, messageSchema);
  }

  async generateAiReply(
    botUserId: string,
    messages: ConversationMessage[],
    useStreaming?: boolean
  ) {
    if (useStreaming) {
      throw createApiServiceError(
        'Streaming replies are not supported by this tool. Set useStreamingResponse to false or omit it.'
      );
    }
    let body: Record<string, unknown> = {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      use_streaming_response: false
    };

    let response = await this.http.post(
      `/bots/${encodeURIComponent(botUserId)}/ai_chatbot_replies`,
      body
    );
    return this.parseResponse(
      response.data,
      z.object({
        reply_messages: z.array(
          z.object({
            role: optionalString,
            content: optionalString,
            message: optionalString
          })
        )
      })
    );
  }

  async listBotChannels(
    botUserId: string,
    params: { limit?: number; paginationToken?: string; nameContains?: string }
  ) {
    let response = await this.http.get(
      `/users/${encodeURIComponent(botUserId)}/my_group_channels`,
      {
        params: pickDefined({
          limit: params.limit,
          token: params.paginationToken,
          name_contains: params.nameContains,
          member_state_filter: 'joined_only',
          hidden_mode: 'all',
          show_empty: true
        })
      }
    );
    return this.parseResponse(
      response.data,
      z.object({
        channels: z.array(
          z.object({
            channel_url: z.string(),
            name: z.string(),
            member_count: z
              .number()
              .nullish()
              .transform(value => value ?? undefined),
            created_at: z
              .number()
              .nullish()
              .transform(value => value ?? undefined),
            custom_type: optionalString
          })
        ),
        next: optionalString
      })
    );
  }

  async getMessage(channelUrl: string, messageId: number) {
    let response = await this.http.get(
      `/group_channels/${encodeURIComponent(channelUrl)}/messages/${messageId}`
    );
    return this.parseResponse(response.data, messageSchema);
  }

  // --- Typing Indicators ---

  async startTypingIndicator(channelUrl: string, userIds: string[]) {
    let response = await this.http.post(
      `/group_channels/${encodeURIComponent(channelUrl)}/typing`,
      {
        user_ids: userIds
      }
    );
    return response.data;
  }

  async stopTypingIndicator(channelUrl: string, userIds: string[]) {
    let response = await this.http.delete(
      `/group_channels/${encodeURIComponent(channelUrl)}/typing`,
      {
        data: { user_ids: userIds }
      }
    );
    return response.data;
  }

  // --- Webhook Management ---

  async getWebhookConfig() {
    let response = await this.http.get('/applications/settings/webhook');
    return response.data;
  }

  async updateWebhookConfig(config: WebhookConfig) {
    let body: Record<string, unknown> = {
      enabled: config.enabled,
      url: config.url,
      enabled_events: config.enabledEvents
    };

    if (config.includeMembersInPayload !== undefined)
      body.include_members = config.includeMembersInPayload;

    let response = await this.http.put('/applications/settings/webhook', body);
    return response.data;
  }

  // --- Helpers ---

  private serializeAiConfig(ai: BotAiConfig): Record<string, unknown> {
    let config: Record<string, unknown> = {};

    if (ai.backend !== undefined) config.backend = ai.backend;
    if (ai.model !== undefined) config.model = ai.model;
    if (ai.systemMessage !== undefined) config.system_message = ai.systemMessage;
    if (ai.temperature !== undefined) config.temperature = ai.temperature;
    if (ai.maxTokens !== undefined) config.max_tokens = ai.maxTokens;
    if (ai.topP !== undefined) config.top_p = ai.topP;
    if (ai.presencePenalty !== undefined) config.presence_penalty = ai.presencePenalty;
    if (ai.frequencyPenalty !== undefined) config.frequency_penalty = ai.frequencyPenalty;

    return config;
  }
}
