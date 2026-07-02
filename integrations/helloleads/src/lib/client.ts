import { createAxios } from 'slates';

let BASE_URL = 'https://app.helloleads.io/index.php/private/api';

export interface HelloLeadsClientConfig {
  token: string;
  email: string;
}

export interface CreateLeadParams {
  firstName: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  mobileCode?: string;
  phone?: string;
  fax?: string;
  organization?: string;
  designation?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  website?: string;
  notes?: string;
  interests?: string;
  category?: string;
  tags?: string;
  dealSize?: string;
  potential?: string;
  listKey?: string;
}

export class HelloLeadsClient {
  private http;

  constructor(config: HelloLeadsClientConfig) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'hls-key': `token=${config.token}`,
        Xemail: config.email,
        'Content-Type': 'application/json'
      }
    });
  }

  async listLeads(params?: { page?: number; limit?: number }): Promise<any> {
    let response = await this.http.get('/leads', {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 100
      }
    });
    return response.data;
  }

  async createLead(lead: CreateLeadParams): Promise<any> {
    let body: Record<string, any> = {
      first_name: lead.firstName
    };

    if (lead.lastName) body.last_name = lead.lastName;
    if (lead.email) body.email = lead.email;
    if (lead.mobile) body.mobile = lead.mobile;
    if (lead.mobileCode) body.mobile_code = lead.mobileCode;
    if (lead.phone) body.phone = lead.phone;
    if (lead.fax) body.fax = lead.fax;
    if (lead.organization) body.organization = lead.organization;
    if (lead.designation) body.designation = lead.designation;
    if (lead.address) body.address = lead.address;
    if (lead.city) body.city = lead.city;
    if (lead.state) body.state = lead.state;
    if (lead.country) body.country = lead.country;
    if (lead.zip) body.zip = lead.zip;
    if (lead.website) body.website = lead.website;
    if (lead.notes) body.notes = lead.notes;
    if (lead.interests) body.interests = lead.interests;
    if (lead.category) body.category = lead.category;
    if (lead.tags) body.tags = lead.tags;
    if (lead.dealSize) body.deal_size = lead.dealSize;
    if (lead.potential) body.potential = lead.potential;
    if (lead.listKey) body.list_key = lead.listKey;

    let response = await this.http.post('/leads', body);
    return response.data;
  }

  async listLists(): Promise<any> {
    let response = await this.http.get('/lists');
    return response.data;
  }

  async getAllLeads(maxResults?: number): Promise<any[]> {
    let allLeads: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let result = await this.listLeads({ page, limit: 100 });
      let leads = Array.isArray(result) ? result : (result?.data ?? result?.leads ?? []);

      if (!Array.isArray(leads) || leads.length === 0) {
        break;
      }

      allLeads.push(...leads);

      if (maxResults && allLeads.length >= maxResults) {
        allLeads = allLeads.slice(0, maxResults);
        break;
      }

      if (leads.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allLeads;
  }
}
