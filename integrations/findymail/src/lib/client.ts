import { createAxios } from 'slates';

export class FindymailClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://app.findymail.com/api',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async findEmailByName(params: { name: string; domain: string }) {
    let res = await this.http.post('/search/name', {
      name: params.name,
      domain: params.domain
    });
    return res.data;
  }

  async findEmailByDomain(params: { name: string; domain: string }) {
    let res = await this.http.post('/search/domain', {
      name: params.name,
      domain: params.domain
    });
    return res.data;
  }

  async findEmailByLinkedIn(params: { linkedinUrl: string }) {
    let res = await this.http.post('/search/linkedin', {
      linkedin_url: params.linkedinUrl
    });
    return res.data;
  }

  async verifyEmail(params: { email: string }) {
    let res = await this.http.post('/verify', {
      email: params.email
    });
    return res.data;
  }

  async reverseEmailLookup(params: { email: string; withProfile?: boolean }) {
    let res = await this.http.post('/search/reverse-email', {
      email: params.email,
      with_profile: params.withProfile ?? false
    });
    return res.data;
  }

  async findPhone(params: { linkedinUrl: string }) {
    let res = await this.http.post('/search/phone', {
      linkedin_url: params.linkedinUrl
    });
    return res.data;
  }

  async enrichCompany(params: { domain?: string; linkedinUrl?: string; name?: string }) {
    let body: Record<string, string> = {};
    if (params.domain) body.domain = params.domain;
    if (params.linkedinUrl) body.linkedin_url = params.linkedinUrl;
    if (params.name) body.name = params.name;
    let res = await this.http.post('/search/company', body);
    return res.data;
  }

  async searchEmployees(params: { website: string; jobTitles: string[]; count?: number }) {
    let res = await this.http.post('/search/employees', {
      website: params.website,
      job_titles: params.jobTitles,
      count: params.count
    });
    return res.data;
  }

  async intellimatchSearch(params: {
    query: string;
    limit?: number;
    findContact?: boolean;
    findEmail?: boolean;
  }) {
    let res = await this.http.post('/intellimatch/search', {
      query: params.query,
      limit: params.limit,
      config: {
        find_contact: params.findContact ?? false,
        find_email: params.findEmail ?? false
      }
    });
    return res.data;
  }

  async getIntellimatchStatus(params: { searchId: string }) {
    let res = await this.http.get('/intellimatch/status', {
      params: { search_id: params.searchId }
    });
    return res.data;
  }

  async getIntellimatchData(params: { searchId: string }) {
    let res = await this.http.get('/intellimatch/data', {
      params: { search_id: params.searchId }
    });
    return res.data;
  }

  async getContactLists() {
    let res = await this.http.get('/lists');
    return res.data;
  }

  async getContact(params: { contactId: string }) {
    let res = await this.http.get(`/contacts/get/${params.contactId}`);
    return res.data;
  }

  async getCredits() {
    let res = await this.http.get('/credits');
    return res.data;
  }
}
