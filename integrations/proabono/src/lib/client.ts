import { createAxios } from 'slates';

export class ProAbonoClient {
  private axios;

  constructor(config: { token: string; apiEndpoint: string }) {
    let baseURL = config.apiEndpoint.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL: `${baseURL}/v1`,
      headers: {
        Authorization: `Basic ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private async get(path: string, params?: Record<string, any>) {
    let response = await this.axios.get(path, { params });
    return response.data;
  }

  private async post(path: string, data?: Record<string, any>, params?: Record<string, any>) {
    let response = await this.axios.post(path, data, { params });
    return response.data;
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
      IsAutoBilling?: boolean;
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
    return this.post('/Subscription', data);
  }

  async getSubscription(params: {
    ReferenceSubscription?: string;
    ReferenceCustomer?: string;
    IdSubscription?: number;
  }) {
    return this.get('/Subscription', params);
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

  async startSubscription(data: {
    ReferenceSubscription?: string;
    IdSubscription?: number;
    ReferenceCustomer?: string;
  }) {
    return this.post('/Subscription/Start', data);
  }

  async suspendSubscription(data: {
    ReferenceSubscription?: string;
    IdSubscription?: number;
    ReferenceCustomer?: string;
  }) {
    return this.post('/Subscription/Suspension', data);
  }

  async upgradeSubscription(data: Record<string, any>) {
    return this.post('/Subscription/Upgrade', data);
  }

  async terminateSubscription(data: {
    ReferenceSubscription?: string;
    IdSubscription?: number;
    ReferenceCustomer?: string;
    AtRenewal?: boolean;
  }) {
    return this.post('/Subscription/Termination', data);
  }

  async updateSubscriptionTermDate(data: {
    ReferenceSubscription?: string;
    IdSubscription?: number;
    DateTerm?: string;
  }) {
    return this.post('/Subscription/TermDate', data);
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
    return this.post('/Usage', data);
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
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Offers', params);
  }

  // ========== Invoices ==========

  async getInvoice(invoiceId: number) {
    return this.get('/Invoice', { Id: invoiceId });
  }

  async listInvoices(params?: {
    ReferenceCustomer?: string;
    IdCustomer?: number;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Invoices', params);
  }

  async billCustomer(referenceCustomer: string) {
    return this.post('/Bill', undefined, { ReferenceCustomer: referenceCustomer });
  }

  // ========== Balance Lines ==========

  async createBalanceLine(data: {
    ReferenceCustomer: string;
    Amount: number;
    Description?: string;
  }) {
    return this.post('/BalanceLine', data);
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
    return this.post('/Quote/Subscription', data);
  }

  async quoteSubscriptionUpgrade(data: Record<string, any>) {
    return this.post('/Quote/SubscriptionUpgrade', data);
  }

  async quoteSubscriptionStart(data: {
    ReferenceSubscription?: string;
    IdSubscription?: number;
  }) {
    return this.post('/Quote/SubscriptionStart', data);
  }

  async quoteUsageUpdate(data: {
    ReferenceFeature: string;
    ReferenceCustomer: string;
    Increment?: number;
    QuantityCurrent?: number;
    IsEnabled?: boolean;
  }) {
    return this.post('/Quote/Usage', data);
  }

  async quoteBalanceLine(data: {
    ReferenceCustomer: string;
    Amount: number;
    Description?: string;
  }) {
    return this.post('/Quote/BalanceLine', data);
  }

  // ========== Features ==========

  async listFeatures(params?: {
    ReferenceSegment?: string;
    Page?: number;
    SizePage?: number;
  }) {
    return this.get('/Features', params);
  }

  async getFeature(referenceFeature: string) {
    return this.get('/Feature', { ReferenceFeature: referenceFeature });
  }
}
