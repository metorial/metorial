import { createAxios } from 'slates';

export type PushType = 'note' | 'link' | 'file';

export interface Push {
  iden: string;
  active: boolean;
  created: number;
  modified: number;
  type: PushType;
  dismissed: boolean;
  guid?: string;
  direction: string;
  sender_iden?: string;
  sender_email?: string;
  sender_email_normalized?: string;
  sender_name?: string;
  receiver_iden?: string;
  receiver_email?: string;
  receiver_email_normalized?: string;
  target_device_iden?: string;
  source_device_iden?: string;
  client_iden?: string;
  channel_iden?: string;
  title?: string;
  body?: string;
  url?: string;
  file_name?: string;
  file_type?: string;
  file_url?: string;
  image_url?: string;
  image_width?: number;
  image_height?: number;
}

export interface Device {
  iden: string;
  active: boolean;
  created: number;
  modified: number;
  icon?: string;
  nickname?: string;
  generated_nickname?: boolean;
  manufacturer?: string;
  model?: string;
  app_version?: number;
  fingerprint?: string;
  key_fingerprint?: string;
  push_token?: string;
  has_sms?: string;
}

export interface Chat {
  iden: string;
  active: boolean;
  created: number;
  modified: number;
  muted: boolean;
  with: {
    email: string;
    email_normalized: string;
    iden?: string;
    image_url?: string;
    type: string;
    name?: string;
  };
}

export interface Subscription {
  iden: string;
  active: boolean;
  created: number;
  modified: number;
  muted: boolean;
  channel: {
    iden: string;
    tag: string;
    name: string;
    description?: string;
    image_url?: string;
    website_url?: string;
  };
}

export interface ChannelInfo {
  iden: string;
  tag: string;
  name: string;
  description?: string;
  image_url?: string;
  website_url?: string;
  subscriber_count?: number;
  recent_pushes?: Push[];
}

export interface UserProfile {
  iden: string;
  created: number;
  modified: number;
  email: string;
  email_normalized: string;
  name: string;
  image_url?: string;
  max_upload_size?: number;
}

export interface TextMessage {
  iden: string;
  active: boolean;
  created: number;
  modified: number;
  data: {
    target_device_iden: string;
    addresses: string[];
    message: string;
    guid?: string;
    status?: string;
    file_type?: string;
  };
  file_url?: string;
}

export interface UploadRequestResponse {
  file_name: string;
  file_type: string;
  file_url: string;
  upload_url: string;
}

