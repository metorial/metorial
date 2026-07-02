import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    count: number;
    page: number;
    last: number;
  };
}

export interface DaffyUser {
  id: number;
  name: string;
  avatar: string;
  cover_image: string;
  slug: string;
  fund_name: string;
  visible: boolean;
  follows_user: boolean;
  follows_viewer: boolean;
  onboarding_status: string;
  current_fund: {
    id: number;
    name: string;
    summary: string;
    causes: DaffyCause[];
    users: {
      id: number;
      name: string;
      avatar: string;
      slug: string;
    }[];
  };
}

export interface DaffyCause {
  id: number;
  name: string;
  color: string;
  logo: string;
}

export interface DaffyBalance {
  amount: number;
  pending_deposit_balance: number;
  portfolio_balance: number;
  available_balance: number;
}

export interface DaffyNonProfit {
  ein: string;
  name: string;
  website: string;
  city: string;
  state: string;
  public_url: string;
  public_path: string;
  logo: string;
  latitude: number;
  longitude: number;
  cause: DaffyCause;
  causes: DaffyCause[];
}

export interface DaffyDonation {
  id: number;
  amount: number;
  status: string;
  note: string;
  visibility: string;
  created_at: string;
  mailed_at: string;
  non_profit: {
    ein: string;
    name: string;
    website: string;
    city: string;
    state: string;
    logo: string;
    public_path: string;
    public_url: string;
    cause_id: number;
  };
  fund: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
    city: string;
    avatar: string;
    slug: string;
  };
}

export interface DaffyContribution {
  id: number;
  units: number;
  type: string;
  status: string;
  valuation: number;
  currency: string;
  created_at: string;
  received_at: string;
  completed_at: string;
}

export interface DaffyGift {
  name: string;
  amount: number;
  message: string;
  code: string;
  ein: string;
  seen: boolean;
  status: string;
  updated_at: string;
  created_at: string;
  claimed: boolean;
  url: string;
}

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://public.daffy.org/v1',
      headers: {
        'X-Api-Key': config.token
      }
    });
  }

  // === Users ===

  async getMe(): Promise<DaffyUser> {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  async getUserByUsername(username: string): Promise<DaffyUser> {
    let response = await this.http.get(`/users/${encodeURIComponent(username)}`);
    return response.data;
  }

  // === Balance ===

  async getBalance(): Promise<DaffyBalance> {
    let response = await this.http.get('/users/me/balance');
    return response.data;
  }

  // === Causes ===

  async getUserCauses(userId: number): Promise<DaffyCause[]> {
    let response = await this.http.get(`/users/${userId}/causes`);
    return response.data;
  }

  // === Contributions ===

  async getContributions(page?: number): Promise<PaginatedResponse<DaffyContribution>> {
    let response = await this.http.get('/contributions', {
      params: page ? { page } : undefined
    });
    return response.data;
  }

  // === Donations ===

  async getDonations(page?: number): Promise<PaginatedResponse<DaffyDonation>> {
    let response = await this.http.get('/donations', {
      params: page ? { page } : undefined
    });
    return response.data;
  }

  async getUserDonations(
    userId: number,
    page?: number
  ): Promise<PaginatedResponse<DaffyDonation>> {
    let response = await this.http.get(`/users/${userId}/donations`, {
      params: page ? { page } : undefined
    });
    return response.data;
  }

  async getDonation(userId: number, donationId: number): Promise<DaffyDonation> {
    let response = await this.http.get(`/users/${userId}/donations/${donationId}`);
    return response.data;
  }

  async createDonation(params: {
    amount: number;
    ein: string;
    note?: string;
    privateMemo?: string;
  }): Promise<DaffyDonation> {
    let response = await this.http.post('/donations', {
      amount: params.amount,
      ein: params.ein,
      note: params.note,
      private_memo: params.privateMemo
    });
    return response.data;
  }

  async cancelDonation(donationId: number): Promise<void> {
    await this.http.delete(`/donations/${donationId}`);
  }

  // === Gifts ===

  async getGifts(page?: number): Promise<PaginatedResponse<DaffyGift>> {
    let response = await this.http.get('/gifts', {
      params: page ? { page } : undefined
    });
    return response.data;
  }

  async getGift(code: string): Promise<DaffyGift> {
    let response = await this.http.get(`/gifts/${encodeURIComponent(code)}`);
    return response.data;
  }

  async createGift(params: { name: string; amount: number }): Promise<DaffyGift> {
    let response = await this.http.post('/gifts', {
      name: params.name,
      amount: params.amount
    });
    return response.data;
  }

  // === Non-Profits ===

  async getNonProfit(ein: string): Promise<DaffyNonProfit> {
    let response = await this.http.get(`/non_profits/${encodeURIComponent(ein)}`);
    return response.data;
  }

  async searchNonProfits(params: {
    query?: string;
    causeId?: number;
    page?: number;
  }): Promise<PaginatedResponse<DaffyNonProfit>> {
    let queryParams: Record<string, string | number> = {};
    if (params.query) queryParams.query = params.query;
    if (params.causeId) queryParams.cause_id = params.causeId;
    if (params.page) queryParams.page = params.page;

    let response = await this.http.get('/non_profits', { params: queryParams });
    return response.data;
  }
}
