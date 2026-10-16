import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let assertPositiveInteger = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`${field} must be a positive whole number.`);
  }
};

let paginationParams = (page?: number) => {
  if (page !== undefined) assertPositiveInteger(page, 'page');
  return page === undefined ? undefined : { page };
};

let assertNonEmpty = (value: string, field: string) => {
  if (!value.trim()) throw createApiServiceError(`${field} cannot be empty.`);
};

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
  website: string | null;
  city: string | null;
  state: string | null;
  public_url: string;
  public_path: string;
  logo: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cause: DaffyCause | null;
  causes?: DaffyCause[];
}

export interface DaffyDonation {
  id: number;
  amount?: number;
  status: string;
  note: string | null;
  visibility?: string | null;
  scheduled_donation_id?: number | null;
  user_id?: number;
  created_at: string;
  mailed_at: string | null;
  non_profit: {
    ein: string;
    name: string;
    website: string | null;
    city: string | null;
    state: string | null;
    logo: string | null;
    public_path: string;
    public_url: string;
    cause_id: number;
  };
  fund?: {
    id: number;
    name: string;
  };
  user?: {
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
  frequency?: string;
  created_at: string;
  received_at: string | null;
  completed_at: string | null;
}

export interface DaffyGift {
  name: string;
  amount: number;
  message: string | null;
  code: string;
  ein: string | null;
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
    assertNonEmpty(config.token, 'Daffy API key');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://public.daffy.org/v1',
      authHeader: { name: 'X-Api-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Daffy',
          reason: 'daffy_api_error'
        })
    });
  }

  // === Users ===

  async getMe(): Promise<DaffyUser> {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  async getUserByUsername(username: string): Promise<DaffyUser> {
    assertNonEmpty(username, 'username');
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
    assertPositiveInteger(userId, 'userId');
    let response = await this.http.get(`/users/${userId}/causes`);
    return response.data;
  }

  // === Contributions ===

  async getContributions(page?: number): Promise<PaginatedResponse<DaffyContribution>> {
    let response = await this.http.get('/contributions', {
      params: paginationParams(page)
    });
    return response.data;
  }

  // === Donations ===

  async getDonations(page?: number): Promise<PaginatedResponse<DaffyDonation>> {
    let response = await this.http.get('/donations', {
      params: paginationParams(page)
    });
    return response.data;
  }

  async getUserDonations(
    userId: number,
    page?: number
  ): Promise<PaginatedResponse<DaffyDonation>> {
    assertPositiveInteger(userId, 'userId');
    let response = await this.http.get(`/users/${userId}/donations`, {
      params: paginationParams(page)
    });
    return response.data;
  }

  async getDonation(userId: number, donationId: number): Promise<DaffyDonation> {
    assertPositiveInteger(userId, 'userId');
    assertPositiveInteger(donationId, 'donationId');
    let response = await this.http.get(`/users/${userId}/donations/${donationId}`);
    return response.data;
  }

  async createDonation(params: {
    amount: number;
    ein: string;
    note?: string;
    privateMemo?: string;
  }): Promise<DaffyDonation> {
    if (!Number.isFinite(params.amount) || params.amount < 10) {
      throw createApiServiceError('Donation amount must be at least $10 USD.');
    }
    assertNonEmpty(params.ein, 'ein');
    let response = await this.http.post('/donations', {
      amount: params.amount,
      ein: params.ein,
      note: params.note,
      private_memo: params.privateMemo
    });
    return response.data;
  }

  async cancelDonation(donationId: number): Promise<void> {
    assertPositiveInteger(donationId, 'donationId');
    await this.http.delete(`/donations/${donationId}`);
  }

  // === Gifts ===

  async getGifts(page?: number): Promise<PaginatedResponse<DaffyGift>> {
    let response = await this.http.get('/gifts', {
      params: paginationParams(page)
    });
    return response.data;
  }

  async getGift(code: string): Promise<DaffyGift> {
    assertNonEmpty(code, 'giftCode');
    let response = await this.http.get(`/gifts/${encodeURIComponent(code)}`);
    return response.data;
  }

  async createGift(params: { name: string; amount: number }): Promise<DaffyGift> {
    assertNonEmpty(params.name, 'recipientName');
    if (!Number.isSafeInteger(params.amount) || params.amount < 18) {
      throw createApiServiceError('Gift amount must be at least $18 USD in whole dollars.');
    }
    let response = await this.http.post('/gifts', {
      name: params.name,
      amount: params.amount
    });
    return response.data;
  }

  // === Non-Profits ===

  async getNonProfit(ein: string): Promise<DaffyNonProfit> {
    assertNonEmpty(ein, 'ein');
    let response = await this.http.get(`/non_profits/${encodeURIComponent(ein)}`);
    return response.data;
  }

  async searchNonProfits(params: {
    query?: string;
    causeId?: number;
    page?: number;
  }): Promise<PaginatedResponse<DaffyNonProfit>> {
    let queryParams: Record<string, string | number> = {};
    if (params.query !== undefined) queryParams.query = params.query;
    if (params.causeId !== undefined) {
      assertPositiveInteger(params.causeId, 'causeId');
      queryParams.cause_id = params.causeId;
    }
    if (params.page !== undefined) {
      assertPositiveInteger(params.page, 'page');
      queryParams.page = params.page;
    }

    let response = await this.http.get('/non_profits', { params: queryParams });
    return response.data;
  }
}
