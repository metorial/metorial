import { createAxios } from 'slates';

export interface CommerceClientConfig {
  token: string;
}

export class CommerceClient {
  private api: ReturnType<typeof createAxios>;

  constructor(config: CommerceClientConfig) {
    this.api = createAxios({
      baseURL: 'https://api.commerce.coinbase.com',
      headers: {
        'X-CC-Api-Key': config.token,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Charges ---

  async createCharge(params: {
    name: string;
    description: string;
    pricingType: 'fixed_price' | 'no_price';
    localPrice?: { amount: string; currency: string };
    metadata?: Record<string, string>;
    redirectUrl?: string;
    cancelUrl?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name,
      description: params.description,
      pricing_type: params.pricingType
    };
    if (params.localPrice) body.local_price = params.localPrice;
    if (params.metadata) body.metadata = params.metadata;
    if (params.redirectUrl) body.redirect_url = params.redirectUrl;
    if (params.cancelUrl) body.cancel_url = params.cancelUrl;
    let response = await this.api.post('/charges', body);
    return response.data.data;
  }

  async listCharges(params?: { limit?: number; startingAfter?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/charges?${qs}` : '/charges';
    let response = await this.api.get(url);
    return response.data;
  }

  async getCharge(chargeCodeOrId: string): Promise<any> {
    let response = await this.api.get(`/charges/${chargeCodeOrId}`);
    return response.data.data;
  }

  async cancelCharge(chargeCodeOrId: string): Promise<any> {
    let response = await this.api.post(`/charges/${chargeCodeOrId}/cancel`);
    return response.data.data;
  }

  async resolveCharge(chargeCodeOrId: string): Promise<any> {
    let response = await this.api.post(`/charges/${chargeCodeOrId}/resolve`);
    return response.data.data;
  }

  // --- Checkouts ---

  async createCheckout(params: {
    name: string;
    description: string;
    pricingType: 'fixed_price' | 'no_price';
    localPrice?: { amount: string; currency: string };
    requestedInfo?: string[];
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name,
      description: params.description,
      pricing_type: params.pricingType
    };
    if (params.localPrice) body.local_price = params.localPrice;
    if (params.requestedInfo) body.requested_info = params.requestedInfo;
    let response = await this.api.post('/checkouts', body);
    return response.data.data;
  }

  async listCheckouts(params?: { limit?: number; startingAfter?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/checkouts?${qs}` : '/checkouts';
    let response = await this.api.get(url);
    return response.data;
  }

  async getCheckout(checkoutId: string): Promise<any> {
    let response = await this.api.get(`/checkouts/${checkoutId}`);
    return response.data.data;
  }

  // --- Events ---

  async listEvents(params?: { limit?: number; startingAfter?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.limit) query.limit = String(params.limit);
    if (params?.startingAfter) query.starting_after = params.startingAfter;
    let qs = new URLSearchParams(query).toString();
    let url = qs ? `/events?${qs}` : '/events';
    let response = await this.api.get(url);
    return response.data;
  }
}
