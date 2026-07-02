import { createAxios } from 'slates';

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
    this.axios = createAxios({
      baseURL: 'https://campayn.com/api/v1',
      headers: {
        Authorization: `TRUEREST apikey=${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Lists ----

  async getLists(): Promise<CampaynList[]> {
    let response = await this.axios.get('/lists.json');
    return response.data;
  }

  async getListContacts(listId: string, filter?: string): Promise<CampaynContactSummary[]> {
    let params: Record<string, string> = {};
    if (filter) {
      params['filter[contact]'] = filter;
    }
    let response = await this.axios.get(`/lists/${listId}/contacts.json`, { params });
    return response.data;
  }

  // ---- Contacts ----

  async getContact(contactId: string): Promise<CampaynContact> {
    let response = await this.axios.get(`/contacts/${contactId}.json`);
    return response.data;
  }

  async createContact(
    listId: string,
    contact: CampaynCreateContactInput
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/lists/${listId}/contacts.json`, contact);
    return response.data;
  }

  async updateContact(
    contactId: string,
    contact: Partial<CampaynCreateContactInput>
  ): Promise<{ success: boolean }> {
    let response = await this.axios.put(`/contacts/${contactId}.json`, contact);
    return response.data;
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
    let response = await this.axios.post(`/lists/${listId}/unsubscribe.json`, { email });
    return response.data;
  }

  async unsubscribeById(listId: string, contactId: string): Promise<{ success: number }> {
    let response = await this.axios.post(`/lists/${listId}/unsubscribe.json`, {
      id: contactId
    });
    return response.data;
  }

  // ---- Emails ----

  async getEmails(): Promise<CampaynEmail[]> {
    let response = await this.axios.get('/emails.json');
    return response.data;
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
    let response = await this.axios.get('/reports/calendar.json', { params });
    return response.data;
  }

  // ---- Forms ----

  async getForms(listId: string, formType?: string): Promise<CampaynForm[]> {
    let params: Record<string, string> = {};
    if (formType !== undefined) {
      params['filter[form_type]'] = formType;
    }
    let response = await this.axios.get(`/lists/${listId}/forms.json`, { params });
    return response.data;
  }

  async getForm(listId: string, formId: string): Promise<CampaynForm> {
    let response = await this.axios.get(`/lists/${listId}/forms/${formId}.json`);
    return response.data;
  }
}
