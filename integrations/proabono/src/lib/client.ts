import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

type SubscriptionTarget = {
  ReferenceSubscription?: string;
  ReferenceCustomer?: string;
  IdSubscription?: number;
};

export class ProAbonoClient {
  private axios;

  constructor(config: { token: string; apiEndpoint: string }) {
    let endpoint: URL;
    try {
      endpoint = new URL(config.apiEndpoint);
    } catch {
      throw createApiServiceError(
        'Provide the HTTPS API endpoint shown in ProAbono under My Profile > Integration.'
      );
    }
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    ) {
      throw createApiServiceError(
        'The ProAbono API endpoint must be an HTTPS URL without credentials, query parameters, or fragments.'
      );
    }
    if (!config.token)
      throw createApiServiceError('Reconnect ProAbono with your Agent Key and API Key.');
    let baseURL = endpoint.href.replace(/\/+$/, '').replace(/\/v1$/, '');
    this.axios = createAxios({
      baseURL: `${baseURL}/v1`,
      validateStatus: () => true,
      headers: {
        Authorization: `Basic ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    try {
      let response = await this.axios.request({ method, url: path, data, params });
      if (response.status < 200 || response.status >= 300) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'ProAbono',
            reason: 'proabono_api_error',
            operation: `${method} ${path}`,
            detailKeys: ['Target', 'Message', 'Code', 'Exception'],
            extractUpstreamCode: (_error, upstream) => {
              let body = Array.isArray(upstream?.data) ? upstream.data[0] : upstream?.data;
              return isApiErrorRecord(body) && typeof body.Code === 'string'
                ? body.Code
                : undefined;
            }
          }
        );
      }
      return response.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'ProAbono',
        reason: 'proabono_api_error',
        operation: `${method} ${path}`,
        detailKeys: ['Target', 'Message', 'Code', 'Exception']
      });
    }
  }

  private get(path: string, params?: Record<string, unknown>) {
    return this.request('GET', path, undefined, params);
  }

  private post(path: string, data?: unknown, params?: Record<string, unknown>) {
    return this.request('POST', path, data, params);
  }

  private async resolveSubscriptionId(target: SubscriptionTarget): Promise<number> {
    if (target.IdSubscription !== undefined) return target.IdSubscription;
    if (!target.ReferenceCustomer) {
      throw createApiServiceError(
        'Provide subscriptionId from manage_subscriptions list. The Live API does not support referenceSubscription lookups.'
      );
    }
    let subscription = await this.getSubscription(target);
    if (typeof subscription?.Id !== 'number') {
      throw createApiServiceError(
        'No active subscription was found for this customer. Use manage_subscriptions list and provide subscriptionId.'
      );
    }
    return subscription.Id;
  }

  // ========== Customers ==========

  async createCustomer(data: {
    ReferenceCustomer?: string;
    Email?: string;
    Name?: string;
    Language?: string;
    ReferenceSegment?: string;
    ReferenceOffer?: string;
    ReferenceAffiliation?: string;
    Metadata?: Record<string, string>;
  }) {
    return this.post('/Customer', data);
  }

  async getCustomer(referenceCustomer: string, referenceOffer?: string) {
    let params: Record<string, string> = { ReferenceCustomer: referenceCustomer };
    if (referenceOffer) params.ReferenceOffer = referenceOffer;
    return this.get('/Customer', params);
  }

  async updateCustomer(data: {
    ReferenceCustomer: string;
    Email?: string;
    Name?: string;
    Language?: string;
    ReferenceAffiliation?: string;
    Metadata?: Record<string, string>;
  }) {
    return this.post('/Customer', data);
  }

  async listCustomers(params?: {
    ReferenceSegment?: string;
    ReferenceFeature?: string;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Customers', params);
  }

  async suspendCustomer(referenceCustomer: string) {
    return this.post('/Customer/Suspension', undefined, {
      ReferenceCustomer: referenceCustomer
    });
  }

  async anonymizeCustomer(referenceCustomer: string) {
    return this.post('/Customer/Anonymization', undefined, {
      ReferenceCustomer: referenceCustomer
    });
  }

  async revokeCustomerLinks(referenceCustomer: string) {
    return this.post('/Customer/LinksRevokation', undefined, {
      ReferenceCustomer: referenceCustomer
    });
  }

  async invalidateCustomer(referenceCustomer: string) {
    return this.post('/Customer/Invalidation', undefined, {
      ReferenceCustomer: referenceCustomer
    });
  }

  // ========== Billing Address ==========

  async getBillingAddress(referenceCustomer: string) {
    return this.get('/CustomerBillingAddress', { ReferenceCustomer: referenceCustomer });
  }

  async updateBillingAddress(
    referenceCustomer: string,
    data: {
      Company?: string;
      FirstName?: string;
      LastName?: string;
      AddressLine1?: string;
      AddressLine2?: string;
      ZipCode?: string;
      City?: string;
      Country?: string;
      Region?: string;
      Phone?: string;
      TaxInformation?: string;
    }
  ) {
    return this.post('/CustomerBillingAddress', data, {
      ReferenceCustomer: referenceCustomer
    });
  }

  // ========== Payment Settings ==========

  async getPaymentSettings(referenceCustomer: string) {
    return this.get('/CustomerSettingsPayment', { ReferenceCustomer: referenceCustomer });
  }

  async updatePaymentSettings(
    referenceCustomer: string,
    data: {
      ModeBilling?: string;
      IsGreyListed?: boolean;
      NoteInvoice?: string;
      DateNextBilling?: string;
      TypePayment?: string;
    }
  ) {
    return this.post('/CustomerSettingsPayment', data, {
      ReferenceCustomer: referenceCustomer
    });
  }

  // ========== Subscriptions ==========

  async createSubscription(data: Record<string, any>) {
    let { EnsureBillable, TryStart, BillNow, ...body } = data;
    return this.post('/Subscription', body, { EnsureBillable, TryStart, BillNow });
  }

  async getSubscription(params: SubscriptionTarget) {
    if (params.IdSubscription !== undefined)
      return this.get(`/Subscription/${encodeURIComponent(params.IdSubscription)}`);
    if (!params.ReferenceCustomer) {
      throw createApiServiceError(
        'Provide subscriptionId or referenceCustomer. Use manage_subscriptions list to discover subscription IDs.'
      );
    }
    return this.get('/Subscription', { ReferenceCustomer: params.ReferenceCustomer });
  }

  async listSubscriptions(params?: {
    ReferenceCustomer?: string;
    ReferenceSegment?: string;
    Status?: string;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Subscriptions', params);
  }

  async startSubscription(
    data: SubscriptionTarget & { EnsureBillable?: boolean; BillNow?: boolean }
  ) {
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Subscription/${encodeURIComponent(id)}/Start`, undefined, {
      EnsureBillable: data.EnsureBillable,
      BillNow: data.BillNow
    });
  }

  async suspendSubscription(data: SubscriptionTarget) {
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Subscription/${encodeURIComponent(id)}/Suspension`);
  }

  async upgradeSubscription(data: SubscriptionTarget & Record<string, unknown>) {
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Subscription/${encodeURIComponent(id)}/Upgrade`, undefined, {
      ReferenceOffer: data.ReferenceOffer,
      BillNow: data.BillNow,
      Immediate: data.Immediate,
      IgnoreEngagement: data.IgnoreEngagement
    });
  }

