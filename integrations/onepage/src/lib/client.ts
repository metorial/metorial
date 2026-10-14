import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://app.onepagecrm.com/api/v3';

let mapAddress = (address: any) =>
  address
    ? {
        address: address.address,
        city: address.city,
        state: address.state,
        zipCode: address.zip_code,
        countryCode: address.country_code
      }
    : undefined;

let mapContact = (c: any) => ({
  contactId: c.id,
  firstName: c.first_name,
  lastName: c.last_name,
  companyName: c.company_name,
  companyId: c.company_id,
  jobTitle: c.job_title,
  background: c.background,
  status: c.status,
  statusId: c.status_id,
  leadSourceId: c.lead_source_id,
  ownerId: c.owner_id,
  emails: c.emails,
  phones: c.phones,
  urls: c.urls,
  address: mapAddress(c.address_list?.[0] ?? c.address),
  tags: c.tags,
  starValue: c.star_value,
  starred: c.starred,
  customFields: c.custom_fields?.map((cf: any) => ({
    customFieldId: cf.custom_field?.id ?? cf.id,
    value: cf.custom_field?.value ?? cf.value
  })),
  createdAt: c.created_at,
  modifiedAt: c.modified_at
});

let mapCompany = (c: any) => ({
  companyId: c.id,
  name: c.name,
  description: c.description,
  phone: c.phone,
  url: c.url,
  address: mapAddress(c.address),
  customFields: (c.company_fields ?? c.custom_fields)?.map((cf: any) => ({
    customFieldId: cf.company_field?.id ?? cf.custom_field?.id ?? cf.id,
    value: cf.value ?? cf.company_field?.value ?? cf.custom_field?.value
  })),
  createdAt: c.created_at,
  modifiedAt: c.modified_at
});

let mapDeal = (d: any) => ({
  dealId: d.id,
  contactId: d.contact_id,
  companyId: d.company_id,
  ownerId: d.owner_id,
  name: d.name,
  amount: d.amount,
  months: d.months,
  status: d.status,
  stage: d.stage,
  expectedCloseDate: d.expected_close_date,
  closeDate: d.close_date,
  text: d.text,
  customFields: (d.deal_fields ?? d.custom_fields)?.map((cf: any) => ({
    customFieldId: cf.deal_field?.id ?? cf.custom_field?.id ?? cf.id,
    value: cf.value ?? cf.deal_field?.value ?? cf.custom_field?.value
  })),
  createdAt: d.created_at,
  modifiedAt: d.modified_at
});

let mapAction = (a: any) => ({
  actionId: a.id,
  contactId: a.contact_id,
  assigneeId: a.assignee_id,
  text: a.text,
  date: a.date,
  exactTime: a.exact_time,
  status: a.status,
  done: a.done,
  createdAt: a.created_at,
  modifiedAt: a.modified_at
});

let mapNote = (n: any) => ({
  noteId: n.id,
  contactId: n.contact_id,
  authorId: n.author_id,
  author: n.author,
  text: n.text,
  linkedDealId: n.linked_deal_id,
  date: n.date,
  createdAt: n.created_at,
  modifiedAt: n.modified_at
});

let mapCall = (c: any) => ({
  callId: c.id,
  contactId: c.contact_id,
  authorId: c.author_id,
  author: c.author,
  phoneNumber: c.phone_number,
  text: c.text,
  callResult: c.call_result,
  callTime: c.call_time_int ? String(c.call_time_int) : c.time,
  via: c.via,
  recordingLink: c.recording_link,
  createdAt: c.created_at,
  modifiedAt: c.modified_at
});

let mapMeeting = (m: any) => ({
  meetingId: m.id,
  contactId: m.contact_id,
  authorId: m.author_id,
  author: m.author,
  text: m.text,
  meetingTime: m.meeting_time_int ? String(m.meeting_time_int) : m.time,
  place: m.place,
  createdAt: m.created_at,
  modifiedAt: m.modified_at
});

