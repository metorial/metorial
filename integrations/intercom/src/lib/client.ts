import { createAxios } from '@slates/provider';
import { intercomApiError } from './errors';

let regionBaseUrls: Record<string, string> = {
  us: 'https://api.intercom.io',
  eu: 'https://api.eu.intercom.io',
  au: 'https://api.au.intercom.io'
};

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region?: string }) {
    let baseURL = regionBaseUrls[config.region || 'us'] || regionBaseUrls.us;
    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Intercom-Version': '2.11'
      }
    });

    this.http.interceptors.response.use(
      response => response,
      error => Promise.reject(intercomApiError(error))
    );
  }

  // ──────── Contacts ────────

  async listContacts(params?: { perPage?: number; startingAfter?: string }) {
    let query = new URLSearchParams();
    if (params?.perPage) query.set('per_page', String(params.perPage));
    if (params?.startingAfter) query.set('starting_after', params.startingAfter);
    let qs = query.toString();
    let response = await this.http.get(`/contacts${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async getContactByExternalId(externalId: string) {
    let response = await this.http.get(
      `/contacts?external_id=${encodeURIComponent(externalId)}`
    );
    return response.data;
  }

  async createContact(data: {
    role?: string;
    externalId?: string;
    email?: string;
    phone?: string;
    name?: string;
    avatar?: string;
    signedUpAt?: string;
    lastSeenAt?: string;
    ownerId?: string;
    unsubscribedFromEmails?: boolean;
    customAttributes?: Record<string, any>;
  }) {
    let body: Record<string, any> = {};
    if (data.role) body.role = data.role;
    if (data.externalId) body.external_id = data.externalId;
    if (data.email) body.email = data.email;
    if (data.phone) body.phone = data.phone;
    if (data.name) body.name = data.name;
    if (data.avatar) body.avatar = data.avatar;
    if (data.signedUpAt)
      body.signed_up_at = Math.floor(new Date(data.signedUpAt).getTime() / 1000);
    if (data.lastSeenAt)
      body.last_seen_at = Math.floor(new Date(data.lastSeenAt).getTime() / 1000);
    if (data.ownerId) body.owner_id = data.ownerId;
    if (data.unsubscribedFromEmails !== undefined)
      body.unsubscribed_from_emails = data.unsubscribedFromEmails;
    if (data.customAttributes) body.custom_attributes = data.customAttributes;
    let response = await this.http.post('/contacts', body);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      role?: string;
      externalId?: string;
      email?: string;
      phone?: string;
      name?: string;
      avatar?: string;
      signedUpAt?: string;
      lastSeenAt?: string;
      ownerId?: string;
      unsubscribedFromEmails?: boolean;
      customAttributes?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.role) body.role = data.role;
    if (data.externalId) body.external_id = data.externalId;
    if (data.email) body.email = data.email;
    if (data.phone) body.phone = data.phone;
    if (data.name) body.name = data.name;
    if (data.avatar) body.avatar = data.avatar;
    if (data.signedUpAt)
      body.signed_up_at = Math.floor(new Date(data.signedUpAt).getTime() / 1000);
    if (data.lastSeenAt)
      body.last_seen_at = Math.floor(new Date(data.lastSeenAt).getTime() / 1000);
    if (data.ownerId) body.owner_id = data.ownerId;
    if (data.unsubscribedFromEmails !== undefined)
      body.unsubscribed_from_emails = data.unsubscribedFromEmails;
    if (data.customAttributes) body.custom_attributes = data.customAttributes;
    let response = await this.http.put(`/contacts/${contactId}`, body);
    return response.data;
  }

  async archiveContact(contactId: string) {
    let response = await this.http.post(`/contacts/${contactId}/archive`);
    return response.data;
  }

  async unarchiveContact(contactId: string) {
    let response = await this.http.post(`/contacts/${contactId}/unarchive`);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.http.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async searchContacts(query: any, paginationCursor?: string, perPage?: number) {
    let body: Record<string, any> = { query };
    if (perPage) body.pagination = { ...(body.pagination || {}), per_page: perPage };
    if (paginationCursor)
      body.pagination = { ...(body.pagination || {}), starting_after: paginationCursor };
    let response = await this.http.post('/contacts/search', body);
    return response.data;
  }

  async mergeContacts(leadId: string, userId: string) {
    let response = await this.http.post('/contacts/merge', {
      from: leadId,
      into: userId
    });
    return response.data;
  }

  // ──────── Companies ────────

  async listCompanies(params?: {
    perPage?: number;
    page?: number;
    order?: string;
    name?: string;
    companyId?: string;
    tagId?: string;
    segmentId?: string;
  }) {
    let query = new URLSearchParams();
    if (params?.perPage) query.set('per_page', String(params.perPage));
    if (params?.page) query.set('page', String(params.page));
    if (params?.order) query.set('order', params.order);
    if (params?.name) query.set('name', params.name);
    if (params?.companyId) query.set('company_id', params.companyId);
    if (params?.tagId) query.set('tag_id', params.tagId);
    if (params?.segmentId) query.set('segment_id', params.segmentId);
    let qs = query.toString();
    let response = await this.http.get(`/companies${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.http.get(`/companies/${companyId}`);
    return response.data;
  }

  async createOrUpdateCompany(data: {
    companyId?: string;
    name?: string;
    plan?: string;
    size?: number;
    website?: string;
    industry?: string;
    monthlySpend?: number;
    remoteCreatedAt?: string;
    customAttributes?: Record<string, any>;
  }) {
    let body: Record<string, any> = {};
    if (data.companyId) body.company_id = data.companyId;
    if (data.name) body.name = data.name;
    if (data.plan) body.plan = data.plan;
    if (data.size !== undefined) body.size = data.size;
    if (data.website) body.website = data.website;
    if (data.industry) body.industry = data.industry;
    if (data.monthlySpend !== undefined) body.monthly_spend = data.monthlySpend;
    if (data.remoteCreatedAt)
      body.remote_created_at = Math.floor(new Date(data.remoteCreatedAt).getTime() / 1000);
    if (data.customAttributes) body.custom_attributes = data.customAttributes;
    let response = await this.http.post('/companies', body);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    let response = await this.http.delete(`/companies/${companyId}`);
    return response.data;
  }

  async searchCompanies(query: any, paginationCursor?: string, perPage?: number) {
    let body: Record<string, any> = { query };
    if (perPage) body.pagination = { ...(body.pagination || {}), per_page: perPage };
    if (paginationCursor)
      body.pagination = { ...(body.pagination || {}), starting_after: paginationCursor };
    let response = await this.http.post('/companies/search', body);
    return response.data;
  }

  async attachContactToCompany(contactId: string, companyId: string) {
    let response = await this.http.post(`/contacts/${contactId}/companies`, {
      id: companyId
    });
    return response.data;
  }

  async detachContactFromCompany(contactId: string, companyId: string) {
    let response = await this.http.delete(`/contacts/${contactId}/companies/${companyId}`);
    return response.data;
  }

  // ──────── Conversations ────────

  async listConversations(params?: { perPage?: number; startingAfter?: string }) {
    let query = new URLSearchParams();
    if (params?.perPage) query.set('per_page', String(params.perPage));
    if (params?.startingAfter) query.set('starting_after', params.startingAfter);
    let qs = query.toString();
    let response = await this.http.get(`/conversations${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getConversation(conversationId: string) {
    let response = await this.http.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async updateConversation(
    conversationId: string,
    data: {
      read?: boolean;
      customAttributes?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.read !== undefined) body.read = data.read;
    if (data.customAttributes) body.custom_attributes = data.customAttributes;
    let response = await this.http.put(`/conversations/${conversationId}`, body);
    return response.data;
  }

  async createConversation(data: { from: { type: string; id: string }; body: string }) {
    let response = await this.http.post('/conversations', {
      from: data.from,
      body: data.body
    });
    return response.data;
  }

  async replyToConversation(
    conversationId: string,
    data: {
      messageType: string;
      type: string;
      body: string;
      adminId?: string;
      intercomUserId?: string;
      email?: string;
      attachmentUrls?: string[];
    }
  ) {
    let body: Record<string, any> = {
      message_type: data.messageType,
      type: data.type,
      body: data.body
    };
    if (data.adminId) body.admin_id = data.adminId;
    if (data.intercomUserId) body.intercom_user_id = data.intercomUserId;
    if (data.email) body.email = data.email;
    if (data.attachmentUrls) body.attachment_urls = data.attachmentUrls;
    let response = await this.http.post(`/conversations/${conversationId}/reply`, body);
    return response.data;
  }

  async assignConversation(
    conversationId: string,
    data: {
      adminId: string;
      assigneeId: string;
      body?: string;
      type: string;
    }
  ) {
    let response = await this.http.post(`/conversations/${conversationId}/parts`, {
      message_type: 'assignment',
      admin_id: data.adminId,
      assignee_id: data.assigneeId,
      body: data.body,
      type: data.type
    });
    return response.data;
  }

  async closeConversation(conversationId: string, adminId: string, body?: string) {
    let response = await this.http.post(`/conversations/${conversationId}/parts`, {
      message_type: 'close',
      admin_id: adminId,
      type: 'admin',
      body
    });
    return response.data;
  }

  async openConversation(conversationId: string, adminId: string) {
    let response = await this.http.post(`/conversations/${conversationId}/parts`, {
      message_type: 'open',
      admin_id: adminId,
      type: 'admin'
    });
    return response.data;
  }

  async snoozeConversation(conversationId: string, adminId: string, snoozedUntil: number) {
    let response = await this.http.post(`/conversations/${conversationId}/parts`, {
      message_type: 'snoozed',
      admin_id: adminId,
      type: 'admin',
      snoozed_until: snoozedUntil
    });
    return response.data;
  }

  async addNoteToConversation(conversationId: string, adminId: string, body: string) {
    let response = await this.http.post(`/conversations/${conversationId}/parts`, {
      message_type: 'note',
      admin_id: adminId,
      type: 'admin',
      body
    });
    return response.data;
  }

  async searchConversations(query: any, paginationCursor?: string, perPage?: number) {
    let body: Record<string, any> = { query };
    if (perPage) body.pagination = { ...(body.pagination || {}), per_page: perPage };
    if (paginationCursor)
      body.pagination = { ...(body.pagination || {}), starting_after: paginationCursor };
    let response = await this.http.post('/conversations/search', body);
    return response.data;
  }

  async addTagToConversation(conversationId: string, tagId: string, adminId: string) {
    let response = await this.http.post(`/conversations/${conversationId}/tags`, {
      id: tagId,
      admin_id: adminId
    });
    return response.data;
  }

  async removeTagFromConversation(conversationId: string, tagId: string, adminId: string) {
    let response = await this.http.delete(`/conversations/${conversationId}/tags/${tagId}`, {
      data: { admin_id: adminId }
    });
    return response.data;
  }

  // ──────── Tickets ────────

  async createTicket(data: {
    ticketTypeId: string;
    contacts: Array<{ id: string }>;
    ticketAttributes?: Record<string, any>;
    companyId?: string;
    assigneeId?: string;
  }) {
    let body: Record<string, any> = {
      ticket_type_id: data.ticketTypeId,
      contacts: data.contacts.map(c => ({ id: c.id }))
    };
    if (data.ticketAttributes) body.ticket_attributes = data.ticketAttributes;
    if (data.companyId) body.company_id = data.companyId;
    if (data.assigneeId) body.assignee_id = data.assigneeId;
    let response = await this.http.post('/tickets', body);
    return response.data;
  }

  async getTicket(ticketId: string) {
    let response = await this.http.get(`/tickets/${ticketId}`);
    return response.data;
  }

  async updateTicket(
    ticketId: string,
    data: {
      ticketAttributes?: Record<string, any>;
      state?: string;
      open?: boolean;
      isShared?: boolean;
      snoozedUntil?: string;
      assignmentAdminId?: string;
      assignmentTeamId?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.ticketAttributes) body.ticket_attributes = data.ticketAttributes;
    if (data.state) body.state = data.state;
    if (data.open !== undefined) body.open = data.open;
    if (data.isShared !== undefined) body.is_shared = data.isShared;
    if (data.snoozedUntil)
      body.snoozed_until = Math.floor(new Date(data.snoozedUntil).getTime() / 1000);
    if (data.assignmentAdminId || data.assignmentTeamId) {
      body.assignment = {};
      if (data.assignmentAdminId) body.assignment.admin_id = data.assignmentAdminId;
      if (data.assignmentTeamId) body.assignment.team_id = data.assignmentTeamId;
    }
    let response = await this.http.put(`/tickets/${ticketId}`, body);
    return response.data;
  }

  async replyToTicket(
    ticketId: string,
    data: {
      messageType: string;
      type: string;
      body: string;
      adminId?: string;
      intercomUserId?: string;
    }
  ) {
    let body: Record<string, any> = {
      message_type: data.messageType,
      type: data.type,
      body: data.body
    };
    if (data.adminId) body.admin_id = data.adminId;
    if (data.intercomUserId) body.intercom_user_id = data.intercomUserId;
    let response = await this.http.post(`/tickets/${ticketId}/reply`, body);
    return response.data;
  }

  async searchTickets(query: any, paginationCursor?: string, perPage?: number) {
    let body: Record<string, any> = { query };
    if (perPage) body.pagination = { ...(body.pagination || {}), per_page: perPage };
    if (paginationCursor)
      body.pagination = { ...(body.pagination || {}), starting_after: paginationCursor };
    let response = await this.http.post('/tickets/search', body);
    return response.data;
  }

  async listTicketTypes() {
    let response = await this.http.get('/ticket_types');
    return response.data;
  }

  // ──────── Articles ────────

  async listArticles(params?: { page?: number; perPage?: number }) {
    let query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.perPage) query.set('per_page', String(params.perPage));
    let qs = query.toString();
    let response = await this.http.get(`/articles${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getArticle(articleId: string) {
    let response = await this.http.get(`/articles/${articleId}`);
    return response.data;
  }

  async createArticle(data: {
    title: string;
    authorId: string;
    body?: string;
    description?: string;
    state?: string;
    parentId?: string;
    parentType?: string;
    translatedContent?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      title: data.title,
      author_id: data.authorId
    };
    if (data.body) body.body = data.body;
    if (data.description) body.description = data.description;
    if (data.state) body.state = data.state;
    if (data.parentId) body.parent_id = data.parentId;
    if (data.parentType) body.parent_type = data.parentType;
    if (data.translatedContent) body.translated_content = data.translatedContent;
    let response = await this.http.post('/articles', body);
    return response.data;
  }

  async updateArticle(
    articleId: string,
    data: {
      title?: string;
      authorId?: string;
      body?: string;
      description?: string;
      state?: string;
      parentId?: string;
      parentType?: string;
      translatedContent?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.title) body.title = data.title;
    if (data.authorId) body.author_id = data.authorId;
    if (data.body) body.body = data.body;
    if (data.description) body.description = data.description;
    if (data.state) body.state = data.state;
    if (data.parentId) body.parent_id = data.parentId;
    if (data.parentType) body.parent_type = data.parentType;
    if (data.translatedContent) body.translated_content = data.translatedContent;
    let response = await this.http.put(`/articles/${articleId}`, body);
    return response.data;
  }

  async deleteArticle(articleId: string) {
    let response = await this.http.delete(`/articles/${articleId}`);
    return response.data;
  }

  async searchArticles(
    phrase: string,
    helpCenterId?: string,
    highlightTag?: string,
    state?: string
  ) {
    let query = new URLSearchParams();
    query.set('phrase', phrase);
    if (helpCenterId) query.set('help_center_id', helpCenterId);
    if (highlightTag) query.set('highlight', highlightTag);
    if (state) query.set('state', state);
    let response = await this.http.get(`/articles/search?${query.toString()}`);
    return response.data;
  }

  // ──────── Tags ────────

  async listTags() {
    let response = await this.http.get('/tags');
    return response.data;
  }

  async getTag(tagId: string) {
    let response = await this.http.get(`/tags/${tagId}`);
    return response.data;
  }

  async createTag(name: string) {
    let response = await this.http.post('/tags', { name });
    return response.data;
  }

  async updateTag(tagId: string, name: string) {
    let response = await this.http.post('/tags', { id: tagId, name });
    return response.data;
  }

  async deleteTag(tagId: string) {
    let response = await this.http.delete(`/tags/${tagId}`);
    return response.data;
  }

  async addTagToContact(contactId: string, tagId: string) {
    let response = await this.http.post(`/contacts/${contactId}/tags`, { id: tagId });
    return response.data;
  }

  async removeTagFromContact(contactId: string, tagId: string) {
    let response = await this.http.delete(`/contacts/${contactId}/tags/${tagId}`);
    return response.data;
  }

  // ──────── Data Events ────────

  async submitEvent(data: {
    eventName: string;
    userId?: string;
    email?: string;
    intercomUserId?: string;
    createdAt?: number;
    metadata?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      event_name: data.eventName
    };
    if (data.userId) body.user_id = data.userId;
    if (data.email) body.email = data.email;
    if (data.intercomUserId) body.id = data.intercomUserId;
    body.created_at = data.createdAt ?? Math.floor(Date.now() / 1000);
    if (data.metadata) body.metadata = data.metadata;
    let response = await this.http.post('/events', body);
    return response.data;
  }

  async listEvents(params: {
    type: string;
    intercomUserId?: string;
    email?: string;
    userId?: string;
    perPage?: number;
    summary?: boolean;
  }) {
    let query = new URLSearchParams();
    query.set('type', params.type);
    if (params.intercomUserId) query.set('intercom_user_id', params.intercomUserId);
    if (params.email) query.set('email', params.email);
    if (params.userId) query.set('user_id', params.userId);
    if (params.perPage) query.set('per_page', String(params.perPage));
    if (params.summary) query.set('summary', 'true');
    let response = await this.http.get(`/events?${query.toString()}`);
    return response.data;
  }

  // ──────── Messages ────────

  async sendMessage(data: {
    messageType: string;
    subject?: string;
    body: string;
    template?: string;
    from: { type: string; id: string };
    to: { type: string; id?: string; email?: string; userId?: string };
    createContactOnMissing?: boolean;
  }) {
    let body: Record<string, any> = {
      message_type: data.messageType,
      body: data.body,
      from: data.from,
      to: {} as Record<string, any>
    };
    if (data.subject) body.subject = data.subject;
    if (data.template) body.template = data.template;
    body.to.type = data.to.type;
    if (data.to.id) body.to.id = data.to.id;
    if (data.to.email) body.to.email = data.to.email;
    if (data.to.userId) body.to.user_id = data.to.userId;
    if (data.createContactOnMissing !== undefined)
      body.create_contact_on_missing = data.createContactOnMissing;
    let response = await this.http.post('/messages', body);
    return response.data;
  }

  // ──────── Admins ────────

  async listAdmins() {
    let response = await this.http.get('/admins');
    return response.data;
  }

  async getAdmin(adminId: string) {
    let response = await this.http.get(`/admins/${adminId}`);
    return response.data;
  }

  async setAdminAway(adminId: string, awayModeEnabled: boolean, awayModeReassign: boolean) {
    let response = await this.http.put(`/admins/${adminId}/away`, {
      away_mode_enabled: awayModeEnabled,
      away_mode_reassign: awayModeReassign
    });
    return response.data;
  }

  // ──────── Teams ────────

  async listTeams() {
    let response = await this.http.get('/teams');
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.http.get(`/teams/${teamId}`);
    return response.data;
  }

  // ──────── Segments ────────

  async listSegments(params?: { includeCount?: boolean }) {
    let query = new URLSearchParams();
    if (params?.includeCount) query.set('include_count', 'true');
    let qs = query.toString();
    let response = await this.http.get(`/segments${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getSegment(segmentId: string, params?: { includeCount?: boolean }) {
    let query = new URLSearchParams();
    if (params?.includeCount) query.set('include_count', 'true');
    let qs = query.toString();
    let response = await this.http.get(`/segments/${segmentId}${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async listContactSegments(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}/segments`);
    return response.data;
  }

  // ──────── Data Attributes ────────

  async listDataAttributes(params?: { model?: string; includeArchived?: boolean }) {
    let query = new URLSearchParams();
    if (params?.model) query.set('model', params.model);
    if (params?.includeArchived) query.set('include_archived', 'true');
    let qs = query.toString();
    let response = await this.http.get(`/data_attributes${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async createDataAttribute(data: {
    name: string;
    model: string;
    dataType: string;
    description?: string;
    options?: string[];
    messengerWritable?: boolean;
  }) {
    let body: Record<string, any> = {
      name: data.name,
      model: data.model,
      data_type: data.dataType
    };
    if (data.description) body.description = data.description;
    if (data.options) body.options = data.options.map(value => ({ value }));
    if (data.messengerWritable !== undefined) body.messenger_writable = data.messengerWritable;
    let response = await this.http.post('/data_attributes', body);
    return response.data;
  }

  async updateDataAttribute(
    attributeId: string,
    data: {
      description?: string;
      options?: string[];
      archived?: boolean;
      messengerWritable?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.description) body.description = data.description;
    if (data.options) body.options = data.options.map(value => ({ value }));
    if (data.archived !== undefined) body.archived = data.archived;
    if (data.messengerWritable !== undefined) body.messenger_writable = data.messengerWritable;
    let response = await this.http.put(`/data_attributes/${attributeId}`, body);
    return response.data;
  }

  // ──────── Notes ────────

  async createNote(contactId: string, body: string, adminId?: string) {
    let data: Record<string, any> = { body };
    if (adminId) data.admin_id = adminId;
    let response = await this.http.post(`/contacts/${contactId}/notes`, data);
    return response.data;
  }

  async listNotes(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}/notes`);
    return response.data;
  }

  async listCompanyNotes(companyId: string) {
    let response = await this.http.get(`/companies/${companyId}/notes`);
    return response.data;
  }

  async getNote(noteId: string) {
    let response = await this.http.get(`/notes/${noteId}`);
    return response.data;
  }

  // ──────── Subscription Types ────────

  async listSubscriptionTypes() {
    let response = await this.http.get('/subscription_types');
    return response.data;
  }

  async listContactSubscriptions(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}/subscriptions`);
    return response.data;
  }

  async addContactSubscription(
    contactId: string,
    subscriptionId: string,
    consentType: string
  ) {
    let response = await this.http.post(`/contacts/${contactId}/subscriptions`, {
      id: subscriptionId,
      consent_type: consentType
    });
    return response.data;
  }

  async removeContactSubscription(contactId: string, subscriptionId: string) {
    let response = await this.http.delete(
      `/contacts/${contactId}/subscriptions/${subscriptionId}`
    );
    return response.data;
  }

  // ──────── Help Center Collections ────────

  async listCollections() {
    let response = await this.http.get('/help_center/collections');
    return response.data;
  }

  async getCollection(collectionId: string) {
    let response = await this.http.get(`/help_center/collections/${collectionId}`);
    return response.data;
  }
}