  async terminateSubscription(data: SubscriptionTarget & { AtRenewal?: boolean }) {
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Subscription/${encodeURIComponent(id)}/Termination`, undefined, {
      Immediate: data.AtRenewal === undefined ? undefined : !data.AtRenewal
    });
  }

  async updateSubscriptionTermDate(data: SubscriptionTarget & { DateTerm?: string }) {
    if (!data.DateTerm)
      throw createApiServiceError('dateTerm is required for update_term_date.');
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Subscription/${encodeURIComponent(id)}/DateTerm`, {
      DateTerm: data.DateTerm
    });
  }

  // ========== Usages ==========

  async getUsage(referenceFeature: string, referenceCustomer: string) {
    return this.get('/Usage', {
      ReferenceFeature: referenceFeature,
      ReferenceCustomer: referenceCustomer
    });
  }

  async listUsages(params: {
    ReferenceCustomer?: string;
    ReferenceFeature?: string;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Usages', params);
  }

  async updateUsage(data: {
    ReferenceFeature: string;
    ReferenceCustomer?: string;
    IdSubscription?: number;
    Increment?: number;
    QuantityCurrent?: number;
    IsEnabled?: boolean;
    DateStamp?: string;
    EnsureBillable?: boolean;
  }) {
    let { EnsureBillable, ...body } = data;
    return this.post('/Usage', body, { EnsureBillable });
  }

  async batchUpdateUsages(
    items: Array<{
      ReferenceFeature: string;
      ReferenceCustomer?: string;
      IdSubscription?: number;
      Increment?: number;
      QuantityCurrent?: number;
      IsEnabled?: boolean;
      DateStamp?: string;
    }>
  ) {
    return this.post('/Usages', items);
  }

  // ========== Offers ==========

  async getOffer(params: {
    ReferenceOffer: string;
    ReferenceCustomer?: string;
    ReferenceSegment?: string;
    Language?: string;
    Html?: boolean;
  }) {
    return this.get('/Offer', params);
  }

  async listOffers(params?: {
    ReferenceCustomer?: string;
    ReferenceSegment?: string;
    IsVisible?: boolean;
    Language?: string;
    Html?: boolean;
    IgnoreFeatures?: boolean;
    UpgradeMode?: boolean;
    IdSubscription?: number;
    PrefixReferenceOffer?: string;
    ReferencePricingTable?: string;
    Page?: number;
    SizePage?: number;
  }) {
    let { UpgradeMode, ...query } = params ?? {};
    return this.get('/Offers', { ...query, Upgrade: UpgradeMode });
  }

  // ========== Invoices ==========

  async getInvoice(invoiceId: number) {
    return this.get(`/Invoice/${encodeURIComponent(invoiceId)}`);
  }

  async listInvoices(params?: {
    ReferenceCustomer?: string;
    IdCustomer?: number;
    IdSubscription?: number;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Invoices', params);
  }

  async billCustomer(referenceCustomer: string) {
    return this.post('/Billing/Customer', { ReferenceCustomer: referenceCustomer });
  }

  // ========== Balance Lines ==========

  async createBalanceLine(data: {
    ReferenceCustomer: string;
    Amount: number;
    Description?: string;
  }) {
    let { Description, ...body } = data;
    return this.post('/BalanceLine', { ...body, Label: Description });
  }

  async listBalanceLines(params?: {
    ReferenceCustomer?: string;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/BalanceLines', params);
  }

  // ========== Quotes ==========

  async quoteSubscriptionCreation(data: Record<string, any>) {
    let { EnsureBillable, TryStart, BillNow, ...body } = data;
    return this.post('/Pricing/Subscription', body, { EnsureBillable, TryStart, BillNow });
  }

  async quoteSubscriptionUpgrade(data: Record<string, any>) {
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Pricing/Subscription/${encodeURIComponent(id)}/Upgrade`, undefined, {
      ReferenceOffer: data.ReferenceOffer,
      BillNow: data.BillNow,
      Immediate: data.Immediate,
      IgnoreEngagement: data.IgnoreEngagement
    });
  }

  async quoteSubscriptionStart(data: SubscriptionTarget) {
    let id = await this.resolveSubscriptionId(data);
    return this.post(`/Pricing/Subscription/${encodeURIComponent(id)}/Start`);
  }

  async quoteUsageUpdate(data: {
    ReferenceFeature: string;
    ReferenceCustomer: string;
    IdSubscription?: number;
    Increment?: number;
    QuantityCurrent?: number;
    IsEnabled?: boolean;
    DateStamp?: string;
  }) {
    return this.post('/Pricing/Usage', data);
  }

  async quoteBalanceLine(data: {
    ReferenceCustomer: string;
    Amount: number;
    Description?: string;
  }) {
    let { Description, ...body } = data;
    return this.post('/Pricing/BalanceLine', { ...body, Label: Description });
  }

  // ========== Features ==========

  async listFeatures(params?: {
    ReferenceSegment?: string;
    ReferenceCustomer?: string;
    Language?: string;
    IsVisible?: boolean;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Features', params);
  }

  async getFeature(
    referenceFeature: string,
    params?: { ReferenceSegment?: string; ReferenceCustomer?: string; Language?: string }
  ) {
    return this.get('/Feature', { ...params, ReferenceFeature: referenceFeature });
  }
}
