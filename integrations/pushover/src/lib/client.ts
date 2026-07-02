import { createAxios } from 'slates';

export class PushoverClient {
  private axios;
  private token: string;
  private userKey: string;

  constructor(config: { token: string; userKey: string }) {
    this.token = config.token;
    this.userKey = config.userKey;
    this.axios = createAxios({
      baseURL: 'https://api.pushover.net/1'
    });
  }

  // ─── Messages ──────────────────────────────────────────────

  async sendMessage(params: {
    message: string;
    user?: string;
    title?: string;
    device?: string;
    priority?: number;
    sound?: string;
    timestamp?: number;
    html?: boolean;
    monospace?: boolean;
    url?: string;
    urlTitle?: string;
    ttl?: number;
    retry?: number;
    expire?: number;
    callback?: string;
    tags?: string;
    attachmentBase64?: string;
    attachmentType?: string;
  }): Promise<{
    status: number;
    request: string;
    receipt?: string;
  }> {
    let data: Record<string, string | number> = {
      token: this.token,
      user: params.user ?? this.userKey,
      message: params.message
    };

    if (params.title !== undefined) data.title = params.title;
    if (params.device !== undefined) data.device = params.device;
    if (params.priority !== undefined) data.priority = params.priority;
    if (params.sound !== undefined) data.sound = params.sound;
    if (params.timestamp !== undefined) data.timestamp = params.timestamp;
    if (params.html) data.html = 1;
    if (params.monospace) data.monospace = 1;
    if (params.url !== undefined) data.url = params.url;
    if (params.urlTitle !== undefined) data.url_title = params.urlTitle;
    if (params.ttl !== undefined) data.ttl = params.ttl;
    if (params.retry !== undefined) data.retry = params.retry;
    if (params.expire !== undefined) data.expire = params.expire;
    if (params.callback !== undefined) data.callback = params.callback;
    if (params.tags !== undefined) data.tags = params.tags;
    if (params.attachmentBase64 !== undefined)
      data.attachment_base64 = params.attachmentBase64;
    if (params.attachmentType !== undefined) data.attachment_type = params.attachmentType;

    let response = await this.axios.post('/messages.json', data);
    return response.data;
  }

  // ─── Receipts ──────────────────────────────────────────────

  async getReceiptStatus(receiptId: string): Promise<{
    status: number;
    acknowledged: number;
    acknowledgedAt: number;
    acknowledgedBy: string;
    acknowledgedByDevice: string;
    lastDeliveredAt: number;
    expired: number;
    expiresAt: number;
    calledBack: number;
    calledBackAt: number;
    request: string;
  }> {
    let response = await this.axios.get(`/receipts/${receiptId}.json`, {
      params: { token: this.token }
    });
    let d = response.data;
    return {
      status: d.status,
      acknowledged: d.acknowledged,
      acknowledgedAt: d.acknowledged_at,
      acknowledgedBy: d.acknowledged_by,
      acknowledgedByDevice: d.acknowledged_by_device,
      lastDeliveredAt: d.last_delivered_at,
      expired: d.expired,
      expiresAt: d.expires_at,
      calledBack: d.called_back,
      calledBackAt: d.called_back_at,
      request: d.request
    };
  }

  async cancelReceipt(receiptId: string): Promise<{ status: number; request: string }> {
    let response = await this.axios.post(`/receipts/${receiptId}/cancel.json`, {
      token: this.token
    });
    return response.data;
  }

  async cancelReceiptByTag(tag: string): Promise<{ status: number; request: string }> {
    let response = await this.axios.post(`/receipts/cancel_by_tag/${tag}.json`, {
      token: this.token
    });
    return response.data;
  }

  // ─── Groups ────────────────────────────────────────────────

  async listGroups(): Promise<{
    groups: Array<{ group: string; name: string }>;
    status: number;
    request: string;
  }> {
    let response = await this.axios.get('/groups.json', {
      params: { token: this.token }
    });
    return response.data;
  }

  async createGroup(name: string): Promise<{
    group: string;
    status: number;
    request: string;
  }> {
    let response = await this.axios.post('/groups.json', {
      token: this.token,
      name
    });
    return response.data;
  }

  async getGroup(groupKey: string): Promise<{
    name: string;
    users: Array<{
      user: string;
      device: string;
      memo: string;
      disabled: boolean;
    }>;
    status: number;
    request: string;
  }> {
    let response = await this.axios.get(`/groups/${groupKey}.json`, {
      params: { token: this.token }
    });
    return response.data;
  }

