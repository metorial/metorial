import { createAxios } from 'slates';

export class Client {
  private api;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: 'https://api.piggy.eu',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Contacts ────────────────────────────────────────────────

  async listContacts(params?: {
    limit?: number;
    page?: number;
    sort?: string;
    createdAtGt?: string;
    createdAtGte?: string;
    createdAtLt?: string;
    createdAtLte?: string;
  }) {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.page) query.page = params.page;
    if (params?.sort) query.sort = params.sort;
    if (params?.createdAtGt) query['created_at[gt]'] = params.createdAtGt;
    if (params?.createdAtGte) query['created_at[gte]'] = params.createdAtGte;
    if (params?.createdAtLt) query['created_at[lt]'] = params.createdAtLt;
    if (params?.createdAtLte) query['created_at[lte]'] = params.createdAtLte;

    let response = await this.api.get('/api/v3/oauth/clients/contacts', { params: query });
    return response.data;
  }

  async getContact(contactUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/contacts/${contactUuid}`);
    return response.data;
  }

  async findContactByEmail(email: string) {
    let response = await this.api.get('/api/v3/oauth/contacts/find-one-by', {
      params: { email }
    });
    return response.data;
  }

  async findOrCreateContact(email: string) {
    let response = await this.api.get('/api/v3/oauth/contacts/find-or-create', {
      params: { email }
    });
    return response.data;
  }

  async createContact(data: { email: string; referralCode?: string }) {
    let body: Record<string, any> = { email: data.email };
    if (data.referralCode) body.referral_code = data.referralCode;
    let response = await this.api.post('/api/v3/oauth/contacts', body);
    return response.data;
  }

  async createAnonymousContact(contactIdentifierValue?: string) {
    let body: Record<string, any> = {};
    if (contactIdentifierValue) body.contact_identifier_value = contactIdentifierValue;
    let response = await this.api.post('/api/v3/oauth/contacts/anonymous', body);
    return response.data;
  }

  async updateContact(contactUuid: string, attributes: Record<string, any>) {
    let response = await this.api.put(`/api/v3/oauth/contacts/${contactUuid}`, { attributes });
    return response.data;
  }

  async deleteContact(contactUuid: string, type: 'DEFAULT' | 'GDPR' = 'DEFAULT') {
    let response = await this.api.post(`/api/v3/oauth/contacts/${contactUuid}/delete`, {
      type
    });
    return response.data;
  }

  async getContactCreditBalance(contactUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/contacts/${contactUuid}/credit-balance`);
    return response.data;
  }

  async getContactPrepaidBalance(contactUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/contacts/${contactUuid}/prepaid-balance`);
    return response.data;
  }

  async getContactTier(contactUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/contacts/${contactUuid}/tier`);
    return response.data;
  }

  async getContactIdentifiers(contactUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/contacts/${contactUuid}/contact-identifiers`
    );
    return response.data;
  }

  // ─── Contact Identifiers ────────────────────────────────────

  async findContactIdentifier(value: string) {
    let response = await this.api.get('/api/v3/oauth/contact-identifiers/find', {
      params: { contact_identifier_value: value }
    });
    return response.data;
  }

  async createContactIdentifier(data: {
    contactIdentifierValue: string;
    contactUuid?: string;
    contactIdentifierName?: string;
  }) {
    let body: Record<string, any> = {
      contact_identifier_value: data.contactIdentifierValue
    };
    if (data.contactUuid) body.contact_uuid = data.contactUuid;
    if (data.contactIdentifierName) body.contact_identifier_name = data.contactIdentifierName;

    let response = await this.api.post('/api/v3/oauth/contact-identifiers', body);
    return response.data;
  }

  async linkContactIdentifier(contactIdentifierValue: string, contactUuid: string) {
    let response = await this.api.put('/api/v3/oauth/contact-identifiers/link', {
      contact_identifier_value: contactIdentifierValue,
      contact_uuid: contactUuid
    });
    return response.data;
  }

  async unlinkContactIdentifier(contactIdentifierValue: string) {
    let response = await this.api.put('/api/v3/oauth/contact-identifiers/unlink', {
      contact_identifier_value: contactIdentifierValue
    });
    return response.data;
  }

  // ─── Loyalty ─────────────────────────────────────────────────

  async getLoyaltyProgram() {
    let response = await this.api.get('/api/v3/oauth/loyalty-program');
    return response.data;
  }

  async listLoyaltyTransactions(params?: {
    limit?: number;
    page?: number;
    type?: 'credit_receptions' | 'reward_receptions';
    shopUuid?: string;
    contactUuid?: string;
    sort?: string;
    createdAtGt?: string;
    createdAtGte?: string;
    createdAtLt?: string;
    createdAtLte?: string;
  }) {
    let query: Record<string, any> = {};
    if (params?.limit) query.limit = params.limit;
    if (params?.page) query.page = params.page;
    if (params?.type) query.type = params.type;
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;
    if (params?.sort) query.sort = params.sort;
    if (params?.createdAtGt) query['created_at[gt]'] = params.createdAtGt;
    if (params?.createdAtGte) query['created_at[gte]'] = params.createdAtGte;
    if (params?.createdAtLt) query['created_at[lt]'] = params.createdAtLt;
    if (params?.createdAtLte) query['created_at[lte]'] = params.createdAtLte;

    let response = await this.api.get('/api/v3/oauth/clients/loyalty-transactions', {
      params: query
    });
    return response.data;
  }

  async createCreditReception(data: {
    shopUuid: string;
    contactUuid: string;
    credits?: number;
    unitValue?: number;
    unitName?: string;
    contactIdentifierValue?: string;
  }) {
    let body: Record<string, any> = {
      shop_uuid: data.shopUuid,
      contact_uuid: data.contactUuid
    };
    if (data.credits !== undefined) body.credits = data.credits;
    if (data.unitValue !== undefined) body.unit_value = data.unitValue;
    if (data.unitName) body.unit_name = data.unitName;
    if (data.contactIdentifierValue)
      body.contact_identifier_value = data.contactIdentifierValue;

    let response = await this.api.post('/api/v3/oauth/credit-receptions', body);
    return response.data;
  }

  async reverseCreditReception(creditReceptionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/credit-receptions/${creditReceptionUuid}/reverse`
    );
    return response.data;
  }

  async calculateCredits(params: {
    shopUuid: string;
    unitValue: number;
    contactUuid?: string;
    unitName?: string;
  }) {
    let query: Record<string, any> = {
      shop_uuid: params.shopUuid,
      unit_value: params.unitValue
    };
    if (params.contactUuid) query.contact_uuid = params.contactUuid;
    if (params.unitName) query.unit_name = params.unitName;

    let response = await this.api.get('/api/v3/oauth/credit-receptions/calculate', {
      params: query
    });
    return response.data;
  }

  // ─── Rewards ─────────────────────────────────────────────────

  async listRewards(params?: { shopUuid?: string; contactUuid?: string }) {
    let query: Record<string, any> = {};
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;

    let response = await this.api.get('/api/v3/oauth/rewards', { params: query });
    return response.data;
  }

  async getReward(rewardUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/rewards/${rewardUuid}`);
    return response.data;
  }

  async updateReward(
    rewardUuid: string,
    data: {
      title?: string;
      description?: string;
      requiredCredits?: number;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.requiredCredits !== undefined) body.required_credits = data.requiredCredits;

    let response = await this.api.put(`/api/v3/oauth/rewards/${rewardUuid}`, body);
    return response.data;
  }

  async createRewardReception(data: {
    contactUuid: string;
    rewardUuid: string;
    shopUuid: string;
    contactIdentifierValue?: string;
  }) {
    let body: Record<string, any> = {
      contact_uuid: data.contactUuid,
      reward_uuid: data.rewardUuid,
      shop_uuid: data.shopUuid
    };
    if (data.contactIdentifierValue)
      body.contact_identifier_value = data.contactIdentifierValue;

    let response = await this.api.post('/api/v3/oauth/reward-receptions', body);
    return response.data;
  }

  async reverseRewardReception(rewardReceptionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/reward-receptions/${rewardReceptionUuid}/reverse`
    );
    return response.data;
  }

  // ─── Promotions ──────────────────────────────────────────────

  async listPromotions() {
    let response = await this.api.get('/api/v3/oauth/promotions');
    return response.data;
  }

  async getPromotion(promotionUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/promotions/${promotionUuid}`);
    return response.data;
  }

  // ─── Vouchers ────────────────────────────────────────────────

  async listVouchers(params?: {
    promotionUuid?: string;
    contactUuid?: string;
    status?: string;
    limit?: number;
    page?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.promotionUuid) query.promotion_uuid = params.promotionUuid;
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = params.limit;
    if (params?.page) query.page = params.page;

    let response = await this.api.get('/api/v3/oauth/vouchers', { params: query });
    return response.data;
  }

  async findVoucher(code: string) {
    let response = await this.api.get('/api/v3/oauth/vouchers/find', {
      params: { code }
    });
    return response.data;
  }

  async createVoucher(data: {
    promotionUuid: string;
    code?: string;
    contactUuid?: string;
    expirationDate?: string;
    activationDate?: string;
    totalRedemptionsAllowed?: number;
    customAttributes?: Array<{ name: string; value: string }>;
  }) {
    let body: Record<string, any> = {
      promotion_uuid: data.promotionUuid
    };
    if (data.code) body.code = data.code;
    if (data.contactUuid) body.contact_uuid = data.contactUuid;
    if (data.expirationDate) body.expiration_date = data.expirationDate;
    if (data.activationDate) body.activation_date = data.activationDate;
    if (data.totalRedemptionsAllowed !== undefined)
      body.total_redemptions_allowed = data.totalRedemptionsAllowed;
    if (data.customAttributes) body.custom_attributes = data.customAttributes;

    let response = await this.api.post('/api/v3/oauth/vouchers', body);
    return response.data;
  }

  async updateVoucher(
    voucherUuid: string,
    data: {
      status?: 'ACTIVE' | 'DEACTIVATED';
      expirationDate?: string;
      customAttributes?: Array<{ name: string; value: string }>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.status) body.status = data.status;
    if (data.expirationDate) body.expiration_date = data.expirationDate;
    if (data.customAttributes) body.custom_attributes = data.customAttributes;

    let response = await this.api.put(`/api/v3/oauth/vouchers/${voucherUuid}`, body);
    return response.data;
  }

  async redeemVoucher(data: {
    code: string;
    shopUuid: string;
    contactUuid?: string;
    releaseKey?: string;
  }) {
    let body: Record<string, any> = {
      code: data.code,
      shop_uuid: data.shopUuid
    };
    if (data.contactUuid) body.contact_uuid = data.contactUuid;
    if (data.releaseKey) body.release_key = data.releaseKey;

    let response = await this.api.post('/api/v3/oauth/vouchers/redeem', body);
    return response.data;
  }

  // ─── Gift Cards ──────────────────────────────────────────────

  async listGiftcards(params?: {
    giftcardProgramUuid?: string;
    page?: number;
    limit?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.giftcardProgramUuid) query.giftcard_program_uuid = params.giftcardProgramUuid;
    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;

    let response = await this.api.get('/api/v3/oauth/giftcards', { params: query });
    return response.data;
  }

  async getGiftcard(giftcardUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/giftcards/${giftcardUuid}`);
    return response.data;
  }

  async findGiftcardByHash(hash: string) {
    let response = await this.api.get('/api/v3/oauth/giftcards/find-one-by', {
      params: { hash }
    });
    return response.data;
  }

  async createGiftcard(data: { giftcardProgramUuid: string; type?: number }) {
    let response = await this.api.post('/api/v3/oauth/giftcards', {
      giftcard_program_uuid: data.giftcardProgramUuid,
      type: data.type ?? 1 // 1 = digital
    });
    return response.data;
  }

  async listGiftcardPrograms() {
    let response = await this.api.get('/api/v3/oauth/giftcard-programs');
    return response.data;
  }

  async listGiftcardTransactions(params?: {
    giftcardHash?: string;
    giftcardProgramUuid?: string;
    shopUuid?: string;
    page?: number;
    perPage?: number;
    sort?: string;
    createdAtGt?: string;
    createdAtGte?: string;
    createdAtLt?: string;
    createdAtLte?: string;
  }) {
    let query: Record<string, any> = {};
    if (params?.giftcardHash) query.giftcard_hash = params.giftcardHash;
    if (params?.giftcardProgramUuid) query.giftcard_program_uuid = params.giftcardProgramUuid;
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.page) query.page = params.page;
    if (params?.perPage) query.perPage = params.perPage;
    if (params?.sort) query.sort = params.sort;
    if (params?.createdAtGt) query['created_at[gt]'] = params.createdAtGt;
    if (params?.createdAtGte) query['created_at[gte]'] = params.createdAtGte;
    if (params?.createdAtLt) query['created_at[lt]'] = params.createdAtLt;
    if (params?.createdAtLte) query['created_at[lte]'] = params.createdAtLte;

    let response = await this.api.get('/api/v3/oauth/clients/giftcard-transactions', {
      params: query
    });
    return response.data;
  }

  async createGiftcardTransaction(data: {
    giftcardUuid: string;
    amountInCents: number;
    shopUuid: string;
    customAttributes?: Array<{ name: string; value: string }>;
  }) {
    let body: Record<string, any> = {
      giftcard_uuid: data.giftcardUuid,
      amount_in_cents: data.amountInCents,
      shop_uuid: data.shopUuid
    };
    if (data.customAttributes) body.custom_attributes = data.customAttributes;

    let response = await this.api.post('/api/v3/oauth/giftcard-transactions', body);
    return response.data;
  }

  async reverseGiftcardTransaction(giftcardTransactionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/giftcard-transactions/${giftcardTransactionUuid}/reverse`
    );
    return response.data;
  }

  // ─── Prepaid ─────────────────────────────────────────────────

  async createPrepaidTransaction(data: {
    contactUuid?: string;
    contactIdentifierValue?: string;
    amountInCents: number;
    shopUuid: string;
  }) {
    let body: Record<string, any> = {
      amount_in_cents: data.amountInCents,
      shop_uuid: data.shopUuid
    };
    if (data.contactUuid) body.contact_uuid = data.contactUuid;
    if (data.contactIdentifierValue)
      body.contact_identifier_value = data.contactIdentifierValue;

    let response = await this.api.post('/api/v3/oauth/prepaid-transactions', body);
    return response.data;
  }

  async listPrepaidTransactions(params?: {
    contactUuid?: string;
    shopUuid?: string;
    limit?: number;
    page?: number;
  }) {
    let query: Record<string, any> = {};
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.limit) query.limit = params.limit;
    if (params?.page) query.page = params.page;

    let response = await this.api.get('/api/v3/oauth/prepaid-transactions', { params: query });
    return response.data;
  }

  async reversePrepaidTransaction(prepaidTransactionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/prepaid-transactions/${prepaidTransactionUuid}/reverse`
    );
    return response.data;
  }

  // ─── Shops ───────────────────────────────────────────────────

  async listShops() {
    let response = await this.api.get('/api/v3/oauth/shops');
    return response.data;
  }

  async getShop(shopUuid: string) {
    let response = await this.api.get(`/api/v3/oauth/shops/${shopUuid}`);
    return response.data;
  }

  // ─── Orders ──────────────────────────────────────────────────

  async createAndProcessOrder(data: Record<string, any>) {
    let response = await this.api.post(
      '/api/v3/oauth/clients/orders/create-and-process',
      data
    );
    return response.data;
  }

  async findOrder(externalIdentifier: string) {
    let response = await this.api.get('/api/v3/oauth/clients/orders/find', {
      params: { external_identifier: externalIdentifier }
    });
    return response.data;
  }

  async updateOrder(orderUuid: string, data: { status?: string; paymentStatus?: string }) {
    let body: Record<string, any> = {};
    if (data.status) body.status = data.status;
    if (data.paymentStatus) body.payment_status = data.paymentStatus;

    let response = await this.api.put(`/api/v3/oauth/clients/orders/${orderUuid}`, body);
    return response.data;
  }

  // ─── Forms ───────────────────────────────────────────────────

  async listForms(params?: { status?: string; type?: string }) {
    let query: Record<string, any> = {};
    if (params?.status) query.status = params.status;
    if (params?.type) query.type = params.type;

    let response = await this.api.get('/api/v3/oauth/forms', { params: query });
    return response.data;
  }

  // ─── Tiers ───────────────────────────────────────────────────

  async listTiers() {
    let response = await this.api.get('/api/v3/oauth/tiers');
    return response.data;
  }

  // ─── Contact Attributes ──────────────────────────────────────

  async listContactAttributes(entity?: string) {
    let query: Record<string, any> = {};
    if (entity) query.entity = entity;

    let response = await this.api.get('/api/v3/oauth/contact-attributes', { params: query });
    return response.data;
  }

  // ─── Webhook Subscriptions ───────────────────────────────────

  async listWebhookSubscriptions(params?: { eventType?: string; status?: string }) {
    let query: Record<string, any> = {};
    if (params?.eventType) query.event_type = params.eventType;
    if (params?.status) query.status = params.status;

    let response = await this.api.get('/api/v3/oauth/webhook-subscriptions', {
      params: query
    });
    return response.data;
  }

  async createWebhookSubscription(data: {
    name: string;
    eventType: string;
    url: string;
    secret?: string;
    attributes?: string[];
  }) {
    let body: Record<string, any> = {
      name: data.name,
      event_type: data.eventType,
      url: data.url
    };
    if (data.secret) body.secret = data.secret;
    if (data.attributes) body.attributes = data.attributes;

    let response = await this.api.post('/api/v3/oauth/webhook-subscriptions', body);
    return response.data;
  }

  async getWebhookSubscription(webhookSubscriptionUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/webhook-subscriptions/${webhookSubscriptionUuid}`
    );
    return response.data;
  }

  async updateWebhookSubscription(
    webhookSubscriptionUuid: string,
    data: {
      name?: string;
      url?: string;
      status?: 'ACTIVE' | 'INACTIVE';
      attributes?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (data.name) body.name = data.name;
    if (data.url) body.url = data.url;
    if (data.status) body.status = data.status;
    if (data.attributes) body.attributes = data.attributes;

    let response = await this.api.put(
      `/api/v3/oauth/webhook-subscriptions/${webhookSubscriptionUuid}`,
      body
    );
    return response.data;
  }

  async deleteWebhookSubscription(webhookSubscriptionUuid: string) {
    let response = await this.api.delete(
      `/api/v3/oauth/webhook-subscriptions/${webhookSubscriptionUuid}`
    );
    return response.data;
  }

  // ─── Automations ─────────────────────────────────────────────

  async listAutomations() {
    let response = await this.api.get('/api/v3/oauth/automations');
    return response.data;
  }

  async triggerAutomationRun(data: {
    contactUuid: string;
    automationUuid: string;
    runData?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      contact_uuid: data.contactUuid,
      automation_uuid: data.automationUuid
    };
    if (data.runData) body.data = data.runData;

    let response = await this.api.post('/api/v3/oauth/automations/runs', body);
    return response.data;
  }
}
