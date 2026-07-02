import { createAxios } from 'slates';

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
  filterMessageId?: string;
  filterMessage?: string;
  filterTitle?: string;
  filterPriority?: string;
  filterTags?: string;
}

export class Client {
  private serverUrl: string;
  private auth: NtfyAuth;

  constructor(config: NtfyClientConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.auth = config.auth;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.auth.token) {
      return { Authorization: `Bearer ${this.auth.token}` };
    }
    if (this.auth.username && this.auth.password) {
      let encoded = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString(
        'base64'
      );
      return { Authorization: `Basic ${encoded}` };
    }
    return {};
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: this.serverUrl,
      headers: this.getAuthHeaders()
    });
  }

  async publish(options: PublishOptions): Promise<NtfyMessage> {
    let http = this.createAxiosInstance();

    let payload: Record<string, unknown> = {
      topic: options.topic
    };

    if (options.message !== undefined) payload.message = options.message;
    if (options.title !== undefined) payload.title = options.title;
    if (options.priority !== undefined) payload.priority = options.priority;
    if (options.tags !== undefined && options.tags.length > 0) payload.tags = options.tags;
    if (options.markdown !== undefined) payload.markdown = options.markdown;
    if (options.clickUrl !== undefined) payload.click = options.clickUrl;
    if (options.iconUrl !== undefined) payload.icon = options.iconUrl;
    if (options.attachUrl !== undefined) payload.attach = options.attachUrl;
    if (options.filename !== undefined) payload.filename = options.filename;
    if (options.delay !== undefined) payload.delay = options.delay;
    if (options.email !== undefined) payload.email = options.email;
    if (options.call !== undefined) payload.call = options.call;
    if (options.cacheDisabled) payload.cache = 'no';
    if (options.firebaseDisabled) payload.firebase = 'no';

    if (options.actions && options.actions.length > 0) {
      payload.actions = options.actions.map(a => {
        let action: Record<string, unknown> = {
          action: a.action,
          label: a.label
        };
        if (a.url !== undefined) action.url = a.url;
        if (a.method !== undefined) action.method = a.method;
        if (a.headers !== undefined) action.headers = a.headers;
        if (a.body !== undefined) action.body = a.body;
        if (a.intent !== undefined) action.intent = a.intent;
        if (a.extras !== undefined) action.extras = a.extras;
        if (a.value !== undefined) action.value = a.value;
        if (a.clear !== undefined) action.clear = a.clear;
        return action;
      });
    }

    let response = await http.post('/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return mapMessage(response.data);
  }

  async updateMessage(options: UpdateMessageOptions): Promise<NtfyMessage> {
    let http = this.createAxiosInstance();

    let payload: Record<string, unknown> = {
      topic: options.topic,
      event: options.eventType,
      id: options.messageId
    };

    if (options.message !== undefined) payload.message = options.message;
    if (options.title !== undefined) payload.title = options.title;
    if (options.priority !== undefined) payload.priority = options.priority;
    if (options.tags !== undefined && options.tags.length > 0) payload.tags = options.tags;
    if (options.markdown !== undefined) payload.markdown = options.markdown;

    let response = await http.post('/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return mapMessage(response.data);
  }

  async pollMessages(options: PollOptions): Promise<NtfyMessage[]> {
    let http = this.createAxiosInstance();

    let params: Record<string, string> = {
      poll: '1'
    };

    if (options.since) params.since = options.since;
    if (options.scheduled) params.scheduled = '1';
    if (options.filterMessageId) params.id = options.filterMessageId;
    if (options.filterMessage) params.message = options.filterMessage;
    if (options.filterTitle) params.title = options.filterTitle;
    if (options.filterPriority) params.priority = options.filterPriority;
    if (options.filterTags) params.tags = options.filterTags;

    let response = await http.get(`/${encodeURIComponent(options.topic)}/json`, {
      params
    });

    let text =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    let lines = text
      .trim()
      .split('\n')
      .filter((line: string) => line.trim().length > 0);
    let messages: NtfyMessage[] = [];

    for (let line of lines) {
      try {
        let parsed = JSON.parse(line);
        if (parsed.event === 'message') {
          messages.push(mapMessage(parsed));
        }
      } catch {
        // skip unparseable lines
      }
    }

    return messages;
  }
}

export let mapMessage = (data: Record<string, unknown>): NtfyMessage => {
  let attachment = data.attachment as Record<string, unknown> | undefined;

  return {
    messageId: data.id as string,
    time: data.time as number,
    expires: data.expires as number | undefined,
    event: data.event as string,
    topic: data.topic as string,
    title: data.title as string | undefined,
    message: data.message as string | undefined,
    priority: data.priority as number | undefined,
    tags: data.tags as string[] | undefined,
    clickUrl: data.click as string | undefined,
    iconUrl: data.icon as string | undefined,
    actions: data.actions as ActionButton[] | undefined,
    attachment: attachment
      ? {
          name: attachment.name as string,
          url: attachment.url as string,
          type: attachment.type as string | undefined,
          size: attachment.size as number | undefined,
          expires: attachment.expires as number | undefined
        }
      : undefined
  };
};
