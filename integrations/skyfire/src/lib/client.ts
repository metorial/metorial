import { buildApiServiceError, createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.skyfire.xyz'
});

api.interceptors.response.use(
  response => response,
  error => {
    throw buildApiServiceError(error, {
      providerLabel: 'Skyfire',
      reason: 'skyfire_api_error',
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
      extractUpstreamCode: (_input, response, helpers) =>
        helpers.isRecord(response?.data) && typeof response.data.code === 'string'
          ? response.data.code
          : undefined,
      extractMessage: (input, helpers) => {
        let response = helpers.getResponseWithBody(input);
        let details: string[] = [];
        let collect = (value: unknown) => {
          if (!helpers.isRecord(value)) {
            helpers.collectDetails(value, details);
            return;
          }
          helpers.collectDetails(value, details, { detailKeys: ['message', 'code'] });
          if (helpers.isRecord(value.details)) {
            for (let detail of Object.values(value.details)) collect(detail);
          }
        };
        collect(response?.data);
        return details.length ? details.join('; ') : undefined;
      }
    });
  }
);

export class SkyfireClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      'skyfire-api-key': this.token,
      'Content-Type': 'application/json'
    };
  }

  // ─── Token APIs ───────────────────────────────────────────

  async createToken(params: {
    type: 'kya' | 'pay' | 'kya+pay' | 'kya-pay';
    tokenAmount?: string;
    sellerServiceId?: string;
    sellerDomainOrUrl?: string;
    buyerTag?: string;
    expiresAt?: number;
    identityPermissions?: string[];
  }): Promise<{ token: string }> {
    let response = await api.post(
      '/api/v1/tokens',
      { ...params, type: params.type === 'kya+pay' ? 'kya-pay' : params.type },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async chargeToken(params: {
    token: string;
    chargeAmount?: string;
  }): Promise<{ amountCharged: string; remainingBalance: string }> {
    let response = await api.post('/api/v1/tokens/charge', params, {
      headers: this.headers()
    });
    return response.data;
  }

  async introspectToken(token: string): Promise<{
    isValid: boolean;
    remainingBalance?: string;
    validationError?: string;
    expiresAt?: number;
    chargeableUntil?: number;
  }> {
    let response = await api.post(
      '/api/v1/tokens/introspect',
      { token },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async getTokenCharges(
    tokenId: string,
    pagination: { size?: number; pageCursor?: string } = {}
  ): Promise<{ data: TokenCharge[]; nextPageCursor?: string }> {
    let response = await api.get(`/api/v1/tokens/${encodeURIComponent(tokenId)}/charges`, {
      params: pagination,
      headers: this.headers()
    });
    return response.data;
  }

  // ─── Agent / Wallet APIs ──────────────────────────────────

  async getBalance(): Promise<{
    available: string;
    heldAmount: string;
    pendingCharges: string;
    pendingDeposits: string;
  }> {
    let response = await api.get('/api/v1/agents/balance', {
      headers: this.headers()
    });
    return response.data;
  }

  async getSourceIps(): Promise<string[]> {
    let response = await api.get('/api/v1/agents/source-ips', {
      headers: this.headers()
    });
    return response.data;
  }

  async setSourceIps(ips: string[]): Promise<void> {
    await api.put('/api/v1/agents/source-ips', ips, {
      headers: this.headers()
    });
  }

  async getTokenVersion(): Promise<string> {
    let response = await api.get('/api/v1/agents/token-version', {
      headers: this.headers()
    });
    return response.data;
  }

  async setTokenVersion(tokenVersion: string): Promise<void> {
    await api.put(
      '/api/v1/agents/token-version',
      { tokenVersion },
      {
        headers: this.headers()
      }
    );
  }

  // ─── Seller Service APIs ──────────────────────────────────

  async getSellerServices(): Promise<{ data: SellerService[] }> {
    let response = await api.get('/api/v1/agents/seller-services', {
      headers: this.headers()
    });
    return response.data;
  }

  async getSellerService(sellerServiceId: string): Promise<SellerService> {
    let response = await api.get(
      `/api/v1/agents/seller-services/${encodeURIComponent(sellerServiceId)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async createSellerService(params: CreateSellerServiceParams): Promise<SellerService> {
    let response = await api.post(
      '/api/v1/agents/seller-services',
      {
        ...params,
        acceptedTokens: params.acceptedTokens?.map(type =>
          type === 'kya+pay' ? 'kya-pay' : type
        )
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async updateSellerService(
    sellerServiceId: string,
    params: UpdateSellerServiceParams
  ): Promise<void> {
    await api.patch(
      `/api/v1/agents/seller-services/${encodeURIComponent(sellerServiceId)}`,
      {
        ...params,
        acceptedTokens: params.acceptedTokens?.map(type =>
          type === 'kya+pay' ? 'kya-pay' : type
        )
      },
      {
        headers: this.headers()
      }
    );
  }

  async activateSellerService(sellerServiceId: string): Promise<void> {
    await api.post(
      `/api/v1/agents/seller-services/${encodeURIComponent(sellerServiceId)}/activate`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  async deactivateSellerService(sellerServiceId: string): Promise<void> {
    await api.post(
      `/api/v1/agents/seller-services/${encodeURIComponent(sellerServiceId)}/deactivate`,
      {},
      {
        headers: this.headers()
      }
    );
  }

  // ─── Directory APIs ───────────────────────────────────────

  async getDirectoryTags(): Promise<{ data: string[] }> {
    let response = await api.get('/api/v1/directory/tags', {
      headers: this.headers()
    });
    return response.data;
  }

  async getDirectoryServices(): Promise<{ data: DirectoryService[] }> {
    let response = await api.get('/api/v1/directory/services', {
      headers: this.headers()
    });
    return response.data;
  }

  async getDirectoryService(serviceId: string): Promise<DirectoryService> {
    let response = await api.get(
      `/api/v1/directory/services/${encodeURIComponent(serviceId)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async searchServicesByTags(tags: string[]): Promise<{ data: DirectoryService[] }> {
    let response = await api.get('/api/v1/directory/services/search', {
      params: { commaDelimitedTags: tags.join(',') },
      headers: this.headers()
    });
    return response.data;
  }

  async getServicesByAgent(agentId: string): Promise<{ data: DirectoryService[] }> {
    let response = await api.get(
      `/api/v1/directory/agents/${encodeURIComponent(agentId)}/services`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }
}

// ─── Types ────────────────────────────────────────────────

export interface SellerService {
  id: string;
  name: string;
  description: string;
  tags: string[];
  type: string;
  price: string;
  priceModel: string;
  minimumTokenAmount: string;
  humanIdentityRequirement?: {
    identityLevels?: string[];
    organization?: string[];
    individual?: string[];
  };
  termsOfService?: {
    url: string;
    required: boolean;
  };
  seller: {
    id: string;
    name: string;
    identityLevel?: string;
  };
  openApiSpecUrl?: string;
  websiteUrl?: string;
  mcpServerUrl?: string;
  maxTokenTTLSeconds?: number;
  acceptedTokens?: string[];
  fetchAgentProfileUrl?: string;
  active: boolean;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenCharge {
  tokenId?: string;
  chargeId?: string;
  claimId: string;
  value: string;
  chargedAt: string;
  settledAt?: string | null;
  network?: string;
  audience?: string;
  subject?: string;
  sellerServiceId?: string;
  tokenType?: string;
}

export interface DirectoryService {
  id: string;
  name: string;
  description: string;
  tags: string[];
  type: string;
  price: string;
  priceModel: string;
  minimumTokenAmount: string;
  humanIdentityRequirement?: {
    identityLevels?: string[];
    organization?: string[];
    individual?: string[];
  };
  seller: {
    id: string;
    name: string;
    identityLevel?: string;
  };
  fetchAgentProfileUrl?: string;
  openApiSpecUrl?: string;
  websiteUrl?: string;
  mcpServerUrl?: string;
  maxTokenTTLSeconds?: number;
  acceptedTokens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSellerServiceParams {
  name: string;
  description: string;
  tags?: string[];
  type: string;
  price?: string;
  priceModel?: string;
  minimumTokenAmount?: string;
  termsOfService?: {
    url: string;
    required: boolean;
  };
  acceptedTokens: string[];
  openApiSpecUrl?: string;
  websiteUrl?: string;
  mcpServerUrl?: string;
  fetchAgentProfileUrl?: string;
  humanIdentityRequirement?: { individual: string[]; organization: string[] };
  maxTokenTTLSeconds?: number;
}

export interface UpdateSellerServiceParams {
  name?: string;
  description?: string;
  tags?: string[];
  minimumTokenAmount?: string;
  price?: string;
  termsOfService?: {
    url: string;
    required: boolean;
  };
  acceptedTokens?: string[];
}