let mapPredefinedItem = (i: any) => ({
  predefinedItemId: i.id,
  name: i.name,
  description: i.description,
  cost: i.cost,
  price: i.price,
  amount: i.amount
});

let mapStatus = (s: any) => ({
  statusId: s.id,
  text: s.text,
  description: s.description,
  color: s.color,
  count: s.count ?? s.counts
});

let mapLeadSource = (ls: any) => ({
  leadSourceId: ls.id,
  text: ls.text,
  count: ls.count ?? ls.counts
});

// Helper to build address for API (camelCase -> snake_case)
let buildAddress = (addr: any) => {
  if (!addr) return undefined;
  return {
    address: addr.address,
    city: addr.city,
    state: addr.state,
    zip_code: addr.zipCode,
    country_code: addr.countryCode
  };
};

let buildCustomFields = (fields?: any[], fieldKey = 'custom_field') => {
  if (!fields) return undefined;
  return fields.map((f: any) => ({
    [fieldKey]: {
      id: f.customFieldId
    },
    value: f.value
  }));
};

export class Client {
  private axios;
  private userId: string;

  constructor(auth: { userId: string; token: string }) {
    this.userId = auth.userId;
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      auth: {
        username: auth.userId,
        password: auth.token
      },
      errorMapping: {
        extractResponseData: response =>
          isApiErrorRecord(response.data)
            ? {
                ...response.data,
                message: response.data.error_message ?? response.data.message,
                code: response.data.error_name
              }
            : response.data
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'OnePageCRM',
          reason: 'onepage_api_error',
          extractUpstreamCode: error => {
            if (!isApiErrorRecord(error) || !isApiErrorRecord(error.data)) return undefined;
            let upstream = error.data.upstream;
            return isApiErrorRecord(upstream) && typeof upstream.code === 'string'
              ? upstream.code
              : undefined;
          }
        })
    });
  }

  async getCurrentUser() {
    let response = await this.axios.get(`/users/${encodeURIComponent(this.userId)}.json`);
    let user = response.data?.data?.user;
    if (!user || typeof user.id !== 'string') {
      throw createApiServiceError('OnePageCRM did not return the authenticated user profile.');
    }
    return {
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      companyName: user.company_name,
      accountRights: user.account_rights,
      photoUrl: user.photo_url,
      countryCode: user.country_code
    };
  }

  // ---------- Contacts ----------

  async listContacts(
    params: {
      page?: number;
      perPage?: number;
      modifiedSince?: string;
      letter?: string;
      search?: string;
      statusId?: string;
      leadSourceId?: string;
      tag?: string;
      sortBy?: string;
      order?: string;
    } = {}
  ) {
    let response = await this.axios.get('/contacts.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        modified_since: params.modifiedSince,
        letter: params.letter,
        search: params.search,
        status_id: params.statusId,
        lead_source_id: params.leadSourceId,
        tag: params.tag,
        sort_by: params.sortBy,
        order: params.order
      }
    });
    let contacts = response.data?.data?.contacts ?? [];
    return {
      contacts: contacts.map((item: any) => mapContact(item.contact ?? item)),
      totalCount:
        response.data?.data?.total_count ?? response.data?.data?.contacts?.length ?? 0,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}.json`);
    let c = response.data?.data?.contact ?? response.data?.data;
    return mapContact(c);
  }

  async createContact(data: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    jobTitle?: string;
    background?: string;
    statusId?: string;
    leadSourceId?: string;
    ownerId?: string;
    emails?: { type: string; value: string }[];
    phones?: { type: string; value: string }[];
    urls?: { type: string; value: string }[];
    address?: any;
    tags?: string[];
    starValue?: number;
    starred?: boolean;
    customFields?: any[];
  }) {
    if (!data.lastName?.trim() && !data.companyName?.trim()) {
      throw createApiServiceError('Provide lastName or companyName when creating a contact.');
    }
    if (data.starValue !== undefined) {
      throw createApiServiceError(
        'OnePageCRM supports a boolean star, not a star rating. Use starred instead of starValue.'
      );
    }
    let body: any = {
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      job_title: data.jobTitle,
      background: data.background,
      status_id: data.statusId,
      lead_source_id: data.leadSourceId,
      owner_id: data.ownerId,
      emails: data.emails,
      phones: data.phones,
      urls: data.urls,
      address_list: data.address === undefined ? undefined : [buildAddress(data.address)],
      tags: data.tags,
      starred: data.starred,
      custom_fields: buildCustomFields(data.customFields)
    };

    body = pickDefined(body);

    let response = await this.axios.post('/contacts.json', body);
    let c = response.data?.data?.contact ?? response.data?.data;
    return mapContact(c);
  }

  async updateContact(
    contactId: string,
    data: {
      firstName?: string;
      lastName?: string;
      companyName?: string;
      jobTitle?: string;
      background?: string;
      statusId?: string;
      leadSourceId?: string;
      ownerId?: string;
      emails?: { type: string; value: string }[];
      phones?: { type: string; value: string }[];
      urls?: { type: string; value: string }[];
      address?: any;
      tags?: string[];
      starValue?: number;
      starred?: boolean;
      customFields?: any[];
    }
  ) {
    if (data.starValue !== undefined) {
      throw createApiServiceError(
        'OnePageCRM supports a boolean star, not a star rating. Use starred instead of starValue.'
      );
    }
    let body: any = {
      first_name: data.firstName,
      last_name: data.lastName,
      company_name: data.companyName,
      job_title: data.jobTitle,
      background: data.background,
      status_id: data.statusId,
      lead_source_id: data.leadSourceId,
      owner_id: data.ownerId,
      emails: data.emails,
      phones: data.phones,
      urls: data.urls,
      address_list: data.address === undefined ? undefined : [buildAddress(data.address)],
      tags: data.tags,
      starred: data.starred,
      custom_fields: buildCustomFields(data.customFields)
    };

    body = pickDefined(body);

    let response = await this.axios.put(`/contacts/${contactId}.json`, body, {
      params: { partial: true }
    });
    let c = response.data?.data?.contact ?? response.data?.data;
    return mapContact(c);
  }

  async deleteContact(contactId: string) {
    await this.axios.delete(`/contacts/${contactId}.json`);
  }

  // ---------- Companies ----------

  async listCompanies(
    params: {
      page?: number;
      perPage?: number;
      search?: string;
      sortBy?: string;
      order?: string;
      modifiedSince?: string;
    } = {}
  ) {
    let response = await this.axios.get('/companies.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        search: params.search,
        sort_by: params.sortBy,
        order: params.order,
        modified_since: params.modifiedSince
      }
    });
    let companies = response.data?.data?.companies ?? [];
    return {
      companies: companies.map((item: any) => mapCompany(item.company ?? item)),
      totalCount: response.data?.data?.total_count ?? companies.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}.json`);
    let c = response.data?.data?.company ?? response.data?.data;
    return mapCompany(c);
  }

  async updateCompany(
    companyId: string,
    data: {
      name?: string;
      description?: string;
      phone?: string;
      url?: string;
      address?: any;
      customFields?: any[];
    }
  ) {
    let body: any = {
      name: data.name,
      description: data.description,
      phone: data.phone,
      url: data.url,
      address: buildAddress(data.address),
      company_fields: buildCustomFields(data.customFields, 'company_field')
    };

    body = pickDefined(body);

    let response = await this.axios.put(`/companies/${companyId}.json`, body, {
      params: { partial: true }
    });
    let c = response.data?.data?.company ?? response.data?.data;
    return mapCompany(c);
  }

  // ---------- Deals ----------

  async listDeals(
    params: {
      page?: number;
      perPage?: number;
      contactId?: string;
      companyId?: string;
      status?: string;
      sortBy?: string;
      order?: string;
      modifiedSince?: string;
    } = {}
  ) {
    let response = await this.axios.get('/deals.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        contact_id: params.contactId,
        company_id: params.companyId,
        status: params.status,
        sort_by: params.sortBy,
        order: params.order,
        modified_since: params.modifiedSince
      }
    });
    let deals = response.data?.data?.deals ?? [];
    return {
      deals: deals.map((item: any) => mapDeal(item.deal ?? item)),
      totalCount: response.data?.data?.total_count ?? deals.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async getDeal(dealId: string) {
    let response = await this.axios.get(`/deals/${encodeURIComponent(dealId)}.json`);
    let d = response.data?.data?.deal ?? response.data?.data;
    return mapDeal(d);
  }

  async createDeal(data: {
    contactId: string;
    name: string;
    amount?: number;
    months?: number;
    status?: string;
    stage?: number;
    expectedCloseDate?: string;
    closeDate?: string;
    text?: string;
    ownerId?: string;
    customFields?: any[];
  }) {
    let body: any = {
      contact_id: data.contactId,
      name: data.name,
      amount: data.amount,
      months: data.months,
      status: data.status,
      stage: data.stage,
      expected_close_date: data.expectedCloseDate,
      close_date: data.closeDate,
      text: data.text,
      owner_id: data.ownerId,
      deal_fields: buildCustomFields(data.customFields, 'deal_field')
    };

    body = pickDefined(body);

    let response = await this.axios.post('/deals.json', body);
    let d = response.data?.data?.deal ?? response.data?.data;
    return mapDeal(d);
  }

  async updateDeal(
    dealId: string,
    data: {
      name?: string;
      amount?: number;
      months?: number;
      status?: string;
      stage?: number;
      expectedCloseDate?: string;
      closeDate?: string;
      text?: string;
      ownerId?: string;
      contactId?: string;
      customFields?: any[];
    }
  ) {
    if (data.contactId !== undefined) {
      let current = await this.getDeal(dealId);
      if (data.contactId !== current.contactId) {
        throw createApiServiceError(
          'OnePageCRM cannot move an existing deal to another contact. Omit contactId when updating a deal.'
        );
      }
    }
    let body: any = {
      name: data.name,
      amount: data.amount,
      months: data.months,
      status: data.status,
      stage: data.stage,
      expected_close_date: data.expectedCloseDate,
      close_date: data.closeDate,
      text: data.text,
      owner_id: data.ownerId,
      deal_fields: buildCustomFields(data.customFields, 'deal_field')
    };

    body = pickDefined(body);

    let response = await this.axios.put(`/deals/${encodeURIComponent(dealId)}.json`, body, {
      params: { partial: true }
    });
    let d = response.data?.data?.deal ?? response.data?.data;
    return mapDeal(d);
  }

  async deleteDeal(dealId: string) {
    await this.axios.delete(`/deals/${encodeURIComponent(dealId)}.json`);
  }

  // ---------- Actions ----------

  async listActions(
    params: {
      page?: number;
      perPage?: number;
      contactId?: string;
      assigneeId?: string;
      status?: string;
      modifiedSince?: string;
    } = {}
  ) {
    let response = await this.axios.get('/actions.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        contact_id: params.contactId,
        assignee_id: params.assigneeId,
        status: params.status,
        modified_since: params.modifiedSince
      }
    });
    let actions = response.data?.data?.actions ?? [];
    return {
      actions: actions.map((item: any) => mapAction(item.action ?? item)),
      totalCount: response.data?.data?.total_count ?? actions.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async getAction(actionId: string) {
    let response = await this.axios.get(`/actions/${actionId}.json`);
    let a = response.data?.data?.action ?? response.data?.data;
    return mapAction(a);
  }

  async createAction(data: {
    contactId: string;
    text: string;
    assigneeId?: string;
    date?: string;
    exactTime?: number;
    status?: string;
  }) {
    let body: any = {
      contact_id: data.contactId,
      text: data.text,
      assignee_id: data.assigneeId,
      date: data.date,
      exact_time: data.exactTime,
      status: data.status
    };

    body = pickDefined(body);

    let response = await this.axios.post('/actions.json', body);
    let a = response.data?.data?.action ?? response.data?.data;
    return mapAction(a);
  }

  async updateAction(
    actionId: string,
    data: {
      text?: string;
      assigneeId?: string;
      date?: string;
      exactTime?: number;
      status?: string;
    }
  ) {
    let body: any = {
      text: data.text,
      assignee_id: data.assigneeId,
      date: data.date,
      exact_time: data.exactTime,
      status: data.status
    };

    body = pickDefined(body);

    let response = await this.axios.put(`/actions/${actionId}.json`, body, {
      params: { partial: true }
    });
    let a = response.data?.data?.action ?? response.data?.data;
    return mapAction(a);
  }

  async completeAction(actionId: string) {
    let response = await this.axios.put(
      `/actions/${encodeURIComponent(actionId)}/mark_as_done.json`
    );
    let a = response.data?.data?.action ?? response.data?.data;
    return mapAction(a);
  }

  async uncompleteAction(actionId: string) {
    let response = await this.axios.put(
      `/actions/${encodeURIComponent(actionId)}/undo_completion.json`
    );
    let a = response.data?.data?.action ?? response.data?.data;
    return mapAction(a);
  }

  async deleteAction(actionId: string) {
    await this.axios.delete(`/actions/${actionId}.json`);
  }

  // ---------- Notes ----------

  async listNotes(
    params: {
      page?: number;
      perPage?: number;
      contactId?: string;
      companyId?: string;
      modifiedSince?: string;
    } = {}
  ) {
    let response = await this.axios.get('/notes.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        contact_id: params.contactId,
        company_id: params.companyId,
        modified_since: params.modifiedSince
      }
    });
    let notes = response.data?.data?.notes ?? [];
    return {
      notes: notes.map((item: any) => mapNote(item.note ?? item)),
      totalCount: response.data?.data?.total_count ?? notes.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async getNote(noteId: string) {
    let response = await this.axios.get(`/notes/${encodeURIComponent(noteId)}.json`);
    let n = response.data?.data?.note ?? response.data?.data;
    return mapNote(n);
  }

  async createNote(data: {
    contactId: string;
    text: string;
    linkedDealId?: string;
    date?: string;
  }) {
    let body: any = {
      contact_id: data.contactId,
      text: data.text,
      linked_deal_id: data.linkedDealId,
      date: data.date
    };

    body = pickDefined(body);

    let response = await this.axios.post('/notes.json', body);
    let n = response.data?.data?.note ?? response.data?.data;
    return mapNote(n);
  }

  async updateNote(
    noteId: string,
    data: {
      text?: string;
      linkedDealId?: string;
      date?: string;
    }
  ) {
    let body: any = {
      text: data.text,
      linked_deal_id: data.linkedDealId,
      date: data.date
    };

    body = pickDefined(body);

    let response = await this.axios.put(`/notes/${encodeURIComponent(noteId)}.json`, body, {
      params: { partial: true }
    });
    let n = response.data?.data?.note ?? response.data?.data;
    return mapNote(n);
  }

  async deleteNote(noteId: string) {
    await this.axios.delete(`/notes/${encodeURIComponent(noteId)}.json`);
  }

  // ---------- Calls ----------

  async listCalls(
    params: {
      page?: number;
      perPage?: number;
      contactId?: string;
      companyId?: string;
      modifiedSince?: string;
    } = {}
  ) {
    let response = await this.axios.get('/calls.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        contact_id: params.contactId,
        company_id: params.companyId,
        modified_since: params.modifiedSince
      }
    });
    let calls = response.data?.data?.calls ?? [];
    return {
      calls: calls.map((item: any) => mapCall(item.call ?? item)),
      totalCount: response.data?.data?.total_count ?? calls.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async createCall(data: {
    contactId: string;
    text?: string;
    phoneNumber?: string;
    callResult?: string;
    callTimeInt?: number;
    via?: string;
    recordingLink?: string;
  }) {
    let body: any = {
      contact_id: data.contactId,
      text: data.text,
      phone_number: data.phoneNumber,
      call_result: data.callResult,
      call_time_int: data.callTimeInt,
      via: data.via,
      recording_link: data.recordingLink
    };

    body = pickDefined(body);

    let response = await this.axios.post('/calls.json', body);
    let c = response.data?.data?.call ?? response.data?.data;
    return mapCall(c);
  }

  async deleteCall(callId: string) {
    await this.axios.delete(`/calls/${callId}.json`);
  }

  // ---------- Meetings ----------

  async listMeetings(
    params: {
      page?: number;
      perPage?: number;
      contactId?: string;
      companyId?: string;
      modifiedSince?: string;
    } = {}
  ) {
    let response = await this.axios.get('/meetings.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10,
        contact_id: params.contactId,
        company_id: params.companyId,
        modified_since: params.modifiedSince
      }
    });
    let meetings = response.data?.data?.meetings ?? [];
    return {
      meetings: meetings.map((item: any) => mapMeeting(item.meeting ?? item)),
      totalCount: response.data?.data?.total_count ?? meetings.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  async createMeeting(data: {
    contactId: string;
    text?: string;
    meetingTimeInt?: number;
    place?: string;
  }) {
    let body: any = {
      contact_id: data.contactId,
      text: data.text,
      meeting_time_int: data.meetingTimeInt,
      place: data.place
    };

    body = pickDefined(body);

    let response = await this.axios.post('/meetings.json', body);
    let m = response.data?.data?.meeting ?? response.data?.data;
    return mapMeeting(m);
  }

  async deleteMeeting(meetingId: string) {
    await this.axios.delete(`/meetings/${meetingId}.json`);
  }

  // ---------- Predefined Items ----------

  async listPredefinedItems() {
    let response = await this.axios.get('/predefined_items.json');
    let items = response.data?.data?.predefined_items ?? [];
    return items.map((item: any) => mapPredefinedItem(item.predefined_item ?? item));
  }

  // ---------- Statuses ----------

  async listStatuses() {
    let response = await this.axios.get('/statuses.json');
    let statuses = response.data?.data?.statuses ?? [];
    return statuses.map((item: any) => mapStatus(item.status ?? item));
  }

  // ---------- Lead Sources ----------

  async listLeadSources() {
    let response = await this.axios.get('/lead_sources.json');
    let sources = response.data?.data?.lead_sources ?? [];
    return sources.map((item: any) => mapLeadSource(item.lead_source ?? item));
  }

  // ---------- Action Stream ----------

  async getActionStream(params: { page?: number; perPage?: number } = {}) {
    let response = await this.axios.get('/action_stream.json', {
      params: {
        page: params.page ?? 1,
        per_page: params.perPage ?? 10
      }
    });
    let contacts = response.data?.data?.contacts ?? [];
    return {
      contacts: contacts.map((item: any) => {
        let contact = item.contact ?? item;
        return {
          ...mapContact(contact),
          nextAction:
            (item.next_action ?? contact.next_action)
              ? mapAction(item.next_action ?? contact.next_action)
              : undefined
        };
      }),
      totalCount: response.data?.data?.total_count ?? contacts.length,
      page: response.data?.data?.page ?? params.page ?? 1,
      perPage: response.data?.data?.per_page ?? params.perPage ?? 10
    };
  }

  // ---------- Search ----------

  async searchContacts(query: string, params: { page?: number; perPage?: number } = {}) {
    return this.listContacts({ search: query, page: params.page, perPage: params.perPage });
  }
}
