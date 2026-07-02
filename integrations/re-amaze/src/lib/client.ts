import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: {
    token: string;
    loginEmail: string;
    brandSubdomain: string;
  }) {
    this.axios = createAxios({
      baseURL: `https://${config.brandSubdomain}.reamaze.io/api/v1`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      auth: {
        username: config.loginEmail,
        password: config.token
      }
    });
  }

  // ---- Conversations ----

  async listConversations(params?: {
    filter?: string;
    for?: string;
    forId?: string;
    sort?: string;
    tag?: string;
    category?: string;
    page?: number;
    startDate?: string;
    endDate?: string;
    origin?: string;
  }) {
    let query: Record<string, string> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.for) query.for = params.for;
    if (params?.forId) query.for_id = params.forId;
    if (params?.sort) query.sort = params.sort;
    if (params?.tag) query.tag = params.tag;
    if (params?.category) query.category = params.category;
    if (params?.page) query.page = String(params.page);
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;
    if (params?.origin) query.origin = params.origin;

    let response = await this.axios.get('/conversations', { params: query });
    return response.data;
  }

  async getConversation(slug: string) {
    let response = await this.axios.get(`/conversations/${slug}`);
    return response.data;
  }

  async createConversation(data: {
    subject: string;
    category: string;
    message: {
      body: string;
      recipients?: string[];
      suppressNotifications?: boolean;
      suppressAutoresolve?: boolean;
      attachment?: string;
      attachments?: string[];
    };
    user: {
      name: string;
      email: string;
      data?: Record<string, string>;
    };
    tagList?: string[];
    status?: number;
    assignee?: string;
    data?: Record<string, string>;
  }) {
    let body: Record<string, any> = {
      conversation: {
        subject: data.subject,
        category: data.category,
        tag_list: data.tagList,
        status: data.status,
        data: data.data,
        assignee: data.assignee,
        message: {
          body: data.message.body,
          recipients: data.message.recipients,
          suppress_notifications: data.message.suppressNotifications,
          suppress_autoresolve: data.message.suppressAutoresolve,
          attachment: data.message.attachment,
          attachments: data.message.attachments
        },
        user: {
          name: data.user.name,
          email: data.user.email,
          data: data.user.data
        }
      }
    };

    let response = await this.axios.post('/conversations', body);
    return response.data;
  }

  async updateConversation(
    slug: string,
    data: {
      status?: number;
      assignee?: string;
      tagList?: string[];
      category?: string;
      data?: Record<string, string>;
      holdUntil?: string;
      brand?: string;
    }
  ) {
    let body: Record<string, any> = {
      conversation: {} as Record<string, any>
    };
    if (data.status !== undefined) body.conversation.status = data.status;
    if (data.assignee) body.conversation.assignee = { email: data.assignee };
    if (data.tagList) body.conversation.tag_list = data.tagList;
    if (data.category) body.conversation.category = data.category;
    if (data.data) body.conversation.data = data.data;
    if (data.holdUntil) body.conversation.hold_until = data.holdUntil;
    if (data.brand) body.conversation.brand = data.brand;

    let response = await this.axios.put(`/conversations/${slug}`, body);
    return response.data;
  }

  // ---- Messages ----

  async createMessage(
    conversationSlug: string,
    data: {
      body: string;
      visibility?: number;
      user?: { email: string; name?: string };
      suppressNotifications?: boolean;
      suppressAutoresolve?: boolean;
      attachment?: string;
      recipients?: string[];
    }
  ) {
    let body: Record<string, any> = {
      message: {
        body: data.body,
        visibility: data.visibility ?? 0
      }
    };
    if (data.user) body.message.user = data.user;
    if (data.suppressNotifications !== undefined)
      body.message.suppress_notifications = data.suppressNotifications;
    if (data.suppressAutoresolve !== undefined)
      body.message.suppress_autoresolve = data.suppressAutoresolve;
    if (data.attachment) body.message.attachment = data.attachment;
    if (data.recipients) body.message.recipients = data.recipients;

    let response = await this.axios.post(`/conversations/${conversationSlug}/messages`, body);
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: {
    q?: string;
    sort?: string;
    type?: string;
    page?: number;
    data?: Record<string, string>;
  }) {
    let query: Record<string, string> = {};
    if (params?.q) query.q = params.q;
    if (params?.sort) query.sort = params.sort;
    if (params?.type) query.type = params.type;
    if (params?.page) query.page = String(params.page);
    if (params?.data) {
      for (let [key, value] of Object.entries(params.data)) {
        query[`data[${key}]`] = value;
      }
    }

    let response = await this.axios.get('/contacts', { params: query });
    return response.data;
  }

  async createContact(data: {
    name: string;
    email?: string;
    mobile?: string;
    id?: string;
    externalAvatarUrl?: string;
    notes?: string[];
    data?: Record<string, string>;
  }) {
    let body = {
      contact: {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        id: data.id,
        external_avatar_url: data.externalAvatarUrl,
        notes: data.notes,
        data: data.data
      }
    };

    let response = await this.axios.post('/contacts', body);
    return response.data;
  }

  async updateContact(
    identifier: string,
    data: {
      name?: string;
      friendlyName?: string;
      externalAvatarUrl?: string;
      notes?: string[];
      data?: Record<string, string>;
      identifierType?: string;
    }
  ) {
    let url = `/contacts/${encodeURIComponent(identifier)}`;
    if (data.identifierType) {
      url += `?identifier_type=${data.identifierType}`;
    }

    let body = {
      contact: {
        name: data.name,
        friendly_name: data.friendlyName,
        external_avatar_url: data.externalAvatarUrl,
        notes: data.notes,
        data: data.data
      }
    };

    let response = await this.axios.put(url, body);
    return response.data;
  }

  // ---- Contact Notes ----

  async listContactNotes(contactIdentifier: string) {
    let response = await this.axios.get(
      `/contacts/${encodeURIComponent(contactIdentifier)}/notes`
    );
    return response.data;
  }

  async createContactNote(contactIdentifier: string, note: string) {
    let response = await this.axios.post(
      `/contacts/${encodeURIComponent(contactIdentifier)}/notes`,
      {
        note: { body: note }
      }
    );
    return response.data;
  }

  async updateContactNote(noteId: number, note: string) {
    let response = await this.axios.put(`/notes/${noteId}`, {
      note: { body: note }
    });
    return response.data;
  }

  async deleteContactNote(noteId: number) {
    let response = await this.axios.delete(`/notes/${noteId}`);
    return response.data;
  }

  // ---- Articles ----

  async listArticles(params?: {
    status?: string;
    q?: string;
    page?: number;
    topicSlug?: string;
  }) {
    let query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.q) query.q = params.q;
    if (params?.page) query.page = String(params.page);

    let path = params?.topicSlug ? `/topics/${params.topicSlug}/articles` : '/articles';

    let response = await this.axios.get(path, { params: query });
    return response.data;
  }

  async getArticle(articleId: string) {
    let response = await this.axios.get(`/articles/${articleId}`);
    return response.data;
  }

  async createArticle(data: {
    title: string;
    body: string;
    status: number;
    topicId?: string;
  }) {
    let body = {
      article: {
        title: data.title,
        body: data.body,
        status: data.status,
        topic_id: data.topicId
      }
    };

    let response = await this.axios.post('/articles', body);
    return response.data;
  }

  async updateArticle(
    articleId: string,
    data: {
      title?: string;
      body?: string;
      status?: number;
      topicId?: string;
    }
  ) {
    let body: Record<string, any> = {
      article: {} as Record<string, any>
    };
    if (data.title !== undefined) body.article.title = data.title;
    if (data.body !== undefined) body.article.body = data.body;
    if (data.status !== undefined) body.article.status = data.status;
    if (data.topicId !== undefined) body.article.topic_id = data.topicId;

    let response = await this.axios.put(`/articles/${articleId}`, body);
    return response.data;
  }

  // ---- Channels ----

  async listChannels(channelType?: string) {
    let query: Record<string, string> = {};
    if (channelType) query.channel = channelType;

    let response = await this.axios.get('/channels', { params: query });
    return response.data;
  }

  // ---- Response Templates ----

  async listResponseTemplates(params?: { q?: string; page?: number }) {
    let query: Record<string, string> = {};
    if (params?.q) query.q = params.q;
    if (params?.page) query.page = String(params.page);

    let response = await this.axios.get('/response_templates', { params: query });
    return response.data;
  }

  async getResponseTemplate(templateId: string) {
    let response = await this.axios.get(`/response_templates/${templateId}`);
    return response.data;
  }

  async createResponseTemplate(data: { name: string; body: string }) {
    let response = await this.axios.post('/response_templates', {
      response_template: { name: data.name, body: data.body }
    });
    return response.data;
  }

  async updateResponseTemplate(
    templateId: string,
    data: {
      name?: string;
      body?: string;
    }
  ) {
    let body: Record<string, any> = { response_template: {} as Record<string, any> };
    if (data.name !== undefined) body.response_template.name = data.name;
    if (data.body !== undefined) body.response_template.body = data.body;

    let response = await this.axios.put(`/response_templates/${templateId}`, body);
    return response.data;
  }

  // ---- Staff ----

  async listStaff() {
    let response = await this.axios.get('/staff');
    return response.data;
  }

  async createStaff(data: { name: string; email: string }) {
    let response = await this.axios.post('/staff', {
      staff: { name: data.name, email: data.email }
    });
    return response.data;
  }

  // ---- Reports ----

  async getReport(
    type: 'volume' | 'response_time' | 'staff' | 'tags' | 'channel_summary',
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    let query: Record<string, string> = {};
    if (params?.startDate) query.start_date = params.startDate;
    if (params?.endDate) query.end_date = params.endDate;

    let response = await this.axios.get(`/reports/${type}`, { params: query });
    return response.data;
  }

  // ---- Incidents ----

  async listIncidents(active?: boolean) {
    let path = active ? '/incidents/active' : '/incidents';
    let response = await this.axios.get(path);
    return response.data;
  }

  async getIncident(incidentId: string) {
    let response = await this.axios.get(`/incidents/${incidentId}`);
    return response.data;
  }

  async createIncident(data: {
    title: string;
    updates: Array<{
      status: string;
      message: string;
    }>;
    systems?: Array<{
      systemId: number;
      status: string;
    }>;
  }) {
    let body: Record<string, any> = {
      incident: {
        title: data.title,
        updates_attributes: data.updates.map(u => ({
          status: u.status,
          message: u.message
        }))
      }
    };
    if (data.systems) {
      body.incident.incidents_systems_attributes = data.systems.map(s => ({
        system_id: s.systemId,
        status: s.status
      }));
    }

    let response = await this.axios.post('/incidents', body);
    return response.data;
  }

  async updateIncident(
    incidentId: string,
    data: {
      title?: string;
      updates?: Array<{
        status: string;
        message: string;
      }>;
      systems?: Array<{
        id?: number;
        systemId: number;
        status: string;
      }>;
    }
  ) {
    let body: Record<string, any> = {
      incident: {} as Record<string, any>
    };
    if (data.title !== undefined) body.incident.title = data.title;
    if (data.updates) {
      body.incident.updates_attributes = data.updates.map(u => ({
        status: u.status,
        message: u.message
      }));
    }
    if (data.systems) {
      body.incident.incidents_systems_attributes = data.systems.map(s => ({
        id: s.id,
        system_id: s.systemId,
        status: s.status
      }));
    }

    let response = await this.axios.put(`/incidents/${incidentId}`, body);
    return response.data;
  }

  // ---- Systems ----

  async listSystems() {
    let response = await this.axios.get('/systems');
    return response.data;
  }

  // ---- Satisfaction Ratings ----

  async listSatisfactionRatings(params?: {
    rating?: number;
    assigneeId?: number;
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    page?: number;
  }) {
    let query: Record<string, string> = {};
    if (params?.rating !== undefined) query.rating = String(params.rating);
    if (params?.assigneeId !== undefined) query.assignee_id = String(params.assigneeId);
    if (params?.createdAfter) query.created_after = params.createdAfter;
    if (params?.createdBefore) query.created_before = params.createdBefore;
    if (params?.updatedAfter) query.updated_after = params.updatedAfter;
    if (params?.updatedBefore) query.updated_before = params.updatedBefore;
    if (params?.page !== undefined) query.page = String(params.page);

    let response = await this.axios.get('/satisfaction_ratings', { params: query });
    return response.data;
  }
}
