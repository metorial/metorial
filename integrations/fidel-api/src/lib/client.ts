import { createAxios } from 'slates';

let BASE_URL = 'https://api.fidel.uk/v1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'fidel-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Programs ──────────────────────────────────────────────

  async createProgram(data: { name: string; metadata?: Record<string, any> }) {
    let res = await this.axios.post('/programs', data);
    return res.data?.items?.[0] ?? res.data;
  }

  async getProgram(programId: string) {
    let res = await this.axios.get(`/programs/${programId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listPrograms(params?: { start?: number; limit?: number }) {
    let res = await this.axios.get('/programs', { params });
    return res.data;
  }

  async updateProgram(
    programId: string,
    data: { name?: string; metadata?: Record<string, any> }
  ) {
    let res = await this.axios.patch(`/programs/${programId}`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  // ── Brands ────────────────────────────────────────────────

  async createBrand(data: { name: string; logoURL?: string; metadata?: Record<string, any> }) {
    let res = await this.axios.post('/brands', data);
    return res.data?.items?.[0] ?? res.data;
  }

  async getBrand(brandId: string) {
    let res = await this.axios.get(`/brands/${brandId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listBrands(params?: { start?: number; limit?: number }) {
    let res = await this.axios.get('/brands', { params });
    return res.data;
  }

  async updateBrand(
    brandId: string,
    data: { name?: string; logoURL?: string; metadata?: Record<string, any> }
  ) {
    let res = await this.axios.patch(`/brands/${brandId}`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  async deleteBrand(brandId: string) {
    let res = await this.axios.delete(`/brands/${brandId}`);
    return res.data;
  }

  // ── Locations ─────────────────────────────────────────────

  async createLocation(
    brandId: string,
    programId: string,
    data: {
      address: string;
      city: string;
      countryCode: string;
      postcode: string;
      metadata?: Record<string, any>;
      geolocation?: { latitude: number; longitude: number };
    }
  ) {
    let res = await this.axios.post(`/programs/${programId}/locations`, {
      ...data,
      brandId
    });
    return res.data?.items?.[0] ?? res.data;
  }

  async getLocation(locationId: string, programId: string) {
    let res = await this.axios.get(`/programs/${programId}/locations/${locationId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listLocations(programId: string, params?: { start?: number; limit?: number }) {
    let res = await this.axios.get(`/programs/${programId}/locations`, { params });
    return res.data;
  }

  async updateLocation(
    locationId: string,
    programId: string,
    data: {
      address?: string;
      city?: string;
      countryCode?: string;
      postcode?: string;
      metadata?: Record<string, any>;
      geolocation?: { latitude: number; longitude: number };
    }
  ) {
    let res = await this.axios.patch(`/programs/${programId}/locations/${locationId}`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  async deleteLocation(locationId: string, programId: string) {
    let res = await this.axios.delete(`/programs/${programId}/locations/${locationId}`);
    return res.data;
  }

  // ── Cards ─────────────────────────────────────────────────

  async enrollCard(
    programId: string,
    data: {
      number: string;
      expMonth: number;
      expYear: number;
      countryCode: string;
      termsOfUse?: boolean;
      metadata?: Record<string, any>;
    }
  ) {
    let res = await this.axios.post(`/programs/${programId}/cards`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  async getCard(cardId: string, programId: string) {
    let res = await this.axios.get(`/programs/${programId}/cards/${cardId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listCards(programId: string, params?: { start?: number; limit?: number }) {
    let res = await this.axios.get(`/programs/${programId}/cards`, { params });
    return res.data;
  }

  async deleteCard(cardId: string, programId: string) {
    let res = await this.axios.delete(`/programs/${programId}/cards/${cardId}`);
    return res.data;
  }

  // ── Transactions ──────────────────────────────────────────

  async getTransaction(transactionId: string, programId: string) {
    let res = await this.axios.get(`/programs/${programId}/transactions/${transactionId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listTransactionsByProgram(
    programId: string,
    params?: {
      start?: number;
      limit?: number;
      from?: string;
      to?: string;
    }
  ) {
    let res = await this.axios.get(`/programs/${programId}/transactions`, { params });
    return res.data;
  }

  async listTransactionsByCard(
    cardId: string,
    programId: string,
    params?: {
      start?: number;
      limit?: number;
      from?: string;
      to?: string;
    }
  ) {
    let res = await this.axios.get(`/programs/${programId}/cards/${cardId}/transactions`, {
      params
    });
    return res.data;
  }

  async createTestTransaction(
    programId: string,
    data: {
      amount: number;
      cardId: string;
      locationId: string;
      currency: string;
    }
  ) {
    let res = await this.axios.post(`/transactions/test`, {
      ...data,
      programId
    });
    return res.data?.items?.[0] ?? res.data;
  }

  // ── Webhooks ──────────────────────────────────────────────

  async createWebhook(
    programId: string,
    data: {
      event: string;
      url: string;
    }
  ) {
    let res = await this.axios.post(`/programs/${programId}/hooks`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  async getWebhook(webhookId: string, programId: string) {
    let res = await this.axios.get(`/programs/${programId}/hooks/${webhookId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listWebhooks(programId: string, params?: { start?: number; limit?: number }) {
    let res = await this.axios.get(`/programs/${programId}/hooks`, { params });
    return res.data;
  }

  async deleteWebhook(webhookId: string, programId: string) {
    let res = await this.axios.delete(`/programs/${programId}/hooks/${webhookId}`);
    return res.data;
  }

  async updateWebhook(
    webhookId: string,
    programId: string,
    data: {
      event?: string;
      url?: string;
    }
  ) {
    let res = await this.axios.patch(`/programs/${programId}/hooks/${webhookId}`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  // ── Offers ────────────────────────────────────────────────

  async createOffer(
    programId: string,
    data: {
      brandId: string;
      countryCode: string;
      name: string;
      type: { name: 'amount' | 'discount'; value: number };
      startDate?: string;
      endDate?: string;
      maxReward?: number;
      metadata?: Record<string, any>;
    }
  ) {
    let res = await this.axios.post(`/offers`, {
      ...data,
      programId
    });
    return res.data?.items?.[0] ?? res.data;
  }

  async getOffer(offerId: string) {
    let res = await this.axios.get(`/offers/${offerId}`);
    return res.data?.items?.[0] ?? res.data;
  }

  async listOffers(programId: string, params?: { start?: number; limit?: number }) {
    let res = await this.axios.get(`/programs/${programId}/offers`, { params });
    return res.data;
  }

  async updateOffer(
    offerId: string,
    data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      maxReward?: number;
      metadata?: Record<string, any>;
    }
  ) {
    let res = await this.axios.patch(`/offers/${offerId}`, data);
    return res.data?.items?.[0] ?? res.data;
  }

  async linkOfferToLocation(offerId: string, locationId: string) {
    let res = await this.axios.post(`/offers/${offerId}/locations/${locationId}`, {});
    return res.data?.items?.[0] ?? res.data;
  }

  async unlinkOfferFromLocation(offerId: string, locationId: string) {
    let res = await this.axios.delete(`/offers/${offerId}/locations/${locationId}`);
    return res.data;
  }

  async activateOfferOnCard(offerId: string, cardId: string) {
    let res = await this.axios.post(`/offers/${offerId}/cards/${cardId}`, {});
    return res.data?.items?.[0] ?? res.data;
  }

  async deactivateOfferOnCard(offerId: string, cardId: string) {
    let res = await this.axios.delete(`/offers/${offerId}/cards/${cardId}`);
    return res.data;
  }
}
