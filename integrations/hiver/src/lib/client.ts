import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api2.hiverhq.com/v1';

let stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

let recordValue = (value: unknown): Record<string, unknown> | undefined =>
  isApiErrorRecord(value) ? value : undefined;

let requiredId = (value: unknown, resource: string): string => {
  let id = stringValue(value);
  if (!id) {
    throw createApiServiceError(`Hiver returned ${resource} without an ID.`, {
      reason: 'invalid_hiver_response'
    });
  }
  return id;
};

let unwrap = (value: unknown): unknown =>
  isApiErrorRecord(value) && 'data' in value ? value.data : value;

let resourceRecord = (value: unknown, resource: string): Record<string, unknown> => {
  let data = unwrap(value);
  let record = recordValue(Array.isArray(data) ? data[0] : data);
  if (!record) {
    throw createApiServiceError(`Hiver did not return a valid ${resource}.`, {
      reason: 'invalid_hiver_response'
    });
  }
  return record;
};

let inboxFrom = (value: unknown): HiverInbox => {
  let inbox = resourceRecord(value, 'inbox');
  return {
    id: requiredId(inbox.id, 'an inbox'),
    name: stringValue(inbox.display_name ?? inbox.name) ?? '',
    email: stringValue(inbox.email),
    type: stringValue(inbox.channel_type ?? inbox.type)
  };
};

let userFrom = (value: unknown): HiverUser => {
  let user = resourceRecord(value, 'user');
  return {
    id: requiredId(user.id, 'a user'),
    name:
      stringValue(user.name) ??
      ([stringValue(user.first_name), stringValue(user.last_name)].filter(Boolean).join(' ') ||
        undefined),
    email: stringValue(user.email),
    role: stringValue(user.role)
  };
};

let tagFrom = (value: unknown): HiverTag => {
  let tag = resourceRecord(value, 'tag');
  return {
    id: requiredId(tag.tag_id ?? tag.id, 'a tag'),
    name: stringValue(tag.name),
    color: stringValue(tag.color_hexcode ?? tag.color_code ?? tag.color),
    description: stringValue(tag.description)
  };
};

let conversationFrom = (value: unknown, inboxId: string): HiverConversation => {
  let conversation = resourceRecord(value, 'conversation');
  let tags = Array.isArray(conversation.tags)
    ? conversation.tags.filter(isApiErrorRecord)
    : Array.isArray(conversation.tag_ids)
      ? conversation.tag_ids.map(id => ({ id: requiredId(id, 'a conversation tag') }))
      : undefined;
  return {
    id: requiredId(conversation.id, 'a conversation'),
    subject: stringValue(conversation.subject),
    status: stringValue(conversation.status),
    assignee: recordValue(conversation.assignee),
    tags,
    inboxId: stringValue(conversation.inboxId ?? conversation.inbox_id) ?? inboxId,
    from: recordValue(conversation.from),
    to: Array.isArray(conversation.to) ? conversation.to.filter(isApiErrorRecord) : undefined,
    createdAt: stringValue(conversation.createdAt ?? conversation.created_at),
    updatedAt: stringValue(conversation.updatedAt ?? conversation.updated_at),
    gmailThreadId: stringValue(conversation.gmail_thread_id),
    privatePermalink: stringValue(conversation.private_permalink),
    publicPermalink: stringValue(conversation.public_permalink)
  };
};

