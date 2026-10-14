import { buildApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';

let campaynApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Campayn',
    reason: 'campayn_api_error',
    detailKeys: [
      'msg',
      'message',
      'detail',
      'error',
      'error_description',
      'errorCode',
      'code'
    ],
    extractResponse: (input, helpers) => {
      let response = helpers.getResponse(input);
      if (!helpers.isRecord(input) || !helpers.isRecord(input.data)) return response;
      let baggage = helpers.isRecord(input.data.baggage) ? input.data.baggage : undefined;
      return baggage?.response !== undefined
        ? { ...response, data: baggage.response }
        : response;
    },
    extractUpstreamCode: (input, response, helpers) => {
      if (helpers.isRecord(response?.data) && typeof response.data.errorCode === 'string') {
        return response.data.errorCode;
      }
      if (helpers.isRecord(input) && helpers.isRecord(input.data)) {
        let upstream = helpers.isRecord(input.data.upstream) ? input.data.upstream : undefined;
        if (typeof upstream?.code === 'string') return upstream.code;
      }
      return undefined;
    }
  });

export interface CampaynList {
  id: string;
  list_name: string;
  tags: string;
  contact_count: number;
}

export interface CampaynContactSummary {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
}

export interface CampaynPhone {
  value: string;
  type: string;
}

export interface CampaynSite {
  value: string;
  type: string;
}

export interface CampaynSocial {
  value: string;
  type: string;
  protocol: string;
}

export interface CampaynCustomField {
  field: string;
  value: string;
  variable?: string;
}

export interface CampaynContact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  title: string;
  company: string;
  address: string;
  country_id: string;
  country: string;
  city: string;
  state: string;
  zip: string;
  birthday: string;
  tags: string;
  phones: CampaynPhone[];
  sites: CampaynSite[];
  social: CampaynSocial[];
  custom_fields: CampaynCustomField[];
  image_url: string;
}

export interface CampaynCreateContactInput {
  email: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phones?: CampaynPhone[];
  sites?: CampaynSite[];
  social?: CampaynSocial[];
  custom_fields?: CampaynCustomField[];
  failOnDuplicate?: boolean;
}

export interface CampaynEmail {
  id: string;
  name: string;
  scheduled_date: string | null;
  send_now: string;
  send_count: string;
  campaign_title: string | null;
  status: string;
  unique_views: number;
  unique_responses: number;
  percent_views: number;
  percent_responses: number;
  preview_url: string;
  preview_thumb: string;
}

export interface CampaynReport {
  id: string;
  name: string;
  scheduled_date: string;
  status: string;
  preview_url: string;
  report_url: string | null;
}

export interface CampaynForm {
  id: string;
  contact_list_id: string;
  form_title: string;
  form_type: string;
  form_html: string;
  signup_count: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://campayn.com/api/v1',
      authHeader: { value: `TRUEREST apikey=${config.token}` },
      errorAdapter: campaynApiError
    });
  }

  private async request<T>(request: () => Promise<{ data: T }>): Promise<T> {
    let { data } = await request();
    if (isApiErrorRecord(data) && (data.success === false || data.success === 0)) {
      throw campaynApiError({ response: { data } });
    }
    return data;
  }

  // ---- Lists ----

  async getLists(): Promise<CampaynList[]> {
    return this.request(() => this.axios.get<CampaynList[]>('/lists.json'));
  }

  async getListContacts(listId: string, filter?: string): Promise<CampaynContactSummary[]> {
    let params: Record<string, string> = {};
    if (filter) {
      params['filter[contact]'] = filter;
    }
    return this.request(() =>
      this.axios.get<CampaynContactSummary[]>(
        `/lists/${encodeURIComponent(listId)}/contacts.json`,
        { params }
      )
    );
  }

  // ---- Contacts ----

  async getContact(contactId: string): Promise<CampaynContact> {
    return this.request(() =>
      this.axios.get<CampaynContact>(`/contacts/${encodeURIComponent(contactId)}.json`)
    );
  }

  async createContact(
    listId: string,
    contact: CampaynCreateContactInput
  ): Promise<{ success: boolean }> {
    return this.request(() =>
      this.axios.post<{ success: boolean }>(
        `/lists/${encodeURIComponent(listId)}/contacts.json`,
        contact
      )
    );
  }

  async updateContact(
    contactId: string,
    contact: Partial<CampaynCreateContactInput>
  ): Promise<{ success: boolean }> {
    return this.request(() =>
      this.axios.put<{ success: boolean }>(
        `/contacts/${encodeURIComponent(contactId)}.json`,
        contact
      )
    );
  }

  async unsubscribeByEmail(
    listId: string,
    email: string
  ): Promise<{
    contactCount: number;
    success: boolean;
    msg: string;
    unsubscribeCount: number;
  }> {
    return this.request(() =>
      this.axios.post<{
        contactCount: number;
        success: boolean;
        msg: string;
        unsubscribeCount: number;
      }>(`/lists/${encodeURIComponent(listId)}/unsubscribe.json`, { email })
    );
  }

  async unsubscribeById(listId: string, contactId: string): Promise<{ success: number }> {
    return this.request(() =>
      this.axios.post<{ success: number }>(
        `/lists/${encodeURIComponent(listId)}/unsubscribe.json`,
        { id: contactId }
      )
    );
  }

  // ---- Emails ----

  async getEmails(): Promise<CampaynEmail[]> {
    return this.request(() => this.axios.get<CampaynEmail[]>('/emails.json'));
  }

  // ---- Reports ----

  async getReports(from?: number, to?: number): Promise<CampaynReport[]> {
    let params: Record<string, number> = {};
    if (from !== undefined) {
      params.from = from;
    }
    if (to !== undefined) {
      params.to = to;
    }
    return this.request(() =>
      this.axios.get<CampaynReport[]>('/reports/calendar.json', { params })
    );
  }

  // ---- Forms ----

  async getForms(listId: string, formType?: string): Promise<CampaynForm[]> {
    let params: Record<string, string> = {};
    if (formType !== undefined) {
      params['filter[form_type]'] = formType;
    }
    return this.request(() =>
      this.axios.get<CampaynForm[]>(`/lists/${encodeURIComponent(listId)}/forms.json`, {
        params
      })
    );
  }

  async getForm(listId: string, formId: string): Promise<CampaynForm> {
    return this.request(() =>
      this.axios.get<CampaynForm>(
        `/lists/${encodeURIComponent(listId)}/forms/${encodeURIComponent(formId)}.json`
      )
    );
  }
}
