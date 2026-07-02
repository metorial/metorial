import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.zylvie.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Account ----

  async getMe(): Promise<{ email: string; brand: string }> {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ---- Products ----

  async createProduct(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/products/create', data);
    return response.data;
  }

  async updateProduct(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/products/update', data);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<{ status: string; message: string }> {
    let response = await this.axios.delete('/products/delete', {
      data: { id: productId }
    });
    return response.data;
  }

  // ---- Coupons ----

  async createCoupon(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/coupons/create', data);
    return response.data;
  }

  async updateCoupon(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await this.axios.put('/coupons/update', data);
    return response.data;
  }

  async deleteCoupon(couponId: string): Promise<{ status: string; message: string }> {
    let response = await this.axios.delete('/coupons/delete', {
      data: { id: couponId }
    });
    return response.data;
  }

  async listCoupons(
    archived?: boolean
  ): Promise<{ count: number; coupons: Record<string, unknown>[] }> {
    let params: Record<string, unknown> = {};
    if (archived !== undefined) {
      params.archived = archived;
    }
    let response = await this.axios.get('/coupons/list', { params });
    return response.data;
  }

  // ---- License Keys ----

  async verifyLicenseKey(
    productId: string,
    licenseKey: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/licensekeys/verify', {
      params: { product_id: productId, license_key: licenseKey }
    });
    return response.data;
  }

  async redeemLicenseKey(licenseKey: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/licensekeys/redeem', {
      license_key: licenseKey
    });
    return response.data;
  }

  async refundLicenseKey(licenseKey: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/licensekeys/refund', {
      license_key: licenseKey
    });
    return response.data;
  }

  // ---- Subscriptions ----

  async verifySubscription(email: string): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/subscriptions/verify', {
      params: { email }
    });
    return response.data;
  }

  // ---- Webhooks ----

  async subscribeWebhook(
    trigger: string,
    webhookUrl: string
  ): Promise<{
    name: string;
    trigger: string;
    webhook: string;
    signing_secret: string;
    is_live: boolean;
  }> {
    let response = await this.axios.post('/webhooks/subscribe', {
      trigger,
      webhook_url: webhookUrl
    });
    return response.data;
  }

  async unsubscribeWebhook(webhookUrl: string): Promise<void> {
    await this.axios.post('/webhooks/unsubscribe', {
      webhook_url: webhookUrl
    });
  }
}