  async addUserToGroup(
    groupKey: string,
    params: {
      userKey: string;
      device?: string;
      memo?: string;
    }
  ): Promise<{ status: number; request: string }> {
    let data: Record<string, string> = {
      token: this.token,
      user: params.userKey
    };
    if (params.device !== undefined) data.device = params.device;
    if (params.memo !== undefined) data.memo = params.memo;

    let response = await this.axios.post(`/groups/${groupKey}/add_user.json`, data);
    return response.data;
  }

  async removeUserFromGroup(
    groupKey: string,
    params: {
      userKey: string;
      device?: string;
    }
  ): Promise<{ status: number; request: string }> {
    let data: Record<string, string> = {
      token: this.token,
      user: params.userKey
    };
    if (params.device !== undefined) data.device = params.device;

    let response = await this.axios.post(`/groups/${groupKey}/remove_user.json`, data);
    return response.data;
  }

  async disableUserInGroup(
    groupKey: string,
    params: {
      userKey: string;
      device?: string;
    }
  ): Promise<{ status: number; request: string }> {
    let data: Record<string, string> = {
      token: this.token,
      user: params.userKey
    };
    if (params.device !== undefined) data.device = params.device;

    let response = await this.axios.post(`/groups/${groupKey}/disable_user.json`, data);
    return response.data;
  }

  async enableUserInGroup(
    groupKey: string,
    params: {
      userKey: string;
      device?: string;
    }
  ): Promise<{ status: number; request: string }> {
    let data: Record<string, string> = {
      token: this.token,
      user: params.userKey
    };
    if (params.device !== undefined) data.device = params.device;

    let response = await this.axios.post(`/groups/${groupKey}/enable_user.json`, data);
    return response.data;
  }

  async renameGroup(
    groupKey: string,
    name: string
  ): Promise<{ status: number; request: string }> {
    let response = await this.axios.post(`/groups/${groupKey}/rename.json`, {
      token: this.token,
      name
    });
    return response.data;
  }

  // ─── Validation ────────────────────────────────────────────

  async validateUser(params: { userKey?: string; device?: string }): Promise<{
    status: number;
    group: number;
    devices: string[];
    licenses: string[];
    request: string;
  }> {
    let data: Record<string, string> = {
      token: this.token,
      user: params.userKey ?? this.userKey
    };
    if (params.device !== undefined) data.device = params.device;

    let response = await this.axios.post('/users/validate.json', data);
    return response.data;
  }

  // ─── Glances ───────────────────────────────────────────────

  async pushGlance(params: {
    user?: string;
    device?: string;
    title?: string;
    text?: string;
    subtext?: string;
    count?: number;
    percent?: number;
  }): Promise<{ status: number; request: string }> {
    let data: Record<string, string | number> = {
      token: this.token,
      user: params.user ?? this.userKey
    };
    if (params.device !== undefined) data.device = params.device;
    if (params.title !== undefined) data.title = params.title;
    if (params.text !== undefined) data.text = params.text;
    if (params.subtext !== undefined) data.subtext = params.subtext;
    if (params.count !== undefined) data.count = params.count;
    if (params.percent !== undefined) data.percent = params.percent;

    let response = await this.axios.post('/glances.json', data);
    return response.data;
  }

  // ─── Sounds ────────────────────────────────────────────────

  async listSounds(): Promise<{
    sounds: Record<string, string>;
    status: number;
    request: string;
  }> {
    let response = await this.axios.get('/sounds.json', {
      params: { token: this.token }
    });
    return response.data;
  }

  // ─── Limits ────────────────────────────────────────────────

  async getAppLimits(): Promise<{
    limit: number;
    remaining: number;
    reset: number;
    status: number;
    request: string;
  }> {
    let response = await this.axios.get('/apps/limits.json', {
      params: { token: this.token }
    });
    return response.data;
  }

  // ─── Subscriptions ────────────────────────────────────────

  async migrateSubscription(params: {
    subscription: string;
    userKey?: string;
    deviceName?: string;
    sound?: string;
  }): Promise<{
    status: number;
    subscribedUserKey: string;
    request: string;
  }> {
    let data: Record<string, string> = {
      token: this.token,
      subscription: params.subscription,
      user: params.userKey ?? this.userKey
    };
    if (params.deviceName !== undefined) data.device_name = params.deviceName;
    if (params.sound !== undefined) data.sound = params.sound;

    let response = await this.axios.post('/subscriptions/migrate.json', data);
    let d = response.data;
    return {
      status: d.status,
      subscribedUserKey: d.subscribed_user_key,
      request: d.request
    };
  }
}
