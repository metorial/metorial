import { createAxios } from 'slates';

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
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string; applicationId: string }) {
    this.http = createAxios({
      baseURL: `https://api-${params.applicationId}.sendbird.com/v3`,
      headers: {
        'Api-Token': params.token,
        'Content-Type': 'application/json; charset=utf8'
      }
    });
  }

  // --- Bot Management ---

  async createBot(params: CreateBotParams) {
    let body: Record<string, unknown> = {
      bot_userid: params.botUserId,
      bot_nickname: params.botNickname
    };

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

    let response = await this.http.post('/bots', body);
    return response.data;
  }

  async listBots(params?: { paginationToken?: string; limit?: number }) {
    let queryParams: Record<string, unknown> = {};
    if (params?.paginationToken) queryParams.token = params.paginationToken;
    if (params?.limit) queryParams.limit = params.limit;

    let response = await this.http.get('/bots', { params: queryParams });
    return response.data;
  }

  async getBot(botUserId: string) {
    let response = await this.http.get(`/bots/${encodeURIComponent(botUserId)}`);
    return response.data;
  }

  async updateBot(botUserId: string, params: UpdateBotParams) {
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
    return response.data;
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
      channel_url: channelUrl
    };

    if (customType !== undefined) body.custom_type = customType;

    let response = await this.http.post(`/bots/${encodeURIComponent(botUserId)}/send`, body);
    return response.data;
  }

  async generateAiReply(
    botUserId: string,
    messages: ConversationMessage[],
    useStreaming?: boolean
  ) {
    let body: Record<string, unknown> = {
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    };

    if (useStreaming !== undefined) body.use_streaming_response = useStreaming;

    let response = await this.http.post(
      `/bots/${encodeURIComponent(botUserId)}/ai_chatbot_replies`,
      body
    );
    return response.data;
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