export class Client {
  private axios;
  private lastRequestAt = 0;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Hiver API key.', {
        reason: 'missing_hiver_token'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hiver',
          reason: 'hiver_api_error',
          detailKeys: ['message', 'Message', 'detail', 'error']
        })
    });
    this.axios.interceptors.request.use(async request => {
      // Multi-request discovery/update operations must respect Hiver's one-RPS limit.
      let wait = 1000 - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      this.lastRequestAt = Date.now();
      return request;
    });
  }

  private inboxPath(inboxId: string): string {
    if (!inboxId.trim()) {
      throw createApiServiceError('Provide an inboxId from list_inboxes.', {
        reason: 'invalid_hiver_inbox'
      });
    }
    return `/inboxes/${encodeURIComponent(inboxId)}`;
  }

  private conversationPath(inboxId: string, conversationId: string): string {
    if (!conversationId.trim()) {
      throw createApiServiceError('Provide a conversationId from list_conversations.', {
        reason: 'invalid_hiver_conversation'
      });
    }
    return `${this.inboxPath(inboxId)}/conversations/${encodeURIComponent(conversationId)}`;
  }

  private async allResults<T>(
    path: string,
    map: (value: unknown) => T,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    let results: T[] = [];
    let seen = new Set<string>();
    let nextPage: string | undefined;
    do {
      let response = await this.axios.get<unknown>(path, {
        params: { ...params, limit: 100, next_page: nextPage }
      });
      let data = unwrap(response.data);
      let records = Array.isArray(data) ? data : recordValue(data)?.results;
      if (!Array.isArray(records)) {
        throw createApiServiceError('Hiver did not return a valid resource list.', {
          reason: 'invalid_hiver_response'
        });
      }
      results.push(...records.map(map));
      let pagination = recordValue(recordValue(data)?.pagination);
      nextPage = stringValue(pagination?.next_page) || undefined;
      if (nextPage && seen.has(nextPage)) {
        throw createApiServiceError('Hiver repeated a pagination token. Retry the request.', {
          reason: 'invalid_hiver_pagination'
        });
      }
      if (nextPage) seen.add(nextPage);
    } while (nextPage);
    return results;
  }

  async listInboxes(): Promise<HiverInbox[]> {
    return this.allResults('/inboxes', inboxFrom);
  }

  async getInbox(inboxId: string): Promise<HiverInbox> {
    let response = await this.axios.get<unknown>(this.inboxPath(inboxId));
    return inboxFrom(response.data);
  }

  async getInboxUsers(inboxId: string): Promise<HiverUser[]> {
    return this.allResults(`${this.inboxPath(inboxId)}/users`, userFrom);
  }

  async searchInboxUsers(inboxId: string, query: string): Promise<HiverUser[]> {
    // Preserve name and partial-email queries; the provider search only accepts exact email.
    let users = await this.getInboxUsers(inboxId);
    let normalized = query.toLowerCase();
    return users.filter(user =>
      [user.name, user.email].some(value => value?.toLowerCase().includes(normalized))
    );
  }

  async getInboxTags(inboxId: string): Promise<HiverTag[]> {
    return this.allResults(`${this.inboxPath(inboxId)}/tags`, tagFrom);
  }

  async searchInboxTags(inboxId: string, query: string): Promise<HiverTag[]> {
    return this.allResults(`${this.inboxPath(inboxId)}/tags/search`, tagFrom, { name: query });
  }

  async createInboxTag(
    inboxId: string,
    tag: { name: string; color?: string; description?: string }
  ): Promise<HiverTag> {
    let response = await this.axios.post<unknown>(
      `${this.inboxPath(inboxId)}/tags`,
      pickDefined({ name: tag.name, color_hexcode: tag.color, description: tag.description })
    );
    return tagFrom(response.data);
  }

  async listConversations(
    inboxId: string,
    options?: { limit?: number; sortBy?: string; sortOrder?: string; nextPage?: string }
  ): Promise<{ results: HiverConversation[]; nextPage?: string }> {
    if (options?.limit !== undefined && !Number.isInteger(options.limit)) {
      throw createApiServiceError('limit must be a whole number from 10 to 100.', {
        reason: 'invalid_hiver_limit'
      });
    }
    let response = await this.axios.get<unknown>(`${this.inboxPath(inboxId)}/conversations`, {
      params: pickDefined({
        limit: options?.limit,
        sort_by: options?.sortBy,
        sort_order: options?.sortOrder,
        next_page: options?.nextPage
      })
    });
    let data = resourceRecord(response.data, 'conversation list');
    if (!Array.isArray(data.results)) {
      throw createApiServiceError('Hiver did not return a valid conversation list.', {
        reason: 'invalid_hiver_response'
      });
    }
    return {
      results: data.results.map(value => conversationFrom(value, inboxId)),
      nextPage: stringValue(recordValue(data.pagination)?.next_page) || undefined
    };
  }

  async getConversation(
    inboxId: string,
    conversationId: string,
    userEmail?: string
  ): Promise<HiverConversation> {
    let response = await this.axios.get<unknown>(
      this.conversationPath(inboxId, conversationId),
      { params: pickDefined({ user_email: userEmail }) }
    );
    return conversationFrom(response.data, inboxId);
  }

  async updateConversation(
    inboxId: string,
    conversationId: string,
    updates: { status?: string; assigneeId?: string; tags?: string[]; assigneeEmail?: string },
    userEmail?: string
  ): Promise<HiverConversation> {
    if (Object.values(updates).every(value => value === undefined)) {
      throw createApiServiceError(
        'Provide status, assigneeId, assigneeEmail, or tags to update.',
        {
          reason: 'empty_hiver_update'
        }
      );
    }
    let body: Record<string, unknown> = {};
    if (updates.status !== undefined) {
      let name = updates.status === 'closed' ? 'close' : updates.status;
      if (!['open', 'close', 'pending'].includes(name)) {
        throw createApiServiceError('status must be open, close (or closed), or pending.', {
          reason: 'invalid_hiver_status'
        });
      }
      body.status = { name };
    }
    if (updates.assigneeId !== undefined && updates.assigneeEmail !== undefined) {
      throw createApiServiceError('Provide either assigneeId or assigneeEmail.', {
        reason: 'invalid_hiver_assignee'
      });
    }
    let assigneeEmail = updates.assigneeEmail;
    if (updates.assigneeId !== undefined) {
      let users = await this.getInboxUsers(inboxId);
      assigneeEmail = users.find(user => user.id === updates.assigneeId)?.email;
      if (!assigneeEmail) {
        throw createApiServiceError(
          'assigneeId must identify a user from search_inbox_users.',
          {
            reason: 'invalid_hiver_assignee'
          }
        );
      }
    }
    if (assigneeEmail !== undefined) body.assignee = { email: assigneeEmail };
    if (updates.tags !== undefined) {
      let available = await this.getInboxTags(inboxId);
      let desired = updates.tags.map(value => {
        let matches = available.filter(tag => tag.id === value || tag.name === value);
        if (matches.length !== 1) {
          throw createApiServiceError(
            `Tag "${value}" must uniquely identify a tag from search_inbox_tags.`,
            { reason: 'invalid_hiver_tag' }
          );
        }
        return matches[0]!.id;
      });
      let current = await this.getConversation(inboxId, conversationId, userEmail);
      let currentIds = (current.tags ?? []).map(tag =>
        requiredId(tag.id ?? tag.tag_id, 'a tag')
      );
      body.tags = {
        to_apply: [...new Set(desired.filter(id => !currentIds.includes(id)))],
        to_remove: currentIds.filter(id => !desired.includes(id))
      };
    }
    await this.axios.patch(this.conversationPath(inboxId, conversationId), body, {
      params: pickDefined({ user_email: userEmail })
    });
    // PATCH returns204; read the resource to preserve the existing detailed output contract.
    return this.getConversation(inboxId, conversationId, userEmail);
  }

  async registerWebhook(url: string, events: string[]): Promise<{ webhookId: string }> {
    let response = await this.axios.post('/webhooks', { url, events });
    let data = response.data?.data ?? response.data;
    return { webhookId: data?.id ?? data?.webhook_id ?? '' };
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }
}

export interface HiverInbox {
  id: string;
  name: string;
  email?: string;
  type?: string;
}

export interface HiverUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface HiverTag {
  id: string;
  name?: string;
  color?: string;
  description?: string;
}

export interface HiverConversation {
  id: string;
  subject?: string;
  status?: string;
  assignee?: Record<string, unknown>;
  tags?: Record<string, unknown>[];
  inboxId?: string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
  gmailThreadId?: string;
  privatePermalink?: string;
  publicPermalink?: string;
}
