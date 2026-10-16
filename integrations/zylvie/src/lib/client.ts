import { createApiServiceError, createAxios, isApiErrorRecord } from 'slates';
import { z } from 'zod';
import {
  accountResponse,
  couponResponse,
  createdProductResponse,
  licenseResponse,
  listedCouponResponse,
  operationResponse,
  productResponse,
  redactCredentials,
  subscriptionResponse,
  verifiedLicenseResponse,
  zylvieError
} from './response';
import { requireText, validateCoupon, validateProduct } from './validation';

export class Client {
  private axios;
  private token;

  constructor(config: { token: string }) {
    requireText(config.token, 'API key');
    this.token = config.token;
    this.axios = createAxios({
      baseURL: 'https://api.zylvie.com',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' }
    });
  }

  private async request<T>(
    operation: string,
    send: () => Promise<{ data: unknown }>,
    schema: z.ZodType<T>
  ): Promise<T> {
    try {
      let { data } = await send();
      if (
        isApiErrorRecord(data) &&
        (data.error !== undefined || data.status === 'error' || data.success === false)
      ) {
        throw zylvieError({ response: { status: 200, data } }, this.token, operation);
      }
      let parsed = schema.safeParse(data);
      if (!parsed.success) {
        let paths = parsed.error.issues
          .slice(0, 5)
          .map(issue => issue.path.join('.') || 'response');
        throw createApiServiceError(
          `Zylvie returned an invalid response for ${operation}: ${paths.join(', ')}.`,
          { reason: 'zylvie_invalid_response' }
        );
      }
      return redactCredentials(parsed.data, this.token) as T;
    } catch (error) {
      throw zylvieError(error, this.token, operation);
    }
  }

  getMe() {
    return this.request('get account', () => this.axios.get('/me'), accountResponse);
  }
  createProduct(data: Record<string, unknown>) {
    validateProduct(data, true);
    return this.request(
      'create product',
      () => this.axios.post('/products/create', data),
      createdProductResponse
    );
  }
  updateProduct(data: Record<string, unknown>) {
    validateProduct(data, false);
    return this.request(
      'update product',
      () => this.axios.put('/products/update', data),
      productResponse
    );
  }
  deleteProduct(productId: string) {
    requireText(productId, 'productId', 25);
    return this.request(
      'delete product',
      () => this.axios.delete('/products/delete', { data: { id: productId } }),
      operationResponse
    );
  }
  createCoupon(data: Record<string, unknown>) {
    validateCoupon(data, true);
    return this.request(
      'create coupon',
      () => this.axios.post('/coupons/create', data),
      couponResponse
    );
  }
  updateCoupon(data: Record<string, unknown>) {
    validateCoupon(data, false);
    return this.request(
      'update coupon',
      () => this.axios.put('/coupons/update', data),
      couponResponse
    );
  }
  deleteCoupon(couponId: string) {
    requireText(couponId, 'couponId', 25);
    return this.request(
      'delete coupon',
      () => this.axios.delete('/coupons/delete', { data: { id: couponId } }),
      operationResponse
    );
  }
  listCoupons(archived?: boolean) {
    let params = archived === undefined ? {} : { archived };
    return this.request(
      'list coupons',
      () => this.axios.get('/coupons/list', { params }),
      z.looseObject({ count: z.number(), coupons: z.array(listedCouponResponse) })
    );
  }
  verifyLicenseKey(productId: string, licenseKey: string) {
    requireText(productId, 'productId');
    requireText(licenseKey, 'licenseKey');
    return this.request(
      'verify license key',
      () =>
        this.axios.get('/licensekeys/verify', {
          params: { product_id: productId, license_key: licenseKey }
        }),
      verifiedLicenseResponse
    );
  }
  redeemLicenseKey(licenseKey: string) {
    requireText(licenseKey, 'licenseKey');
    return this.request(
      'redeem license key',
      () => this.axios.post('/licensekeys/redeem', { license_key: licenseKey }),
      licenseResponse
    );
  }
  refundLicenseKey(licenseKey: string) {
    requireText(licenseKey, 'licenseKey');
    return this.request(
      'refund license key',
      () => this.axios.post('/licensekeys/refund', { license_key: licenseKey }),
      licenseResponse
    );
  }
  verifySubscription(email: string) {
    requireText(email, 'email');
    return this.request(
      'verify subscriptions',
      () => this.axios.get('/subscriptions/verify', { params: { email } }),
      z.array(subscriptionResponse)
    );
  }
  couponGrants(data: Record<string, unknown>, create: boolean) {
    if (data.id === undefined && data.code === undefined) {
      throw createApiServiceError('Provide couponId or code.', {
        reason: 'zylvie_invalid_input'
      });
    }
    if (data.id !== undefined) requireText(data.id, 'couponId', 25);
    if (data.code !== undefined) requireText(data.code, 'code', 100);
    requireText(data.email, 'email', 254);
    if (
      data.granted_at !== undefined &&
      (typeof data.granted_at !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T/.test(data.granted_at) ||
        !Number.isFinite(Date.parse(data.granted_at)))
    ) {
      throw createApiServiceError('grantedAt must be an ISO 8601 date-time.', {
        reason: 'zylvie_invalid_input'
      });
    }
    return this.request(
      create ? 'grant coupon eligibility' : 'get coupon eligibility',
      () =>
        create
          ? this.axios.post('/coupons/grants', data)
          : this.axios.get('/coupons/grants', { params: data }),
      z.looseObject({
        status: z.string(),
        count: z.number(),
        grants: z.array(z.record(z.string(), z.unknown()))
      })
    );
  }

  // These methods do not register public triggers.
  subscribeWebhook(trigger: string, webhookUrl: string) {
    requireText(trigger, 'trigger');
    requireText(webhookUrl, 'webhookUrl');
    return this.request(
      'subscribe webhook',
      () => this.axios.post('/webhooks/subscribe', { trigger, webhook_url: webhookUrl }),
      z.looseObject({
        name: z.string(),
        trigger: z.string(),
        webhook: z.string(),
        signing_secret: z.string(),
        is_live: z.boolean()
      })
    );
  }
  async unsubscribeWebhook(webhookUrl: string): Promise<void> {
    requireText(webhookUrl, 'webhookUrl');
    await this.request(
      'unsubscribe webhook',
      () => this.axios.post('/webhooks/unsubscribe', { webhook_url: webhookUrl }),
      z.unknown()
    );
  }
}
