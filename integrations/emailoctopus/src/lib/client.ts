import { createAxios } from 'slates';

let BASE_URL = 'https://api.emailoctopus.com';

export interface ListSummary {
  listId: string;
  name: string;
  doubleOptIn: boolean;
  fields: FieldInfo[];
  tags: string[];
  counts: {
    pending: number;
    subscribed: number;
    unsubscribed: number;
  };
  createdAt: string;
}

export interface FieldInfo {
  tag: string;
  type: string;
  label: string;
  fallback: string;
}

export interface Contact {
  contactId: string;
  emailAddress: string;
  fields: Record<string, string>;
  tags: string[];
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface Campaign {
  campaignId: string;
  status: string;
  name: string;
  subject: string;
  to: string[];
  from: {
    name: string;
    emailAddress: string;
  };
  content: {
    html: string;
    plainText: string;
  };
  createdAt: string;
  sentAt: string | null;
}

export interface CampaignSummaryReport {
  campaignId: string;
  sent: number;
  bounced: {
    hard: number;
    soft: number;
  };
  opened: {
    total: number;
    unique: number;
  };
  clicked: {
    total: number;
    unique: number;
  };
  complained: number;
  unsubscribed: number;
}

export interface LinkReport {
  url: string;
  clickedTotal: number;
  clickedUnique: number;
}

export interface ContactReport {
  contact: Contact;
  occurredAt: string;
  type?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagingNext: string | null;
}

let mapList = (raw: any): ListSummary => ({
  listId: raw.id,
  name: raw.name,
  doubleOptIn: raw.double_opt_in,
  fields: (raw.fields || []).map((f: any) => ({
    tag: f.tag,
    type: f.type,
    label: f.label,
    fallback: f.fallback || ''
  })),
  tags: raw.tags || [],
  counts: {
    pending: raw.counts?.pending || 0,
    subscribed: raw.counts?.subscribed || 0,
    unsubscribed: raw.counts?.unsubscribed || 0
  },
  createdAt: raw.created_at
});

let mapContact = (raw: any): Contact => ({
  contactId: raw.id,
  emailAddress: raw.email_address,
  fields: raw.fields || {},
  tags: raw.tags || [],
  status: raw.status,
  createdAt: raw.created_at,
  lastUpdatedAt: raw.last_updated_at
});

let mapCampaign = (raw: any): Campaign => ({
  campaignId: raw.id,
  status: raw.status,
  name: raw.name,
  subject: raw.subject,
  to: raw.to || [],
  from: {
    name: raw.from?.name || '',
    emailAddress: raw.from?.email_address || ''
  },
  content: {
    html: raw.content?.html || '',
    plainText: raw.content?.plain_text || ''
  },
  createdAt: raw.created_at,
  sentAt: raw.sent_at || null
});

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Lists ───

  async getLists(startingAfter?: string): Promise<PaginatedResponse<ListSummary>> {
    let params: Record<string, string> = {};
    if (startingAfter) params.starting_after = startingAfter;
    let res = await this.axios.get('/lists', { params });
    return {
      data: (res.data.data || []).map(mapList),
      pagingNext: res.data.paging?.next || null
    };
  }

  async getList(listId: string): Promise<ListSummary> {
    let res = await this.axios.get(`/lists/${listId}`);
    return mapList(res.data);
  }

  async createList(name: string): Promise<ListSummary> {
    let res = await this.axios.post('/lists', { name });
    return mapList(res.data);
  }

  async updateList(listId: string, name: string): Promise<ListSummary> {
    let res = await this.axios.put(`/lists/${listId}`, { name });
    return mapList(res.data);
  }

