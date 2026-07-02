import { createAxios } from 'slates';

export interface ContactAttributes {
  title?: string;
  company_name?: string;
  first?: string;
  name?: string;
  street?: string;
  zip?: string;
  city?: string;
  country_code?: string;
}

export interface CreateCardParams {
  template_id: string;
  deliver_at: string;
  contact_id?: string;
  contact_ids?: string[];
  group_id?: string;
  contacts_attributes?: ContactAttributes[];
  notification_type?: 'before_send' | 'after_send';
  notification_date?: string;
  notification_email?: string;
}

export interface CreateContactParams {
  title?: string;
  company_name?: string;
  first?: string;
  name: string;
  street: string;
  zip: string;
  city: string;
  country_code?: string;
}

export class Client {
  private apiKey: string;
  private http;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
    this.http = createAxios({
      baseURL: 'https://api.echtpost.de/v1',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async listTemplates(): Promise<any[]> {
    let response = await this.http.get('/templates', {
      params: { apikey: this.apiKey }
    });
    return response.data;
  }

  async listContacts(): Promise<any[]> {
    let response = await this.http.get('/contacts', {
      params: { apikey: this.apiKey }
    });
    return response.data;
  }

  async createContact(params: CreateContactParams): Promise<any> {
    let response = await this.http.post('/contacts', params, {
      params: { apikey: this.apiKey }
    });
    return response.data;
  }

  async createCard(params: CreateCardParams): Promise<any> {
    let response = await this.http.post(
      '/cards',
      { card: params },
      {
        params: { apikey: this.apiKey }
      }
    );
    return response.data;
  }
}
