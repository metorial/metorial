import { createAxios } from 'slates';

let ax = createAxios({
  baseURL: 'https://api.givebutter.com/v1'
});

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export class Client {
  constructor(private config: { token: string }) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  // --- Campaigns ---

  async listCampaigns(params?: {
    page?: number;
    scope?: string;
  }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/campaigns', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getCampaign(campaignId: number | string): Promise<any> {
    let response = await ax.get(`/campaigns/${campaignId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createCampaign(data: {
    title?: string;
    type?: string;
    subtitle?: string;
    description?: string;
    slug?: string;
    goal?: number;
    end_at?: string;
  }): Promise<any> {
    let response = await ax.post('/campaigns', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCampaign(
    campaignId: number | string,
    data: {
      title?: string;
      type?: string;
      subtitle?: string;
      description?: string;
      slug?: string;
      goal?: number | string;
      end_at?: string;
    }
  ): Promise<any> {
    let response = await ax.patch(`/campaigns/${campaignId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCampaign(campaignId: number | string): Promise<void> {
    await ax.delete(`/campaigns/${campaignId}`, {
      headers: this.headers
    });
  }

  // --- Contacts ---

  async listContacts(params?: {
    page?: number;
    scope?: string;
  }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/contacts', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getContact(contactId: number | string): Promise<any> {
    let response = await ax.get(`/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createContact(data: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    emails?: Array<{ type?: string; value: string }>;
    phones?: Array<{ type?: string; value: string }>;
    addresses?: Array<{
      address_1?: string;
      address_2?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      country?: string;
    }>;
    tags?: string[];
    dob?: string;
    company?: string;
    title?: string;
    twitter_url?: string;
    linkedin_url?: string;
    facebook_url?: string;
    force_create?: boolean;
  }): Promise<any> {
    let response = await ax.post('/contacts', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateContact(
    contactId: number | string,
    data: {
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      dob?: string;
      company?: string;
      title?: string;
      twitter_url?: string;
      linkedin_url?: string;
      facebook_url?: string;
    }
  ): Promise<any> {
    let response = await ax.patch(`/contacts/${contactId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async archiveContact(contactId: number | string): Promise<void> {
    await ax.delete(`/contacts/${contactId}`, {
      headers: this.headers
    });
  }

  async restoreContact(contactId: number | string): Promise<any> {
    let response = await ax.post(
      `/contacts/${contactId}/restore`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Transactions ---

  async listTransactions(params?: {
    page?: number;
    scope?: string;
  }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/transactions', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTransaction(transactionId: string): Promise<any> {
    let response = await ax.get(`/transactions/${transactionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTransaction(data: {
    campaign_id?: number;
    campaign_code?: string;
    first_name: string;
    last_name: string;
    email: string;
    amount: number;
    method: string;
    phone?: string;
    company?: string;
    address?: {
      address_1?: string;
      address_2?: string;
      city?: string;
      state?: string;
      zipcode?: string;
      country?: string;
    };
    fund_id?: number | string;
    transacted_at?: string;
  }): Promise<any> {
    let response = await ax.post('/transactions', data, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Plans ---

  async listPlans(params?: { page?: number }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/plans', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getPlan(planId: string): Promise<any> {
    let response = await ax.get(`/plans/${planId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Funds ---

  async listFunds(params?: { page?: number }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/funds', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getFund(fundId: string): Promise<any> {
    let response = await ax.get(`/funds/${fundId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createFund(data: { name: string; code?: string }): Promise<any> {
    let response = await ax.post('/funds', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateFund(fundId: string, data: { name?: string; code?: string }): Promise<any> {
    let response = await ax.patch(`/funds/${fundId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteFund(fundId: string): Promise<void> {
    await ax.delete(`/funds/${fundId}`, {
      headers: this.headers
    });
  }

  // --- Tickets ---

  async listTickets(params?: { page?: number }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/tickets', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTicket(ticketId: string): Promise<any> {
    let response = await ax.get(`/tickets/${ticketId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Payouts ---

  async listPayouts(params?: { page?: number }): Promise<PaginatedResponse<any>> {
    let response = await ax.get('/payouts', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getPayout(payoutId: string): Promise<any> {
    let response = await ax.get(`/payouts/${payoutId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Campaign Members ---

  async listMembers(
    campaignId: number | string,
    params?: { page?: number }
  ): Promise<PaginatedResponse<any>> {
    let response = await ax.get(`/campaigns/${campaignId}/members`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getMember(campaignId: number | string, memberId: number | string): Promise<any> {
    let response = await ax.get(`/campaigns/${campaignId}/members/${memberId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteMember(campaignId: number | string, memberId: number | string): Promise<void> {
    await ax.delete(`/campaigns/${campaignId}/members/${memberId}`, {
      headers: this.headers
    });
  }

  // --- Campaign Teams ---

  async listTeams(
    campaignId: number | string,
    params?: { page?: number }
  ): Promise<PaginatedResponse<any>> {
    let response = await ax.get(`/campaigns/${campaignId}/teams`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTeam(campaignId: number | string, teamId: number | string): Promise<any> {
    let response = await ax.get(`/campaigns/${campaignId}/teams/${teamId}`, {
      headers: this.headers
    });
    return response.data;
  }
}