export interface PaginatedResponse<T> {
  cursor?: string;
  items: T[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.pushbullet.com',
      headers: {
        'Access-Token': config.token
      }
    });
  }

  // ─── User ──────────────────────────────────────────────

  async getMe(): Promise<UserProfile> {
    let response = await this.axios.get('/v2/users/me');
    return response.data as UserProfile;
  }

  // ─── Pushes ────────────────────────────────────────────

  async listPushes(params?: {
    modifiedAfter?: string;
    active?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<{ pushes: Push[]; cursor?: string }> {
    let query: Record<string, string> = {};
    if (params?.modifiedAfter) query.modified_after = params.modifiedAfter;
    if (params?.active !== undefined) query.active = String(params.active);
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.limit) query.limit = String(params.limit);

    let response = await this.axios.get('/v2/pushes', { params: query });
    let data = response.data as { pushes: Push[]; cursor?: string };
    return data;
  }

  async createPush(push: {
    type: PushType;
    title?: string;
    body?: string;
    url?: string;
    fileName?: string;
    fileType?: string;
    fileUrl?: string;
    deviceIden?: string;
    email?: string;
    channelTag?: string;
    clientIden?: string;
    sourceDeviceIden?: string;
    guid?: string;
  }): Promise<Push> {
    let body: Record<string, string | undefined> = {
      type: push.type,
      title: push.title,
      body: push.body,
      url: push.url,
      file_name: push.fileName,
      file_type: push.fileType,
      file_url: push.fileUrl,
      device_iden: push.deviceIden,
      email: push.email,
      channel_tag: push.channelTag,
      client_iden: push.clientIden,
      source_device_iden: push.sourceDeviceIden,
      guid: push.guid
    };

    // Remove undefined values
    let cleanBody = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined)
    );

    let response = await this.axios.post('/v2/pushes', cleanBody);
    return response.data as Push;
  }

  async updatePush(pushIden: string, params: { dismissed?: boolean }): Promise<Push> {
    let response = await this.axios.post(`/v2/pushes/${pushIden}`, params);
    return response.data as Push;
  }

  async deletePush(pushIden: string): Promise<void> {
    await this.axios.delete(`/v2/pushes/${pushIden}`);
  }

  // ─── Devices ───────────────────────────────────────────

  async listDevices(params?: {
    active?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<{ devices: Device[]; cursor?: string }> {
    let query: Record<string, string> = {};
    if (params?.active !== undefined) query.active = String(params.active);
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.limit) query.limit = String(params.limit);

    let response = await this.axios.get('/v2/devices', { params: query });
    return response.data as { devices: Device[]; cursor?: string };
  }

  async createDevice(device: {
    nickname?: string;
    model?: string;
    manufacturer?: string;
    pushToken?: string;
    appVersion?: number;
    icon?: string;
    hasSms?: string;
  }): Promise<Device> {
    let body: Record<string, string | number | undefined> = {
      nickname: device.nickname,
      model: device.model,
      manufacturer: device.manufacturer,
      push_token: device.pushToken,
      app_version: device.appVersion,
      icon: device.icon,
      has_sms: device.hasSms
    };

    let cleanBody = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined)
    );

    let response = await this.axios.post('/v2/devices', cleanBody);
    return response.data as Device;
  }

  async updateDevice(
    deviceIden: string,
    device: {
      nickname?: string;
      model?: string;
      manufacturer?: string;
      icon?: string;
      hasSms?: string;
      pushToken?: string;
      appVersion?: number;
    }
  ): Promise<Device> {
    let body: Record<string, string | number | undefined> = {
      nickname: device.nickname,
      model: device.model,
      manufacturer: device.manufacturer,
      icon: device.icon,
      has_sms: device.hasSms,
      push_token: device.pushToken,
      app_version: device.appVersion
    };

    let cleanBody = Object.fromEntries(
      Object.entries(body).filter(([_, v]) => v !== undefined)
    );

    let response = await this.axios.post(`/v2/devices/${deviceIden}`, cleanBody);
    return response.data as Device;
  }

  async deleteDevice(deviceIden: string): Promise<void> {
    await this.axios.delete(`/v2/devices/${deviceIden}`);
  }

  // ─── Chats ─────────────────────────────────────────────

  async listChats(params?: {
    active?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<{ chats: Chat[]; cursor?: string }> {
    let query: Record<string, string> = {};
    if (params?.active !== undefined) query.active = String(params.active);
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.limit) query.limit = String(params.limit);

    let response = await this.axios.get('/v2/chats', { params: query });
    return response.data as { chats: Chat[]; cursor?: string };
  }

  async createChat(email: string): Promise<Chat> {
    let response = await this.axios.post('/v2/chats', { email });
    return response.data as Chat;
  }

  async updateChat(chatIden: string, params: { muted: boolean }): Promise<Chat> {
    let response = await this.axios.post(`/v2/chats/${chatIden}`, params);
    return response.data as Chat;
  }

  async deleteChat(chatIden: string): Promise<void> {
    await this.axios.delete(`/v2/chats/${chatIden}`);
  }

  // ─── Subscriptions ────────────────────────────────────

  async listSubscriptions(params?: {
    active?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<{ subscriptions: Subscription[]; cursor?: string }> {
    let query: Record<string, string> = {};
    if (params?.active !== undefined) query.active = String(params.active);
    if (params?.cursor) query.cursor = params.cursor;
    if (params?.limit) query.limit = String(params.limit);

    let response = await this.axios.get('/v2/subscriptions', { params: query });
    return response.data as { subscriptions: Subscription[]; cursor?: string };
  }

  async createSubscription(channelTag: string): Promise<Subscription> {
    let response = await this.axios.post('/v2/subscriptions', { channel_tag: channelTag });
    return response.data as Subscription;
  }

  async updateSubscription(
    subscriptionIden: string,
    params: { muted: boolean }
  ): Promise<Subscription> {
    let response = await this.axios.post(`/v2/subscriptions/${subscriptionIden}`, params);
    return response.data as Subscription;
  }

  async deleteSubscription(subscriptionIden: string): Promise<void> {
    await this.axios.delete(`/v2/subscriptions/${subscriptionIden}`);
  }

  // ─── Channels ──────────────────────────────────────────

  async getChannelInfo(tag: string, noRecentPushes?: boolean): Promise<ChannelInfo> {
    let query: Record<string, string> = { tag };
    if (noRecentPushes) query.no_recent_pushes = 'true';

    let response = await this.axios.get('/v2/channel-info', { params: query });
    return response.data as ChannelInfo;
  }

  // ─── Texts (SMS/MMS) ──────────────────────────────────

  async createText(params: {
    targetDeviceIden: string;
    addresses: string[];
    message: string;
    fileType?: string;
    fileUrl?: string;
    guid?: string;
  }): Promise<TextMessage> {
    let body: Record<string, unknown> = {
      data: {
        target_device_iden: params.targetDeviceIden,
        addresses: params.addresses,
        message: params.message,
        ...(params.fileType ? { file_type: params.fileType } : {}),
        ...(params.guid ? { guid: params.guid } : {})
      },
      ...(params.fileUrl ? { file_url: params.fileUrl } : {})
    };

    let response = await this.axios.post('/v2/texts', body);
    return response.data as TextMessage;
  }

  async deleteText(textIden: string): Promise<void> {
    await this.axios.delete(`/v2/texts/${textIden}`);
  }

  // ─── Ephemerals ────────────────────────────────────────

  async sendEphemeral(push: Record<string, unknown>): Promise<void> {
    await this.axios.post('/v2/ephemerals', {
      type: 'push',
      push
    });
  }

  async sendClipboard(body: string, sourceDeviceIden?: string): Promise<void> {
    await this.sendEphemeral({
      type: 'clip',
      body,
      ...(sourceDeviceIden ? { source_device_iden: sourceDeviceIden } : {})
    });
  }

  // ─── Upload ────────────────────────────────────────────

  async requestUpload(fileName: string, fileType: string): Promise<UploadRequestResponse> {
    let response = await this.axios.post('/v2/upload-request', {
      file_name: fileName,
      file_type: fileType
    });
    return response.data as UploadRequestResponse;
  }
}
