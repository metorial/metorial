import { createAxios } from 'slates';

let BASE_URL = 'https://api.whop.com/api/v1';

export class WhopClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // ── Products ──────────────────────────────────────────────

  async listProducts(params: {
    companyId: string;
    after?: string;
    first?: number;
    visibilities?: string[];
    order?: string;
    direction?: string;
  }) {
    let response = await this.axios.get('/products', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'visibilities[]': params.visibilities,
        order: params.order,
        direction: params.direction
      }
    });
    return response.data;
  }

  async getProduct(productId: string) {
    let response = await this.axios.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(data: {
    companyId: string;
    title: string;
    description?: string;
    headline?: string;
    visibility?: string;
    route?: string;
    redirectPurchaseUrl?: string;
    collectShippingAddress?: boolean;
    sendWelcomeMessage?: boolean;
  }) {
    let response = await this.axios.post('/products', {
      company_id: data.companyId,
      title: data.title,
      description: data.description,
      headline: data.headline,
      visibility: data.visibility,
      route: data.route,
      redirect_purchase_url: data.redirectPurchaseUrl,
      collect_shipping_address: data.collectShippingAddress,
      send_welcome_message: data.sendWelcomeMessage
    });
    return response.data;
  }

  async updateProduct(
    productId: string,
    data: {
      title?: string;
      description?: string;
      headline?: string;
      visibility?: string;
      route?: string;
      redirectPurchaseUrl?: string;
      collectShippingAddress?: boolean;
      sendWelcomeMessage?: boolean;
    }
  ) {
    let response = await this.axios.patch(`/products/${productId}`, {
      title: data.title,
      description: data.description,
      headline: data.headline,
      visibility: data.visibility,
      route: data.route,
      redirect_purchase_url: data.redirectPurchaseUrl,
      collect_shipping_address: data.collectShippingAddress,
      send_welcome_message: data.sendWelcomeMessage
    });
    return response.data;
  }

  async deleteProduct(productId: string) {
    let response = await this.axios.delete(`/products/${productId}`);
    return response.data;
  }

  // ── Plans ─────────────────────────────────────────────────

  async listPlans(params: {
    companyId: string;
    after?: string;
    first?: number;
    productIds?: string[];
    visibilities?: string[];
    planTypes?: string[];
    releaseMethods?: string[];
    direction?: string;
    order?: string;
  }) {
    let response = await this.axios.get('/plans', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'product_ids[]': params.productIds,
        'visibilities[]': params.visibilities,
        'plan_types[]': params.planTypes,
        'release_methods[]': params.releaseMethods,
        direction: params.direction,
        order: params.order
      }
    });
    return response.data;
  }

  async getPlan(planId: string) {
    let response = await this.axios.get(`/plans/${planId}`);
    return response.data;
  }

  async createPlan(data: {
    companyId: string;
    productId: string;
    title?: string;
    description?: string;
    planType?: string;
    billingPeriod?: number;
    initialPrice?: number;
    renewalPrice?: number;
    trialPeriodDays?: number;
    expirationDays?: number;
    currency?: string;
    visibility?: string;
    releaseMethod?: string;
    stock?: number;
    unlimitedStock?: boolean;
    internalNotes?: string;
  }) {
    let response = await this.axios.post('/plans', {
      company_id: data.companyId,
      product_id: data.productId,
      title: data.title,
      description: data.description,
      plan_type: data.planType,
      billing_period: data.billingPeriod,
      initial_price: data.initialPrice,
      renewal_price: data.renewalPrice,
      trial_period_days: data.trialPeriodDays,
      expiration_days: data.expirationDays,
      currency: data.currency,
      visibility: data.visibility,
      release_method: data.releaseMethod,
      stock: data.stock,
      unlimited_stock: data.unlimitedStock,
      internal_notes: data.internalNotes
    });
    return response.data;
  }

  async updatePlan(
    planId: string,
    data: {
      title?: string;
      description?: string;
      billingPeriod?: number;
      initialPrice?: number;
      renewalPrice?: number;
      trialPeriodDays?: number;
      expirationDays?: number;
      currency?: string;
      visibility?: string;
      stock?: number;
      unlimitedStock?: boolean;
      internalNotes?: string;
    }
  ) {
    let response = await this.axios.patch(`/plans/${planId}`, {
      title: data.title,
      description: data.description,
      billing_period: data.billingPeriod,
      initial_price: data.initialPrice,
      renewal_price: data.renewalPrice,
      trial_period_days: data.trialPeriodDays,
      expiration_days: data.expirationDays,
      currency: data.currency,
      visibility: data.visibility,
      stock: data.stock,
      unlimited_stock: data.unlimitedStock,
      internal_notes: data.internalNotes
    });
    return response.data;
  }

  async deletePlan(planId: string) {
    let response = await this.axios.delete(`/plans/${planId}`);
    return response.data;
  }

  // ── Memberships ───────────────────────────────────────────

  async listMemberships(params: {
    companyId?: string;
    after?: string;
    first?: number;
    productIds?: string[];
    statuses?: string[];
    planIds?: string[];
    userIds?: string[];
    order?: string;
    direction?: string;
  }) {
    let response = await this.axios.get('/memberships', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'product_ids[]': params.productIds,
        'statuses[]': params.statuses,
        'plan_ids[]': params.planIds,
        'user_ids[]': params.userIds,
        order: params.order,
        direction: params.direction
      }
    });
    return response.data;
  }

  async getMembership(membershipId: string) {
    let response = await this.axios.get(`/memberships/${membershipId}`);
    return response.data;
  }

  async updateMembership(membershipId: string, metadata: Record<string, string>) {
    let response = await this.axios.patch(`/memberships/${membershipId}`, {
      metadata
    });
    return response.data;
  }

  async cancelMembership(membershipId: string, cancellationMode?: string) {
    let response = await this.axios.post(`/memberships/${membershipId}/cancel`, {
      cancellation_mode: cancellationMode
    });
    return response.data;
  }

  async uncancelMembership(membershipId: string) {
    let response = await this.axios.post(`/memberships/${membershipId}/uncancel`);
    return response.data;
  }

  async pauseMembership(membershipId: string, voidPayments?: boolean) {
    let response = await this.axios.post(`/memberships/${membershipId}/pause`, {
      void_payments: voidPayments
    });
    return response.data;
  }

  async resumeMembership(membershipId: string) {
    let response = await this.axios.post(`/memberships/${membershipId}/resume`);
    return response.data;
  }

  // ── Members ───────────────────────────────────────────────

  async listMembers(params: {
    companyId: string;
    after?: string;
    first?: number;
    query?: string;
    statuses?: string[];
    accessLevel?: string;
    productIds?: string[];
    order?: string;
    direction?: string;
  }) {
    let response = await this.axios.get('/members', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        query: params.query,
        'statuses[]': params.statuses,
        access_level: params.accessLevel,
        'product_ids[]': params.productIds,
        order: params.order,
        direction: params.direction
      }
    });
    return response.data;
  }

  async getMember(memberId: string) {
    let response = await this.axios.get(`/members/${memberId}`);
    return response.data;
  }

  // ── Payments ──────────────────────────────────────────────

  async listPayments(params: {
    companyId?: string;
    after?: string;
    first?: number;
    productIds?: string[];
    statuses?: string[];
    billingReasons?: string[];
    order?: string;
    direction?: string;
    query?: string;
  }) {
    let response = await this.axios.get('/payments', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'product_ids[]': params.productIds,
        'statuses[]': params.statuses,
        'billing_reasons[]': params.billingReasons,
        order: params.order,
        direction: params.direction,
        query: params.query
      }
    });
    return response.data;
  }

  async getPayment(paymentId: string) {
    let response = await this.axios.get(`/payments/${paymentId}`);
    return response.data;
  }

  async refundPayment(paymentId: string, partialAmount?: number) {
    let body: Record<string, unknown> = {};
    if (partialAmount !== undefined) {
      body.partial_amount = partialAmount;
    }
    let response = await this.axios.post(`/payments/${paymentId}/refund`, body);
    return response.data;
  }

  // ── Promo Codes ───────────────────────────────────────────

  async listPromoCodes(params: {
    companyId: string;
    after?: string;
    first?: number;
    productIds?: string[];
    planIds?: string[];
    status?: string;
  }) {
    let response = await this.axios.get('/promo_codes', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'product_ids[]': params.productIds,
        'plan_ids[]': params.planIds,
        status: params.status
      }
    });
    return response.data;
  }

  async getPromoCode(promoCodeId: string) {
    let response = await this.axios.get(`/promo_codes/${promoCodeId}`);
    return response.data;
  }

  async createPromoCode(data: {
    companyId: string;
    code: string;
    promoType: string;
    amountOff: number;
    baseCurrency: string;
    promoDurationMonths: number;
    newUsersOnly: boolean;
    productId?: string;
    planIds?: string[];
    stock?: number;
    unlimitedStock?: boolean;
    expiresAt?: string;
    onePerCustomer?: boolean;
    churnedUsersOnly?: boolean;
    existingMembershipsOnly?: boolean;
  }) {
    let response = await this.axios.post('/promo_codes', {
      company_id: data.companyId,
      code: data.code,
      promo_type: data.promoType,
      amount_off: data.amountOff,
      base_currency: data.baseCurrency,
      promo_duration_months: data.promoDurationMonths,
      new_users_only: data.newUsersOnly,
      product_id: data.productId,
      plan_ids: data.planIds,
      stock: data.stock,
      unlimited_stock: data.unlimitedStock,
      expires_at: data.expiresAt,
      one_per_customer: data.onePerCustomer,
      churned_users_only: data.churnedUsersOnly,
      existing_memberships_only: data.existingMembershipsOnly
    });
    return response.data;
  }

  async deletePromoCode(promoCodeId: string) {
    let response = await this.axios.delete(`/promo_codes/${promoCodeId}`);
    return response.data;
  }

  // ── Checkout Configurations ───────────────────────────────

  async createCheckoutConfiguration(data: {
    mode: string;
    companyId?: string;
    planId?: string;
    plan?: {
      companyId: string;
      productId?: string;
      currency: string;
      initialPrice?: number;
      renewalPrice?: number;
      billingPeriod?: number;
      planType?: string;
      trialPeriodDays?: number;
    };
    redirectUrl?: string;
    metadata?: Record<string, string>;
    currency?: string;
    affiliateCode?: string;
  }) {
    let body: Record<string, unknown> = {
      mode: data.mode,
      redirect_url: data.redirectUrl,
      metadata: data.metadata,
      currency: data.currency,
      affiliate_code: data.affiliateCode
    };

    if (data.mode === 'setup') {
      body.company_id = data.companyId;
    } else if (data.planId) {
      body.plan_id = data.planId;
    } else if (data.plan) {
      body.plan = {
        company_id: data.plan.companyId,
        product_id: data.plan.productId,
        currency: data.plan.currency,
        initial_price: data.plan.initialPrice,
        renewal_price: data.plan.renewalPrice,
        billing_period: data.plan.billingPeriod,
        plan_type: data.plan.planType,
        trial_period_days: data.plan.trialPeriodDays
      };
    }

    let response = await this.axios.post('/checkout_configurations', body);
    return response.data;
  }

  async getCheckoutConfiguration(checkoutId: string) {
    let response = await this.axios.get(`/checkout_configurations/${checkoutId}`);
    return response.data;
  }

  async listCheckoutConfigurations(params: {
    companyId: string;
    after?: string;
    first?: number;
    planId?: string;
  }) {
    let response = await this.axios.get('/checkout_configurations', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        plan_id: params.planId
      }
    });
    return response.data;
  }

  // ── Invoices ──────────────────────────────────────────────

  async listInvoices(params: {
    companyId: string;
    after?: string;
    first?: number;
    statuses?: string[];
    productIds?: string[];
    order?: string;
    direction?: string;
  }) {
    let response = await this.axios.get('/invoices', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'statuses[]': params.statuses,
        'product_ids[]': params.productIds,
        order: params.order,
        direction: params.direction
      }
    });
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.axios.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  // ── Users ─────────────────────────────────────────────────

  async getUser(userIdOrUsername: string) {
    let response = await this.axios.get(`/users/${userIdOrUsername}`);
    return response.data;
  }

  // ── Reviews ───────────────────────────────────────────────

  async listReviews(params: {
    companyId: string;
    after?: string;
    first?: number;
    productIds?: string[];
  }) {
    let response = await this.axios.get('/reviews', {
      params: {
        company_id: params.companyId,
        after: params.after,
        first: params.first,
        'product_ids[]': params.productIds
      }
    });
    return response.data;
  }

  // ── Webhooks ──────────────────────────────────────────────

  async createWebhook(data: { url: string; events?: string[]; enabled?: boolean }) {
    let response = await this.axios.post('/webhooks', {
      url: data.url,
      events: data.events,
      enabled: data.enabled
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