  async deleteList(listId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}`);
  }

  // ─── Contacts ───

  async getContacts(
    listId: string,
    options?: {
      status?: string;
      tag?: string;
      createdBefore?: string;
      createdAfter?: string;
      updatedBefore?: string;
      updatedAfter?: string;
      startingAfter?: string;
    }
  ): Promise<PaginatedResponse<Contact>> {
    let params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.tag) params.tag = options.tag;
    if (options?.createdBefore) params.created_before = options.createdBefore;
    if (options?.createdAfter) params.created_after = options.createdAfter;
    if (options?.updatedBefore) params.updated_before = options.updatedBefore;
    if (options?.updatedAfter) params.updated_after = options.updatedAfter;
    if (options?.startingAfter) params.starting_after = options.startingAfter;
    let res = await this.axios.get(`/lists/${listId}/contacts`, { params });
    return {
      data: (res.data.data || []).map(mapContact),
      pagingNext: res.data.paging?.next || null
    };
  }

  async getContact(listId: string, contactId: string): Promise<Contact> {
    let res = await this.axios.get(`/lists/${listId}/contacts/${contactId}`);
    return mapContact(res.data);
  }

  async createContact(
    listId: string,
    data: {
      emailAddress: string;
      fields?: Record<string, string>;
      tags?: string[];
      status?: string;
    }
  ): Promise<Contact> {
    let body: any = { email_address: data.emailAddress };
    if (data.fields) body.fields = data.fields;
    if (data.tags) body.tags = data.tags;
    if (data.status) body.status = data.status;
    let res = await this.axios.post(`/lists/${listId}/contacts`, body);
    return mapContact(res.data);
  }

  async updateContact(
    listId: string,
    contactId: string,
    data: {
      emailAddress?: string;
      fields?: Record<string, string>;
      tags?: Record<string, boolean>;
      status?: string;
    }
  ): Promise<Contact> {
    let body: any = {};
    if (data.emailAddress) body.email_address = data.emailAddress;
    if (data.fields) body.fields = data.fields;
    if (data.tags) body.tags = data.tags;
    if (data.status) body.status = data.status;
    let res = await this.axios.put(`/lists/${listId}/contacts/${contactId}`, body);
    return mapContact(res.data);
  }

  async upsertContact(
    listId: string,
    data: {
      emailAddress: string;
      fields?: Record<string, string>;
      tags?: string[];
      status?: string;
    }
  ): Promise<Contact> {
    let body: any = { email_address: data.emailAddress };
    if (data.fields) body.fields = data.fields;
    if (data.tags) body.tags = data.tags;
    if (data.status) body.status = data.status;
    let res = await this.axios.put(`/lists/${listId}/contacts`, body);
    return mapContact(res.data);
  }

  async deleteContact(listId: string, contactId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/contacts/${contactId}`);
  }

  async batchUpdateContacts(
    listId: string,
    contacts: Array<{
      contactId: string;
      emailAddress?: string;
      fields?: Record<string, string>;
      tags?: Record<string, boolean>;
      status?: string;
    }>
  ): Promise<{ succeeded: any[]; failed: any[] }> {
    let body = {
      data: contacts.map(c => {
        let item: any = { id: c.contactId };
        if (c.emailAddress) item.email_address = c.emailAddress;
        if (c.fields) item.fields = c.fields;
        if (c.tags) item.tags = c.tags;
        if (c.status) item.status = c.status;
        return item;
      })
    };
    let res = await this.axios.put(`/lists/${listId}/contacts/batch`, body);
    return {
      succeeded: res.data.succeeded || [],
      failed: res.data.failed || []
    };
  }

  // ─── Custom Fields ───

  async createField(
    listId: string,
    data: {
      label: string;
      tag: string;
      type: string;
      fallback?: string;
    }
  ): Promise<FieldInfo> {
    let body: any = { label: data.label, tag: data.tag, type: data.type };
    if (data.fallback !== undefined) body.fallback = data.fallback;
    let res = await this.axios.post(`/lists/${listId}/fields`, body);
    return {
      tag: res.data.tag,
      type: res.data.type,
      label: res.data.label,
      fallback: res.data.fallback || ''
    };
  }

  async updateField(
    listId: string,
    fieldTag: string,
    data: {
      label?: string;
      fallback?: string;
    }
  ): Promise<FieldInfo> {
    let body: any = {};
    if (data.label !== undefined) body.label = data.label;
    if (data.fallback !== undefined) body.fallback = data.fallback;
    let res = await this.axios.put(`/lists/${listId}/fields/${fieldTag}`, body);
    return {
      tag: res.data.tag,
      type: res.data.type,
      label: res.data.label,
      fallback: res.data.fallback || ''
    };
  }

  async deleteField(listId: string, fieldTag: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/fields/${fieldTag}`);
  }

  // ─── Tags ───

  async getTags(listId: string): Promise<string[]> {
    let res = await this.axios.get(`/lists/${listId}/tags`);
    return (res.data.data || res.data || []).map((t: any) =>
      typeof t === 'string' ? t : t.tag
    );
  }

  async createTag(listId: string, tag: string): Promise<string> {
    let res = await this.axios.post(`/lists/${listId}/tags`, { tag });
    return res.data.tag;
  }

  async updateTag(listId: string, oldTag: string, newTag: string): Promise<string> {
    let res = await this.axios.put(`/lists/${listId}/tags/${oldTag}`, { tag: newTag });
    return res.data.tag;
  }

  async deleteTag(listId: string, tag: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/tags/${tag}`);
  }

  // ─── Campaigns ───

  async getCampaigns(startingAfter?: string): Promise<PaginatedResponse<Campaign>> {
    let params: Record<string, string> = {};
    if (startingAfter) params.starting_after = startingAfter;
    let res = await this.axios.get('/campaigns', { params });
    return {
      data: (res.data.data || []).map(mapCampaign),
      pagingNext: res.data.paging?.next || null
    };
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    let res = await this.axios.get(`/campaigns/${campaignId}`);
    return mapCampaign(res.data);
  }

  // ─── Campaign Reports ───

  async getCampaignSummaryReport(campaignId: string): Promise<CampaignSummaryReport> {
    let res = await this.axios.get(`/campaigns/${campaignId}/reports/summary`);
    return {
      campaignId: res.data.id || campaignId,
      sent: res.data.sent || 0,
      bounced: {
        hard: res.data.bounced?.hard || 0,
        soft: res.data.bounced?.soft || 0
      },
      opened: {
        total: res.data.opened?.total || 0,
        unique: res.data.opened?.unique || 0
      },
      clicked: {
        total: res.data.clicked?.total || 0,
        unique: res.data.clicked?.unique || 0
      },
      complained: res.data.complained || 0,
      unsubscribed: res.data.unsubscribed || 0
    };
  }

  async getCampaignLinkReports(
    campaignId: string,
    startingAfter?: string
  ): Promise<PaginatedResponse<LinkReport>> {
    let params: Record<string, string> = {};
    if (startingAfter) params.starting_after = startingAfter;
    let res = await this.axios.get(`/campaigns/${campaignId}/reports/links`, { params });
    return {
      data: (res.data.data || []).map((l: any) => ({
        url: l.url,
        clickedTotal: l.clicked_total || 0,
        clickedUnique: l.clicked_unique || 0
      })),
      pagingNext: res.data.paging?.next || null
    };
  }

  async getCampaignContactReports(
    campaignId: string,
    status: string,
    startingAfter?: string
  ): Promise<PaginatedResponse<ContactReport>> {
    let params: Record<string, string> = { status };
    if (startingAfter) params.starting_after = startingAfter;
    let res = await this.axios.get(`/campaigns/${campaignId}/reports`, { params });
    return {
      data: (res.data.data || []).map((r: any) => ({
        contact: mapContact(r.contact),
        occurredAt: r.occurred_at,
        type: r.type
      })),
      pagingNext: res.data.paging?.next || null
    };
  }

  // ─── Automations ───

  async triggerAutomation(automationId: string, contactId: string): Promise<void> {
    await this.axios.post(`/automations/${automationId}/queue`, {
      list_member_id: contactId
    });
  }
}
