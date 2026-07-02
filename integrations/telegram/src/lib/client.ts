import { createAxios } from 'slates';

export class TelegramClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: `https://api.telegram.org/bot${token}`
    });
  }

  // ---- Bot Info ----

  async getMe(): Promise<any> {
    let response = await this.axios.get('/getMe');
    return response.data.result;
  }

  // ---- Messages ----

  async sendMessage(params: {
    chatId: string | number;
    text: string;
    parseMode?: string;
    replyToMessageId?: number;
    disableNotification?: boolean;
    replyMarkup?: any;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendMessage', {
      chat_id: params.chatId,
      text: params.text,
      parse_mode: params.parseMode,
      reply_parameters: params.replyToMessageId
        ? { message_id: params.replyToMessageId }
        : undefined,
      disable_notification: params.disableNotification,
      reply_markup: params.replyMarkup,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async editMessageText(params: {
    chatId?: string | number;
    messageId?: number;
    inlineMessageId?: string;
    text: string;
    parseMode?: string;
    replyMarkup?: any;
  }): Promise<any> {
    let response = await this.axios.post('/editMessageText', {
      chat_id: params.chatId,
      message_id: params.messageId,
      inline_message_id: params.inlineMessageId,
      text: params.text,
      parse_mode: params.parseMode,
      reply_markup: params.replyMarkup
    });
    return response.data.result;
  }

  async deleteMessage(params: {
    chatId: string | number;
    messageId: number;
  }): Promise<boolean> {
    let response = await this.axios.post('/deleteMessage', {
      chat_id: params.chatId,
      message_id: params.messageId
    });
    return response.data.result;
  }

  async forwardMessage(params: {
    chatId: string | number;
    fromChatId: string | number;
    messageId: number;
    disableNotification?: boolean;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/forwardMessage', {
      chat_id: params.chatId,
      from_chat_id: params.fromChatId,
      message_id: params.messageId,
      disable_notification: params.disableNotification,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async pinChatMessage(params: {
    chatId: string | number;
    messageId: number;
    disableNotification?: boolean;
  }): Promise<boolean> {
    let response = await this.axios.post('/pinChatMessage', {
      chat_id: params.chatId,
      message_id: params.messageId,
      disable_notification: params.disableNotification
    });
    return response.data.result;
  }

  async unpinChatMessage(params: {
    chatId: string | number;
    messageId?: number;
  }): Promise<boolean> {
    let response = await this.axios.post('/unpinChatMessage', {
      chat_id: params.chatId,
      message_id: params.messageId
    });
    return response.data.result;
  }

  async unpinAllChatMessages(params: { chatId: string | number }): Promise<boolean> {
    let response = await this.axios.post('/unpinAllChatMessages', {
      chat_id: params.chatId
    });
    return response.data.result;
  }

  // ---- Media ----

  async sendPhoto(params: {
    chatId: string | number;
    photo: string;
    caption?: string;
    parseMode?: string;
    replyToMessageId?: number;
    disableNotification?: boolean;
    replyMarkup?: any;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendPhoto', {
      chat_id: params.chatId,
      photo: params.photo,
      caption: params.caption,
      parse_mode: params.parseMode,
      reply_parameters: params.replyToMessageId
        ? { message_id: params.replyToMessageId }
        : undefined,
      disable_notification: params.disableNotification,
      reply_markup: params.replyMarkup,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async sendDocument(params: {
    chatId: string | number;
    document: string;
    caption?: string;
    parseMode?: string;
    replyToMessageId?: number;
    disableNotification?: boolean;
    replyMarkup?: any;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendDocument', {
      chat_id: params.chatId,
      document: params.document,
      caption: params.caption,
      parse_mode: params.parseMode,
      reply_parameters: params.replyToMessageId
        ? { message_id: params.replyToMessageId }
        : undefined,
      disable_notification: params.disableNotification,
      reply_markup: params.replyMarkup,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async sendAudio(params: {
    chatId: string | number;
    audio: string;
    caption?: string;
    parseMode?: string;
    duration?: number;
    performer?: string;
    title?: string;
    replyToMessageId?: number;
    disableNotification?: boolean;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendAudio', {
      chat_id: params.chatId,
      audio: params.audio,
      caption: params.caption,
      parse_mode: params.parseMode,
      duration: params.duration,
      performer: params.performer,
      title: params.title,
      reply_parameters: params.replyToMessageId
        ? { message_id: params.replyToMessageId }
        : undefined,
      disable_notification: params.disableNotification,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async sendVideo(params: {
    chatId: string | number;
    video: string;
    caption?: string;
    parseMode?: string;
    duration?: number;
    width?: number;
    height?: number;
    replyToMessageId?: number;
    disableNotification?: boolean;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendVideo', {
      chat_id: params.chatId,
      video: params.video,
      caption: params.caption,
      parse_mode: params.parseMode,
      duration: params.duration,
      width: params.width,
      height: params.height,
      reply_parameters: params.replyToMessageId
        ? { message_id: params.replyToMessageId }
        : undefined,
      disable_notification: params.disableNotification,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  // ---- File ----

  async getFile(fileId: string): Promise<any> {
    let response = await this.axios.get('/getFile', {
      params: { file_id: fileId }
    });
    return response.data.result;
  }

  getFileDownloadUrl(token: string, filePath: string): string {
    return `https://api.telegram.org/file/bot${token}/${filePath}`;
  }

  // ---- Chat ----

  async getChat(chatId: string | number): Promise<any> {
    let response = await this.axios.post('/getChat', {
      chat_id: chatId
    });
    return response.data.result;
  }

  async getChatMemberCount(chatId: string | number): Promise<number> {
    let response = await this.axios.post('/getChatMemberCount', {
      chat_id: chatId
    });
    return response.data.result;
  }

  async getChatMember(params: { chatId: string | number; userId: number }): Promise<any> {
    let response = await this.axios.post('/getChatMember', {
      chat_id: params.chatId,
      user_id: params.userId
    });
    return response.data.result;
  }

  async banChatMember(params: {
    chatId: string | number;
    userId: number;
    untilDate?: number;
    revokeMessages?: boolean;
  }): Promise<boolean> {
    let response = await this.axios.post('/banChatMember', {
      chat_id: params.chatId,
      user_id: params.userId,
      until_date: params.untilDate,
      revoke_messages: params.revokeMessages
    });
    return response.data.result;
  }

  async unbanChatMember(params: {
    chatId: string | number;
    userId: number;
    onlyIfBanned?: boolean;
  }): Promise<boolean> {
    let response = await this.axios.post('/unbanChatMember', {
      chat_id: params.chatId,
      user_id: params.userId,
      only_if_banned: params.onlyIfBanned
    });
    return response.data.result;
  }

  async setChatTitle(params: { chatId: string | number; title: string }): Promise<boolean> {
    let response = await this.axios.post('/setChatTitle', {
      chat_id: params.chatId,
      title: params.title
    });
    return response.data.result;
  }

  async setChatDescription(params: {
    chatId: string | number;
    description?: string;
  }): Promise<boolean> {
    let response = await this.axios.post('/setChatDescription', {
      chat_id: params.chatId,
      description: params.description
    });
    return response.data.result;
  }

  // ---- Polls ----

  async sendPoll(params: {
    chatId: string | number;
    question: string;
    options: Array<{ text: string }>;
    isAnonymous?: boolean;
    type?: string;
    allowsMultipleAnswers?: boolean;
    correctOptionId?: number;
    explanation?: string;
    openPeriod?: number;
    closeDate?: number;
    disableNotification?: boolean;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendPoll', {
      chat_id: params.chatId,
      question: params.question,
      options: params.options,
      is_anonymous: params.isAnonymous,
      type: params.type,
      allows_multiple_answers: params.allowsMultipleAnswers,
      correct_option_id: params.correctOptionId,
      explanation: params.explanation,
      open_period: params.openPeriod,
      close_date: params.closeDate,
      disable_notification: params.disableNotification,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async stopPoll(params: { chatId: string | number; messageId: number }): Promise<any> {
    let response = await this.axios.post('/stopPoll', {
      chat_id: params.chatId,
      message_id: params.messageId
    });
    return response.data.result;
  }

  // ---- Payments ----

  async sendInvoice(params: {
    chatId: string | number;
    title: string;
    description: string;
    payload: string;
    currency: string;
    prices: Array<{ label: string; amount: number }>;
    providerToken?: string;
    maxTipAmount?: number;
    suggestedTipAmounts?: number[];
    photoUrl?: string;
    photoSize?: number;
    photoWidth?: number;
    photoHeight?: number;
    needName?: boolean;
    needPhoneNumber?: boolean;
    needEmail?: boolean;
    needShippingAddress?: boolean;
    isFlexible?: boolean;
    disableNotification?: boolean;
    messageThreadId?: number;
  }): Promise<any> {
    let response = await this.axios.post('/sendInvoice', {
      chat_id: params.chatId,
      title: params.title,
      description: params.description,
      payload: params.payload,
      currency: params.currency,
      prices: params.prices,
      provider_token: params.providerToken,
      max_tip_amount: params.maxTipAmount,
      suggested_tip_amounts: params.suggestedTipAmounts,
      photo_url: params.photoUrl,
      photo_size: params.photoSize,
      photo_width: params.photoWidth,
      photo_height: params.photoHeight,
      need_name: params.needName,
      need_phone_number: params.needPhoneNumber,
      need_email: params.needEmail,
      need_shipping_address: params.needShippingAddress,
      is_flexible: params.isFlexible,
      disable_notification: params.disableNotification,
      message_thread_id: params.messageThreadId
    });
    return response.data.result;
  }

  async createInvoiceLink(params: {
    title: string;
    description: string;
    payload: string;
    currency: string;
    prices: Array<{ label: string; amount: number }>;
    providerToken?: string;
  }): Promise<string> {
    let response = await this.axios.post('/createInvoiceLink', {
      title: params.title,
      description: params.description,
      payload: params.payload,
      currency: params.currency,
      prices: params.prices,
      provider_token: params.providerToken
    });
    return response.data.result;
  }

  // ---- Inline & Callback ----

  async answerCallbackQuery(params: {
    callbackQueryId: string;
    text?: string;
    showAlert?: boolean;
    url?: string;
    cacheTime?: number;
  }): Promise<boolean> {
    let response = await this.axios.post('/answerCallbackQuery', {
      callback_query_id: params.callbackQueryId,
      text: params.text,
      show_alert: params.showAlert,
      url: params.url,
      cache_time: params.cacheTime
    });
    return response.data.result;
  }

  async answerInlineQuery(params: {
    inlineQueryId: string;
    results: any[];
    cacheTime?: number;
    isPersonal?: boolean;
    nextOffset?: string;
    button?: any;
  }): Promise<boolean> {
    let response = await this.axios.post('/answerInlineQuery', {
      inline_query_id: params.inlineQueryId,
      results: params.results,
      cache_time: params.cacheTime,
      is_personal: params.isPersonal,
      next_offset: params.nextOffset,
      button: params.button
    });
    return response.data.result;
  }

  // ---- Webhook ----

  async setWebhook(params: {
    url: string;
    allowedUpdates?: string[];
    secretToken?: string;
    maxConnections?: number;
  }): Promise<boolean> {
    let response = await this.axios.post('/setWebhook', {
      url: params.url,
      allowed_updates: params.allowedUpdates,
      secret_token: params.secretToken,
      max_connections: params.maxConnections
    });
    return response.data.result;
  }

  async deleteWebhook(params?: { dropPendingUpdates?: boolean }): Promise<boolean> {
    let response = await this.axios.post('/deleteWebhook', {
      drop_pending_updates: params?.dropPendingUpdates
    });
    return response.data.result;
  }

  // ---- Invite Links ----

  async createChatInviteLink(params: {
    chatId: string | number;
    name?: string;
    expireDate?: number;
    memberLimit?: number;
    createsJoinRequest?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/createChatInviteLink', {
      chat_id: params.chatId,
      name: params.name,
      expire_date: params.expireDate,
      member_limit: params.memberLimit,
      creates_join_request: params.createsJoinRequest
    });
    return response.data.result;
  }

  // ---- Chat Permissions ----

  async restrictChatMember(params: {
    chatId: string | number;
    userId: number;
    permissions: Record<string, boolean>;
    untilDate?: number;
  }): Promise<boolean> {
    let response = await this.axios.post('/restrictChatMember', {
      chat_id: params.chatId,
      user_id: params.userId,
      permissions: params.permissions,
      until_date: params.untilDate
    });
    return response.data.result;
  }

  async promoteChatMember(params: {
    chatId: string | number;
    userId: number;
    permissions: Record<string, boolean>;
  }): Promise<boolean> {
    let response = await this.axios.post('/promoteChatMember', {
      chat_id: params.chatId,
      user_id: params.userId,
      ...params.permissions
    });
    return response.data.result;
  }
}
