import { createAxios } from 'slates';
import type {
  FrontAccount,
  FrontAnalyticsExport,
  FrontChannel,
  FrontComment,
  FrontContact,
  FrontConversation,
  FrontEvent,
  FrontInbox,
  FrontKnowledgeBase,
  FrontKnowledgeBaseArticle,
  FrontKnowledgeBaseCategory,
  FrontLink,
  FrontMessage,
  FrontMessageTemplate,
  FrontPaginatedResponse,
  FrontRule,
  FrontShift,
  FrontSignature,
  FrontTag,
  FrontTeam,
  FrontTeammate
} from './types';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api2.frontapp.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Token Identity ----

  async getTokenIdentity(): Promise<{ id: string; name: string }> {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ---- Conversations ----

  async listConversations(params?: {
    q?: string;
    page_token?: string;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<FrontPaginatedResponse<FrontConversation>> {
    let response = await this.axios.get('/conversations', { params });
    return response.data;
  }

  async searchConversations(
    query: string,
    params?: {
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontConversation>> {
    let response = await this.axios.get('/conversations/search', {
      params: { ...params, q: query }
    });
    return response.data;
  }

  async getConversation(conversationId: string): Promise<FrontConversation> {
    let response = await this.axios.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async updateConversation(
    conversationId: string,
    data: {
      assignee_id?: string;
      inbox_id?: string;
      status?: 'archived' | 'open' | 'deleted' | 'spam';
      subject?: string;
      tag_ids?: string[];
    }
  ): Promise<void> {
    await this.axios.patch(`/conversations/${conversationId}`, data);
  }

  async updateConversationAssignee(conversationId: string, assigneeId: string): Promise<void> {
    await this.axios.put(`/conversations/${conversationId}/assignee`, {
      assignee_id: assigneeId
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.axios.delete(`/conversations/${conversationId}`);
  }

  async listConversationMessages(
    conversationId: string,
    params?: {
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontMessage>> {
    let response = await this.axios.get(`/conversations/${conversationId}/messages`, {
      params
    });
    return response.data;
  }

  async listConversationEvents(
    conversationId: string,
    params?: {
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontEvent>> {
    let response = await this.axios.get(`/conversations/${conversationId}/events`, { params });
    return response.data;
  }

  async addConversationFollowers(
    conversationId: string,
    teammateIds: string[]
  ): Promise<void> {
    await this.axios.post(`/conversations/${conversationId}/followers`, {
      teammate_ids: teammateIds
    });
  }

  async removeConversationFollowers(
    conversationId: string,
    teammateIds: string[]
  ): Promise<void> {
    await this.axios.delete(`/conversations/${conversationId}/followers`, {
      data: { teammate_ids: teammateIds }
    });
  }

  async addConversationTag(conversationId: string, tagId: string): Promise<void> {
    await this.axios.post(`/conversations/${conversationId}/tags`, {
      tag_ids: [tagId]
    });
  }

  async removeConversationTag(conversationId: string, tagId: string): Promise<void> {
    await this.axios.delete(`/conversations/${conversationId}/tags`, {
      data: { tag_ids: [tagId] }
    });
  }

  async addConversationLink(conversationId: string, linkId: string): Promise<void> {
    await this.axios.post(`/conversations/${conversationId}/links`, {
      link_ids: [linkId]
    });
  }

  async removeConversationLink(conversationId: string, linkId: string): Promise<void> {
    await this.axios.delete(`/conversations/${conversationId}/links`, {
      data: { link_ids: [linkId] }
    });
  }

  async updateConversationReminders(
    conversationId: string,
    data: {
      teammate_id: string;
      scheduled_at: number;
    }
  ): Promise<void> {
    await this.axios.patch(`/conversations/${conversationId}/reminders`, data);
  }

  // ---- Messages ----

  async createMessage(data: {
    author_id?: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    sender_name?: string;
    subject?: string;
    body: string;
    body_format?: 'html' | 'markdown';
    channel_id?: string;
    options?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<FrontMessage> {
    let response = await this.axios.post(`/channels/${data.channel_id || ''}/messages`, data);
    return response.data;
  }

  async sendNewMessage(
    channelId: string,
    data: {
      author_id?: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      sender_name?: string;
      subject?: string;
      body: string;
      body_format?: 'html' | 'markdown';
      options?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<FrontMessage> {
    let response = await this.axios.post(`/channels/${channelId}/messages`, data);
    return response.data;
  }

  async replyToConversation(
    conversationId: string,
    data: {
      author_id?: string;
      to?: string[];
      cc?: string[];
      bcc?: string[];
      sender_name?: string;
      subject?: string;
      body: string;
      body_format?: 'html' | 'markdown';
      channel_id?: string;
      options?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.axios.post(`/conversations/${conversationId}/messages`, data);
  }

  async getMessage(messageId: string): Promise<FrontMessage> {
    let response = await this.axios.get(`/messages/${messageId}`);
    return response.data;
  }

  async importMessage(data: {
    sender: { author_id?: string; handle: string; name?: string };
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body: string;
    body_format?: 'html' | 'markdown';
    external_id: string;
    created_at: number;
    type?: 'email' | 'sms' | 'intercom' | 'custom';
    assignee_id?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.axios.post(`/inboxes/${(data as any).inbox_id}/imported_messages`, data);
  }

  // ---- Contacts ----

  async listContacts(params?: {
    q?: string;
    page_token?: string;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<FrontPaginatedResponse<FrontContact>> {
    let response = await this.axios.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string): Promise<FrontContact> {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: {
    name?: string;
    description?: string;
    is_spammer?: boolean;
    links?: string[];
    group_names?: string[];
    handles?: { handle: string; source: string }[];
    custom_fields?: Record<string, string>;
  }): Promise<FrontContact> {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      name?: string;
      description?: string;
      is_spammer?: boolean;
      links?: string[];
      group_names?: string[];
      custom_fields?: Record<string, string>;
    }
  ): Promise<FrontContact> {
    let response = await this.axios.patch(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  async addContactHandle(contactId: string, handle: string, source: string): Promise<void> {
    await this.axios.post(`/contacts/${contactId}/handles`, { handle, source });
  }

  async deleteContactHandle(
    contactId: string,
    data: { handle: string; source: string }
  ): Promise<void> {
    await this.axios.delete(`/contacts/${contactId}/handles`, { data });
  }

  async listContactConversations(
    contactId: string,
    params?: {
      q?: string;
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontConversation>> {
    let response = await this.axios.get(`/contacts/${contactId}/conversations`, { params });
    return response.data;
  }

  async mergeContacts(targetContactId: string, contactIds: string[]): Promise<FrontContact> {
    let response = await this.axios.post('/contacts/merge', {
      target_contact_id: targetContactId,
      contact_ids: contactIds
    });
    return response.data;
  }

  // ---- Accounts ----

  async listAccounts(params?: {
    page_token?: string;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<FrontPaginatedResponse<FrontAccount>> {
    let response = await this.axios.get('/accounts', { params });
    return response.data;
  }

  async getAccount(accountId: string): Promise<FrontAccount> {
    let response = await this.axios.get(`/accounts/${accountId}`);
    return response.data;
  }

  async createAccount(data: {
    name: string;
    description?: string;
    domains?: string[];
    external_id?: string;
    custom_fields?: Record<string, string>;
  }): Promise<FrontAccount> {
    let response = await this.axios.post('/accounts', data);
    return response.data;
  }

  async updateAccount(
    accountId: string,
    data: {
      name?: string;
      description?: string;
      domains?: string[];
      external_id?: string;
      custom_fields?: Record<string, string>;
    }
  ): Promise<FrontAccount> {
    let response = await this.axios.patch(`/accounts/${accountId}`, data);
    return response.data;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.axios.delete(`/accounts/${accountId}`);
  }

  async listAccountContacts(
    accountId: string,
    params?: {
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontContact>> {
    let response = await this.axios.get(`/accounts/${accountId}/contacts`, { params });
    return response.data;
  }

  async addContactToAccount(accountId: string, contactIds: string[]): Promise<void> {
    await this.axios.post(`/accounts/${accountId}/contacts`, { contact_ids: contactIds });
  }

  async removeContactFromAccount(accountId: string, contactIds: string[]): Promise<void> {
    await this.axios.delete(`/accounts/${accountId}/contacts`, {
      data: { contact_ids: contactIds }
    });
  }

  // ---- Tags ----

  async listTags(params?: {
    page_token?: string;
    limit?: number;
  }): Promise<FrontPaginatedResponse<FrontTag>> {
    let response = await this.axios.get('/tags', { params });
    return response.data;
  }

  async getTag(tagId: string): Promise<FrontTag> {
    let response = await this.axios.get(`/tags/${tagId}`);
    return response.data;
  }

  async createTag(data: {
    name: string;
    description?: string;
    highlight?: string;
  }): Promise<FrontTag> {
    let response = await this.axios.post('/tags', data);
    return response.data;
  }

  async updateTag(
    tagId: string,
    data: {
      name?: string;
      description?: string;
      highlight?: string;
    }
  ): Promise<FrontTag> {
    let response = await this.axios.patch(`/tags/${tagId}`, data);
    return response.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.axios.delete(`/tags/${tagId}`);
  }

  async listTagChildren(
    tagId: string,
    params?: {
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontTag>> {
    let response = await this.axios.get(`/tags/${tagId}/children`, { params });
    return response.data;
  }

  async createChildTag(
    tagId: string,
    data: {
      name: string;
      description?: string;
      highlight?: string;
    }
  ): Promise<FrontTag> {
    let response = await this.axios.post(`/tags/${tagId}/children`, data);
    return response.data;
  }

  async listTaggedConversations(
    tagId: string,
    params?: {
      q?: string;
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontConversation>> {
    let response = await this.axios.get(`/tags/${tagId}/conversations`, { params });
    return response.data;
  }

  // ---- Inboxes ----

  async listInboxes(params?: {
    page_token?: string;
    limit?: number;
  }): Promise<FrontPaginatedResponse<FrontInbox>> {
    let response = await this.axios.get('/inboxes', { params });
    return response.data;
  }

  async getInbox(inboxId: string): Promise<FrontInbox> {
    let response = await this.axios.get(`/inboxes/${inboxId}`);
    return response.data;
  }

  async createInbox(data: { name: string; teammate_ids?: string[] }): Promise<FrontInbox> {
    let response = await this.axios.post('/inboxes', data);
    return response.data;
  }

  async listInboxChannels(inboxId: string): Promise<FrontPaginatedResponse<FrontChannel>> {
    let response = await this.axios.get(`/inboxes/${inboxId}/channels`);
    return response.data;
  }

  async listInboxConversations(
    inboxId: string,
    params?: {
      q?: string;
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontConversation>> {
    let response = await this.axios.get(`/inboxes/${inboxId}/conversations`, { params });
    return response.data;
  }

  async addInboxAccess(inboxId: string, teammateIds: string[]): Promise<void> {
    await this.axios.post(`/inboxes/${inboxId}/teammates`, {
      teammate_ids: teammateIds
    });
  }

  async removeInboxAccess(inboxId: string, teammateIds: string[]): Promise<void> {
    await this.axios.delete(`/inboxes/${inboxId}/teammates`, {
      data: { teammate_ids: teammateIds }
    });
  }

  // ---- Channels ----

  async listChannels(): Promise<FrontPaginatedResponse<FrontChannel>> {
    let response = await this.axios.get('/channels');
    return response.data;
  }

  async getChannel(channelId: string): Promise<FrontChannel> {
    let response = await this.axios.get(`/channels/${channelId}`);
    return response.data;
  }

  // ---- Teammates ----

  async listTeammates(params?: {
    page_token?: string;
    limit?: number;
  }): Promise<FrontPaginatedResponse<FrontTeammate>> {
    let response = await this.axios.get('/teammates', { params });
    return response.data;
  }

  async getTeammate(teammateId: string): Promise<FrontTeammate> {
    let response = await this.axios.get(`/teammates/${teammateId}`);
    return response.data;
  }

  async updateTeammate(
    teammateId: string,
    data: {
      username?: string;
      first_name?: string;
      last_name?: string;
      is_available?: boolean;
    }
  ): Promise<void> {
    await this.axios.patch(`/teammates/${teammateId}`, data);
  }

  async listTeammateConversations(
    teammateId: string,
    params?: {
      q?: string;
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontConversation>> {
    let response = await this.axios.get(`/teammates/${teammateId}/conversations`, { params });
    return response.data;
  }

  // ---- Teams ----

  async listTeams(): Promise<FrontPaginatedResponse<FrontTeam>> {
    let response = await this.axios.get('/teams');
    return response.data;
  }

  async getTeam(teamId: string): Promise<FrontTeam> {
    let response = await this.axios.get(`/teams/${teamId}`);
    return response.data;
  }

  async addTeammates(teamId: string, teammateIds: string[]): Promise<void> {
    await this.axios.post(`/teams/${teamId}/teammates`, {
      teammate_ids: teammateIds
    });
  }

  async removeTeammates(teamId: string, teammateIds: string[]): Promise<void> {
    await this.axios.delete(`/teams/${teamId}/teammates`, {
      data: { teammate_ids: teammateIds }
    });
  }

  // ---- Comments ----

  async getComment(commentId: string): Promise<FrontComment> {
    let response = await this.axios.get(`/comments/${commentId}`);
    return response.data;
  }

  async addComment(
    conversationId: string,
    data: {
      author_id?: string;
      body: string;
    }
  ): Promise<FrontComment> {
    let response = await this.axios.post(`/conversations/${conversationId}/comments`, data);
    return response.data;
  }

  async replyToComment(
    commentId: string,
    data: {
      author_id?: string;
      body: string;
    }
  ): Promise<FrontComment> {
    let response = await this.axios.post(`/comments/${commentId}/reply`, data);
    return response.data;
  }

  // ---- Links ----

  async listLinks(params?: {
    q?: string;
    page_token?: string;
    limit?: number;
  }): Promise<FrontPaginatedResponse<FrontLink>> {
    let response = await this.axios.get('/links', { params });
    return response.data;
  }

  async getLink(linkId: string): Promise<FrontLink> {
    let response = await this.axios.get(`/links/${linkId}`);
    return response.data;
  }

  async createLink(data: {
    name?: string;
    external_url: string;
    type?: string;
    custom_fields?: Record<string, string>;
  }): Promise<FrontLink> {
    let response = await this.axios.post('/links', data);
    return response.data;
  }

  async updateLink(
    linkId: string,
    data: {
      name?: string;
      custom_fields?: Record<string, string>;
    }
  ): Promise<FrontLink> {
    let response = await this.axios.patch(`/links/${linkId}`, data);
    return response.data;
  }

  // ---- Message Templates ----

  async listMessageTemplates(params?: {
    page_token?: string;
    limit?: number;
  }): Promise<FrontPaginatedResponse<FrontMessageTemplate>> {
    let response = await this.axios.get('/message_templates', { params });
    return response.data;
  }

  async getMessageTemplate(templateId: string): Promise<FrontMessageTemplate> {
    let response = await this.axios.get(`/message_templates/${templateId}`);
    return response.data;
  }

  async createMessageTemplate(data: {
    name: string;
    subject?: string;
    body: string;
    folder_id?: string;
  }): Promise<FrontMessageTemplate> {
    let response = await this.axios.post('/message_templates', data);
    return response.data;
  }

  async updateMessageTemplate(
    templateId: string,
    data: {
      name?: string;
      subject?: string;
      body?: string;
      folder_id?: string;
    }
  ): Promise<FrontMessageTemplate> {
    let response = await this.axios.patch(`/message_templates/${templateId}`, data);
    return response.data;
  }

  async deleteMessageTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/message_templates/${templateId}`);
  }

  // ---- Rules ----

  async listRules(): Promise<FrontPaginatedResponse<FrontRule>> {
    let response = await this.axios.get('/rules');
    return response.data;
  }

  async getRule(ruleId: string): Promise<FrontRule> {
    let response = await this.axios.get(`/rules/${ruleId}`);
    return response.data;
  }

  // ---- Analytics ----

  async createAnalyticsExport(data: {
    start: number;
    end: number;
    timezone?: string;
    filters?: Record<string, any>;
    type: string;
  }): Promise<FrontAnalyticsExport> {
    let response = await this.axios.post('/analytics/exports', data);
    return response.data;
  }

  async getAnalyticsExport(exportId: string): Promise<FrontAnalyticsExport> {
    let response = await this.axios.get(`/analytics/exports/${exportId}`);
    return response.data;
  }

  async createAnalyticsReport(data: {
    start: number;
    end: number;
    timezone?: string;
    filters?: Record<string, any>;
    metrics: string[];
  }): Promise<any> {
    let response = await this.axios.post('/analytics/reports', data);
    return response.data;
  }

  async getAnalyticsReport(reportId: string): Promise<any> {
    let response = await this.axios.get(`/analytics/reports/${reportId}`);
    return response.data;
  }

  // ---- Knowledge Base ----

  async listKnowledgeBases(): Promise<FrontPaginatedResponse<FrontKnowledgeBase>> {
    let response = await this.axios.get('/knowledge_bases');
    return response.data;
  }

  async getKnowledgeBase(kbId: string): Promise<FrontKnowledgeBase> {
    let response = await this.axios.get(`/knowledge_bases/${kbId}`);
    return response.data;
  }

  async listKnowledgeBaseCategories(
    kbId: string
  ): Promise<FrontPaginatedResponse<FrontKnowledgeBaseCategory>> {
    let response = await this.axios.get(`/knowledge_bases/${kbId}/categories`);
    return response.data;
  }

  async listKnowledgeBaseArticles(
    kbId: string,
    params?: {
      page_token?: string;
      limit?: number;
    }
  ): Promise<FrontPaginatedResponse<FrontKnowledgeBaseArticle>> {
    let response = await this.axios.get(`/knowledge_bases/${kbId}/articles`, { params });
    return response.data;
  }

  // ---- Events ----

  async listEvents(params?: {
    q?: string;
    page_token?: string;
    limit?: number;
  }): Promise<FrontPaginatedResponse<FrontEvent>> {
    let response = await this.axios.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string): Promise<FrontEvent> {
    let response = await this.axios.get(`/events/${eventId}`);
    return response.data;
  }

  // ---- Drafts ----

  async listConversationDrafts(
    conversationId: string
  ): Promise<FrontPaginatedResponse<FrontMessage>> {
    let response = await this.axios.get(`/conversations/${conversationId}/drafts`);
    return response.data;
  }

  async createDraft(
    conversationId: string,
    data: {
      author_id: string;
      to?: string[];
      cc?: string[];
      bcc?: string[];
      subject?: string;
      body: string;
      body_format?: 'html' | 'markdown';
      channel_id?: string;
    }
  ): Promise<FrontMessage> {
    let response = await this.axios.post(`/conversations/${conversationId}/drafts`, data);
    return response.data;
  }

  // ---- Shifts ----

  async listShifts(): Promise<FrontPaginatedResponse<FrontShift>> {
    let response = await this.axios.get('/shifts');
    return response.data;
  }

  async getShift(shiftId: string): Promise<FrontShift> {
    let response = await this.axios.get(`/shifts/${shiftId}`);
    return response.data;
  }

  // ---- Signatures ----

  async listTeammateSignatures(
    teammateId: string
  ): Promise<FrontPaginatedResponse<FrontSignature>> {
    let response = await this.axios.get(`/teammates/${teammateId}/signatures`);
    return response.data;
  }
}
