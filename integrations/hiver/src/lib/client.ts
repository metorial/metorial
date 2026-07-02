import { createAxios } from 'slates';

let BASE_URL = 'https://api2.hiverhq.com/v1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- Inboxes ----

  async listInboxes(): Promise<HiverInbox[]> {
    let response = await this.axios.get('/inboxes');
    return response.data?.data?.results ?? response.data?.data ?? [];
  }

  async getInbox(inboxId: string): Promise<HiverInbox> {
    let response = await this.axios.get(`/inboxes/${inboxId}`);
    return response.data?.data ?? response.data;
  }

  async getInboxUsers(inboxId: string): Promise<HiverUser[]> {
    let response = await this.axios.get(`/inboxes/${inboxId}/users`);
    return response.data?.data?.results ?? response.data?.data ?? [];
  }

  async searchInboxUsers(inboxId: string, query: string): Promise<HiverUser[]> {
    let response = await this.axios.get(`/inboxes/${inboxId}/users/search`, {
      params: { q: query }
    });
    return response.data?.data?.results ?? response.data?.data ?? [];
  }

  async getInboxTags(inboxId: string): Promise<HiverTag[]> {
    let response = await this.axios.get(`/inboxes/${inboxId}/tags`);
    return response.data?.data?.results ?? response.data?.data ?? [];
  }

  async searchInboxTags(inboxId: string, query: string): Promise<HiverTag[]> {
    let response = await this.axios.get(`/inboxes/${inboxId}/tags/search`, {
      params: { q: query }
    });
    return response.data?.data?.results ?? response.data?.data ?? [];
  }

  // ---- Conversations ----

  async listConversations(
    inboxId: string,
    options?: {
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
      nextPage?: string;
    }
  ): Promise<{ results: HiverConversation[]; nextPage?: string }> {
    let params: Record<string, string | number> = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.sortBy) params.sort_by = options.sortBy;
    if (options?.sortOrder) params.sort_order = options.sortOrder;
    if (options?.nextPage) params.next_page = options.nextPage;

    let response = await this.axios.get(`/inboxes/${inboxId}/conversations`, { params });
    let data = response.data?.data;

    return {
      results: data?.results ?? [],
      nextPage: data?.pagination?.next_page
    };
  }

  async getConversation(inboxId: string, conversationId: string): Promise<HiverConversation> {
    let response = await this.axios.get(`/inboxes/${inboxId}/conversations/${conversationId}`);
    return response.data?.data ?? response.data;
  }

  async updateConversation(
    inboxId: string,
    conversationId: string,
    updates: {
      status?: string;
      assigneeId?: string;
      tags?: string[];
    }
  ): Promise<HiverConversation> {
    let body: Record<string, unknown> = {};
    if (updates.status !== undefined) body.status = updates.status;
    if (updates.assigneeId !== undefined) body.assignee_id = updates.assigneeId;
    if (updates.tags !== undefined) body.tags = updates.tags;

    let response = await this.axios.patch(
      `/inboxes/${inboxId}/conversations/${conversationId}`,
      body
    );
    return response.data?.data ?? response.data;
  }

  // ---- Webhooks ----

  async registerWebhook(url: string, events: string[]): Promise<{ webhookId: string }> {
    let response = await this.axios.post('/webhooks', {
      url,
      events
    });
    let data = response.data?.data ?? response.data;
    return { webhookId: data?.id ?? data?.webhook_id ?? '' };
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }
}

// ---- Types ----

export interface HiverInbox {
  id: string;
  name: string;
  email?: string;
  type?: string;
  [key: string]: unknown;
}

export interface HiverUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface HiverTag {
  id: string;
  name?: string;
  color?: string;
  [key: string]: unknown;
}

export interface HiverConversation {
  id: string;
  subject?: string;
  status?: string;
  assignee?: Record<string, unknown>;
  assigneeId?: string;
  tags?: Record<string, unknown>[];
  inboxId?: string;
  from?: Record<string, unknown>;
  to?: Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}
