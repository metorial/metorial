import { createAxios } from '@slates/provider';
import { stripeApiError } from './errors';

export interface StripeClientConfig {
  token: string;
  stripeAccountId?: string;
}

export class StripeClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: StripeClientConfig) {
    let headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (config.stripeAccountId) {
      headers['Stripe-Account'] = config.stripeAccountId;
    }

    this.axios = createAxios({
      baseURL: 'https://api.stripe.com/v1',
      headers
    });

    this.axios.interceptors.response.use(
      response => response,
      error => {
        throw stripeApiError(error);
      }
    );
  }

  // --- Helpers ---

  private encodeParams(params: Record<string, any>, prefix?: string): string {
    let parts: string[] = [];
    for (let [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      let fullKey = prefix ? `${prefix}[${key}]` : key;
      if (typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.encodeParams(value, fullKey));
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object') {
            parts.push(this.encodeParams(value[i], `${fullKey}[${i}]`));
          } else {
            parts.push(
              `${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(value[i])}`
            );
          }
        }
      } else {
        parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
      }
    }
    return parts.filter(p => p.length > 0).join('&');
  }

  private async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    let queryString = params ? this.encodeParams(params) : '';
    let url = queryString ? `${path}?${queryString}` : path;
    let response = await this.axios.get(url);
    return response.data;
  }

  private async post<T = any>(path: string, data?: Record<string, any>): Promise<T> {
    let body = data ? this.encodeParams(data) : '';
    let response = await this.axios.post(path, body);
    return response.data;
  }

  private async del<T = any>(path: string): Promise<T> {
    let response = await this.axios.delete(path);
    return response.data;
  }

  // --- Customers ---

  async createCustomer(params: Record<string, any>) {
    return this.post('/customers', params);
  }

  async getCustomer(customerId: string) {
    return this.get(`/customers/${customerId}`);
  }

  async updateCustomer(customerId: string, params: Record<string, any>) {
    return this.post(`/customers/${customerId}`, params);
  }

  async deleteCustomer(customerId: string) {
    return this.del(`/customers/${customerId}`);
  }

  async listCustomers(params?: Record<string, any>) {
    return this.get('/customers', params);
  }

  // --- Payment Intents ---

  async createPaymentIntent(params: Record<string, any>) {
    return this.post('/payment_intents', params);
  }

  async getPaymentIntent(paymentIntentId: string) {
    return this.get(`/payment_intents/${paymentIntentId}`);
  }

  async updatePaymentIntent(paymentIntentId: string, params: Record<string, any>) {
    return this.post(`/payment_intents/${paymentIntentId}`, params);
  }

  async confirmPaymentIntent(paymentIntentId: string, params?: Record<string, any>) {
    return this.post(`/payment_intents/${paymentIntentId}/confirm`, params);
  }

  async capturePaymentIntent(paymentIntentId: string, params?: Record<string, any>) {
    return this.post(`/payment_intents/${paymentIntentId}/capture`, params);
  }

  async cancelPaymentIntent(paymentIntentId: string, params?: Record<string, any>) {
    return this.post(`/payment_intents/${paymentIntentId}/cancel`, params);
  }

  async listPaymentIntents(params?: Record<string, any>) {
    return this.get('/payment_intents', params);
  }

  // --- Subscriptions ---

  async createSubscription(params: Record<string, any>) {
    return this.post('/subscriptions', params);
  }

  async getSubscription(subscriptionId: string) {
    return this.get(`/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(subscriptionId: string, params: Record<string, any>) {
    return this.post(`/subscriptions/${subscriptionId}`, params);
  }

  async cancelSubscription(subscriptionId: string, _params?: Record<string, any>) {
    return this.del(`/subscriptions/${subscriptionId}`);
  }

  async listSubscriptions(params?: Record<string, any>) {
    return this.get('/subscriptions', params);
  }

  async pauseSubscription(subscriptionId: string) {
    return this.post(`/subscriptions/${subscriptionId}`, {
      pause_collection: { behavior: 'mark_uncollectible' }
    });
  }

  async resumeSubscription(subscriptionId: string) {
    return this.post(`/subscriptions/${subscriptionId}`, { pause_collection: '' });
  }

  // --- Invoices ---

  async createInvoice(params: Record<string, any>) {
    return this.post('/invoices', params);
  }

  async getInvoice(invoiceId: string) {
    return this.get(`/invoices/${invoiceId}`);
  }

  async updateInvoice(invoiceId: string, params: Record<string, any>) {
    return this.post(`/invoices/${invoiceId}`, params);
  }

  async finalizeInvoice(invoiceId: string) {
    return this.post(`/invoices/${invoiceId}/finalize`);
  }

  async payInvoice(invoiceId: string, params?: Record<string, any>) {
    return this.post(`/invoices/${invoiceId}/pay`, params);
  }

  async voidInvoice(invoiceId: string) {
    return this.post(`/invoices/${invoiceId}/void`);
  }

  async sendInvoice(invoiceId: string) {
    return this.post(`/invoices/${invoiceId}/send`);
  }

  async listInvoices(params?: Record<string, any>) {
    return this.get('/invoices', params);
  }

  // --- Invoice Items ---

  async createInvoiceItem(params: Record<string, any>) {
    return this.post('/invoiceitems', params);
  }

  // --- Products ---

  async createProduct(params: Record<string, any>) {
    return this.post('/products', params);
  }

  async getProduct(productId: string) {
    return this.get(`/products/${productId}`);
  }

  async updateProduct(productId: string, params: Record<string, any>) {
    return this.post(`/products/${productId}`, params);
  }

  async deleteProduct(productId: string) {
    return this.del(`/products/${productId}`);
  }

  async listProducts(params?: Record<string, any>) {
    return this.get('/products', params);
  }

  // --- Prices ---

  async createPrice(params: Record<string, any>) {
    return this.post('/prices', params);
  }

  async getPrice(priceId: string) {
    return this.get(`/prices/${priceId}`);
  }

  async updatePrice(priceId: string, params: Record<string, any>) {
    return this.post(`/prices/${priceId}`, params);
  }

  async listPrices(params?: Record<string, any>) {
    return this.get('/prices', params);
  }

  // --- Charges ---

  async getCharge(chargeId: string) {
    return this.get(`/charges/${chargeId}`);
  }

  async listCharges(params?: Record<string, any>) {
    return this.get('/charges', params);
  }

  // --- Refunds ---

  async createRefund(params: Record<string, any>) {
    return this.post('/refunds', params);
  }

  async getRefund(refundId: string) {
    return this.get(`/refunds/${refundId}`);
  }

  async listRefunds(params?: Record<string, any>) {
    return this.get('/refunds', params);
  }

  // --- Checkout Sessions ---

  async createCheckoutSession(params: Record<string, any>) {
    return this.post('/checkout/sessions', params);
  }

  async getCheckoutSession(sessionId: string) {
    return this.get(`/checkout/sessions/${sessionId}`);
  }

  async listCheckoutSessions(params?: Record<string, any>) {
    return this.get('/checkout/sessions', params);
  }

  // --- Payment Links ---

  async createPaymentLink(params: Record<string, any>) {
    return this.post('/payment_links', params);
  }

  async getPaymentLink(paymentLinkId: string) {
    return this.get(`/payment_links/${paymentLinkId}`);
  }

  async listPaymentLinks(params?: Record<string, any>) {
    return this.get('/payment_links', params);
  }

  // --- Payouts ---

  async createPayout(params: Record<string, any>) {
    return this.post('/payouts', params);
  }

  async getPayout(payoutId: string) {
    return this.get(`/payouts/${payoutId}`);
  }

  async listPayouts(params?: Record<string, any>) {
    return this.get('/payouts', params);
  }

  // --- Balance ---

  async getBalance() {
    return this.get('/balance');
  }

  async listBalanceTransactions(params?: Record<string, any>) {
    return this.get('/balance_transactions', params);
  }

  async getBalanceTransaction(transactionId: string) {
    return this.get(`/balance_transactions/${transactionId}`);
  }

  // --- Disputes ---

  async getDispute(disputeId: string) {
    return this.get(`/disputes/${disputeId}`);
  }

  async updateDispute(disputeId: string, params: Record<string, any>) {
    return this.post(`/disputes/${disputeId}`, params);
  }

  async closeDispute(disputeId: string) {
    return this.post(`/disputes/${disputeId}/close`);
  }

  async listDisputes(params?: Record<string, any>) {
    return this.get('/disputes', params);
  }

  // --- Coupons ---

  async createCoupon(params: Record<string, any>) {
    return this.post('/coupons', params);
  }

  async getCoupon(couponId: string) {
    return this.get(`/coupons/${couponId}`);
  }

  async updateCoupon(couponId: string, params: Record<string, any>) {
    return this.post(`/coupons/${couponId}`, params);
  }

  async deleteCoupon(couponId: string) {
    return this.del(`/coupons/${couponId}`);
  }

  async listCoupons(params?: Record<string, any>) {
    return this.get('/coupons', params);
  }

  // --- Promotion Codes ---

  async createPromotionCode(params: Record<string, any>) {
    return this.post('/promotion_codes', params);
  }

  async listPromotionCodes(params?: Record<string, any>) {
    return this.get('/promotion_codes', params);
  }

  // --- Webhook Endpoints ---

  async createWebhookEndpoint(params: Record<string, any>) {
    return this.post('/webhook_endpoints', params);
  }

  async deleteWebhookEndpoint(webhookEndpointId: string) {
    return this.del(`/webhook_endpoints/${webhookEndpointId}`);
  }

  async listWebhookEndpoints(params?: Record<string, any>) {
    return this.get('/webhook_endpoints', params);
  }

  // --- Events ---

  async getEvent(eventId: string) {
    return this.get(`/events/${eventId}`);
  }

  async listEvents(params?: Record<string, any>) {
    return this.get('/events', params);
  }

  // --- Setup Intents ---

  async createSetupIntent(params: Record<string, any>) {
    return this.post('/setup_intents', params);
  }

  async getSetupIntent(setupIntentId: string) {
    return this.get(`/setup_intents/${setupIntentId}`);
  }

  async confirmSetupIntent(setupIntentId: string, params?: Record<string, any>) {
    return this.post(`/setup_intents/${setupIntentId}/confirm`, params);
  }

  async cancelSetupIntent(setupIntentId: string, params?: Record<string, any>) {
    return this.post(`/setup_intents/${setupIntentId}/cancel`, params);
  }

  async listSetupIntents(params?: Record<string, any>) {
    return this.get('/setup_intents', params);
  }

  // --- Billing Portal ---

  async createBillingPortalSession(params: Record<string, any>) {
    return this.post('/billing_portal/sessions', params);
  }

  // --- Payment Methods ---

  async getPaymentMethod(paymentMethodId: string) {
    return this.get(`/payment_methods/${paymentMethodId}`);
  }

  async listPaymentMethods(params: Record<string, any>) {
    return this.get('/payment_methods', params);
  }

  async getCustomerPaymentMethod(customerId: string, paymentMethodId: string) {
    return this.get(`/customers/${customerId}/payment_methods/${paymentMethodId}`);
  }

  async listCustomerPaymentMethods(customerId: string, params?: Record<string, any>) {
    return this.get(`/customers/${customerId}/payment_methods`, params);
  }

  async attachPaymentMethod(paymentMethodId: string, params: Record<string, any>) {
    return this.post(`/payment_methods/${paymentMethodId}/attach`, params);
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return this.post(`/payment_methods/${paymentMethodId}/detach`);
  }

  // --- Tax Rates ---

  async createTaxRate(params: Record<string, any>) {
    return this.post('/tax_rates', params);
  }

  async getTaxRate(taxRateId: string) {
    return this.get(`/tax_rates/${taxRateId}`);
  }

  async updateTaxRate(taxRateId: string, params: Record<string, any>) {
    return this.post(`/tax_rates/${taxRateId}`, params);
  }

  async listTaxRates(params?: Record<string, any>) {
    return this.get('/tax_rates', params);
  }
}
