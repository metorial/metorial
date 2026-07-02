import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://apiv2.lagrowthmachine.com/flow'
});

export interface LeadData {
  audience?: string;
  leadId?: string;
  firstname?: string;
  lastname?: string;
  proEmail?: string;
  persoEmail?: string;
  linkedinUrl?: string;
  twitter?: string;
  phone?: string;
  companyName?: string;
  companyUrl?: string;
  jobTitle?: string;
  location?: string;
  industry?: string;
  gender?: string;
  bio?: string;
  profilePicture?: string;
  customAttribute1?: string;
  customAttribute2?: string;
  customAttribute3?: string;
  customAttribute4?: string;
  customAttribute5?: string;
  customAttribute6?: string;
  customAttribute7?: string;
  customAttribute8?: string;
  customAttribute9?: string;
  customAttribute10?: string;
}

export interface SearchLeadParams {
  email?: string;
  leadId?: string;
  linkedinUrl?: string;
  firstname?: string;
  lastname?: string;
  companyName?: string;
  companyUrl?: string;
}

export interface UpdateLeadStatusParams {
  email?: string;
  leadId?: string;
  linkedinUrl?: string;
  firstname?: string;
  lastname?: string;
  companyName?: string;
  companyUrl?: string;
  campaignId: string;
  status: string;
}

export interface RemoveLeadParams {
  audience: string | string[];
  email?: string;
  leadId?: string;
  linkedinUrl?: string;
  twitter?: string;
  crmId?: string;
  firstname?: string;
  lastname?: string;
  companyName?: string;
  companyUrl?: string;
}

export interface CreateInboxWebhookParams {
  url: string;
  name: string;
  description?: string;
  campaigns?: string[];
}

export interface SendLinkedInMessageParams {
  leadId?: string;
  linkedinUrl?: string;
  message: string;
  identityId: string;
}

export interface ImportLinkedInParams {
  audience: string;
  identityId: string;
  linkedinUrl: string;
  autoImport?: boolean;
  excludeContactedLeads?: boolean;
  linkedinPostCategory?: string;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get params() {
    return { apikey: this.token };
  }

  async searchLead(searchParams: SearchLeadParams): Promise<any> {
    let response = await http.get('/leads/search', {
      params: { ...this.params, ...searchParams }
    });
    return response.data;
  }

  async createOrUpdateLead(leadData: LeadData): Promise<any> {
    let response = await http.post('/leads', leadData, {
      params: this.params
    });
    return response.data;
  }

  async removeLeadFromAudiences(data: RemoveLeadParams): Promise<any> {
    let response = await http.delete('/leads', {
      params: this.params,
      data
    });
    return response.data;
  }

  async updateLeadStatus(data: UpdateLeadStatusParams): Promise<any> {
    let response = await http.put('/leads/status', data, {
      params: this.params
    });
    return response.data;
  }

  async getCampaigns(skip?: number, limit?: number): Promise<any> {
    let response = await http.get('/campaigns', {
      params: {
        ...this.params,
        ...(skip !== undefined ? { skip } : {}),
        ...(limit !== undefined ? { limit } : {})
      }
    });
    return response.data;
  }

  async listAudiences(): Promise<any> {
    let response = await http.get('/audiences', {
      params: this.params
    });
    return response.data;
  }

  async listIdentities(): Promise<any> {
    let response = await http.get('/identities', {
      params: this.params
    });
    return response.data;
  }

  async listMembers(): Promise<any> {
    let response = await http.get('/members', {
      params: this.params
    });
    return response.data;
  }

  async createInboxWebhook(data: CreateInboxWebhookParams): Promise<any> {
    let response = await http.post('/inbox-webhooks', data, {
      params: this.params
    });
    return response.data;
  }

  async listInboxWebhooks(): Promise<any> {
    let response = await http.get('/inbox-webhooks', {
      params: this.params
    });
    return response.data;
  }

  async deleteInboxWebhook(webhookId: string): Promise<any> {
    let response = await http.delete(`/inbox-webhooks/${webhookId}`, {
      params: this.params
    });
    return response.data;
  }

  async sendLinkedInMessage(data: SendLinkedInMessageParams): Promise<any> {
    let response = await http.post('/linkedin/message', data, {
      params: this.params
    });
    return response.data;
  }

  async importFromLinkedIn(data: ImportLinkedInParams): Promise<any> {
    let response = await http.post('/linkedin/import', data, {
      params: this.params
    });
    return response.data;
  }
}
