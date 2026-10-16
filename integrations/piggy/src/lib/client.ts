import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { validateInteger, validatePagination, validateResponse } from './response';

export let piggyApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Piggy',
    reason: 'piggy_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    extractUpstreamCode: (_error, response, helpers) =>
      helpers.isRecord(response?.data) &&
      ['string', 'number'].includes(typeof response.data.code)
        ? String(response.data.code)
        : undefined
  });

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('Enter your Piggy API token.', {
        reason: 'piggy_missing_auth'
      });
    this.api = createAuthenticatedAxios({
      errorAdapter: piggyApiError,
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
    validatePagination(params?.limit, params?.page, 100, 1);
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.page !== undefined) query.page = params.page;
    if (params?.sort) query.sort = params.sort;
    if (params?.createdAtGt) query['created_at[gt]'] = params.createdAtGt;
    if (params?.createdAtGte) query['created_at[gte]'] = params.createdAtGte;
    if (params?.createdAtLt) query['created_at[lt]'] = params.createdAtLt;
    if (params?.createdAtLte) query['created_at[lte]'] = params.createdAtLte;

    let response = await this.api.get('/api/v3/oauth/clients/contacts', { params: query });
    return validateResponse(response.data, 'list');
  }

  async getContact(contactUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}`
    );
    return validateResponse(response.data, 'object');
  }

  async findContactByEmail(email: string) {
    let response = await this.api.get('/api/v3/oauth/clients/contacts/find-one-by', {
      params: { email }
    });
    return validateResponse(response.data, 'object');
  }

  async findOrCreateContact(email: string) {
    let response = await this.api.get('/api/v3/oauth/clients/contacts/find-or-create', {
      params: { email }
    });
    return validateResponse(response.data, 'object');
  }

  async createContact(data: { email: string; referralCode?: string }) {
    let body: Record<string, any> = { email: data.email };
    if (data.referralCode) body.referral_code = data.referralCode;
    let response = await this.api.post('/api/v3/oauth/clients/contacts', body);
    return validateResponse(response.data, 'object');
  }

  async createAnonymousContact(contactIdentifierValue?: string) {
    let body: Record<string, any> = {};
    if (contactIdentifierValue) body.contact_identifier_value = contactIdentifierValue;
    let response = await this.api.post('/api/v3/oauth/clients/contacts/anonymous', body);
    return validateResponse(response.data, 'object');
  }

  async updateContact(contactUuid: string, attributes: Record<string, any>) {
    let response = await this.api.put(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}`,
      { attributes }
    );
    return validateResponse(response.data, 'object');
  }

  async deleteContact(contactUuid: string, type: 'DEFAULT' | 'GDPR' = 'DEFAULT') {
    let response = await this.api.post(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}/delete`,
      {
        type
      }
    );
    return validateResponse(response.data, 'ack');
  }

  async getContactCreditBalance(contactUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}/credit-balance`
    );
    return validateResponse(response.data, 'object');
  }

  async getContactPrepaidBalance(contactUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}/prepaid-balance`
    );
    return validateResponse(response.data, 'object');
  }

  async getContactTier(contactUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}/tier`
    );
    return validateResponse(response.data, 'object');
  }

  async getContactIdentifiers(contactUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/contacts/${encodeURIComponent(contactUuid)}/contact-identifiers`
    );
    return validateResponse(response.data, 'list');
  }

  // ─── Contact Identifiers ────────────────────────────────────

  async findContactIdentifier(value: string) {
    let response = await this.api.get('/api/v3/oauth/clients/contact-identifiers/find', {
      params: { contact_identifier_value: value }
    });
    return validateResponse(response.data, 'object');
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

    let response = await this.api.post('/api/v3/oauth/clients/contact-identifiers', body);
    return validateResponse(response.data, 'object');
  }

  async linkContactIdentifier(contactIdentifierValue: string, contactUuid: string) {
    let response = await this.api.put('/api/v3/oauth/clients/contact-identifiers/link', {
      contact_identifier_value: contactIdentifierValue,
      contact_uuid: contactUuid
    });
    return validateResponse(response.data, 'object');
  }

  async unlinkContactIdentifier(contactIdentifierValue: string) {
    let response = await this.api.put('/api/v3/oauth/clients/contact-identifiers/unlink', {
      contact_identifier_value: contactIdentifierValue
    });
    return validateResponse(response.data, 'object');
  }

  // ─── Loyalty ─────────────────────────────────────────────────

  async getLoyaltyProgram() {
    let response = await this.api.get('/api/v3/oauth/clients/loyalty-program');
    return validateResponse(response.data, 'object');
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
    validatePagination(params?.limit, params?.page, 100, 1);
    let query: Record<string, any> = {};
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.page !== undefined) query.page = params.page;
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
    return validateResponse(response.data, 'list');
  }

  async createCreditReception(data: {
    shopUuid: string;
    contactUuid: string;
    credits?: number;
    unitValue?: number;
    unitName?: string;
    contactIdentifierValue?: string;
  }) {
    if (data.credits === undefined && data.unitValue === undefined)
      throw createApiServiceError('Provide credits or unitValue.', {
        reason: 'piggy_invalid_input'
      });
    let body: Record<string, any> = {
      shop_uuid: data.shopUuid,
      contact_uuid: data.contactUuid
    };
    if (data.credits !== undefined) body.credits = data.credits;
    if (data.unitValue !== undefined) body.unit_value = data.unitValue;
    if (data.unitName) body.unit_name = data.unitName;
    if (data.contactIdentifierValue)
      body.contact_identifier_value = data.contactIdentifierValue;

    let response = await this.api.post('/api/v3/oauth/clients/credit-receptions', body);
    return validateResponse(response.data, 'object');
  }

  async reverseCreditReception(creditReceptionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/clients/credit-receptions/${encodeURIComponent(creditReceptionUuid)}/reverse`
    );
    return validateResponse(response.data, 'object');
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

    let response = await this.api.get('/api/v3/oauth/clients/credit-receptions/calculate', {
      params: query
    });
    return validateResponse(response.data, 'object');
  }

  // ─── Rewards ─────────────────────────────────────────────────

  async listRewards(params?: { shopUuid?: string; contactUuid?: string }) {
    let query: Record<string, any> = {};
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;

    let response = await this.api.get('/api/v3/oauth/clients/rewards', { params: query });
    return validateResponse(response.data, 'list');
  }

  async getReward(rewardUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/rewards/${encodeURIComponent(rewardUuid)}`
    );
    return validateResponse(response.data, 'object');
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

    let response = await this.api.put(
      `/api/v3/oauth/clients/rewards/${encodeURIComponent(rewardUuid)}`,
      body
    );
    return validateResponse(response.data, 'object');
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

    let response = await this.api.post('/api/v3/oauth/clients/reward-receptions', body);
    return validateResponse(response.data, 'object');
  }

  async reverseRewardReception(rewardReceptionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/clients/reward-receptions/${encodeURIComponent(rewardReceptionUuid)}/reverse`
    );
    return validateResponse(response.data, 'object');
  }

  // ─── Promotions ──────────────────────────────────────────────

  async listPromotions() {
    let response = await this.api.get('/api/v3/oauth/clients/promotions');
    return validateResponse(response.data, 'list');
  }

  async getPromotion(promotionUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/promotions/${encodeURIComponent(promotionUuid)}`
    );
    return validateResponse(response.data, 'object');
  }

  // ─── Vouchers ────────────────────────────────────────────────

  async listVouchers(params?: {
    promotionUuid?: string;
    contactUuid?: string;
    status?: string;
    limit?: number;
    page?: number;
  }) {
    validatePagination(params?.limit, params?.page, 500, 0);
    let query: Record<string, any> = {};
    if (params?.promotionUuid) query.promotion_uuid = params.promotionUuid;
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;
    if (params?.status) query.status = params.status;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.page !== undefined) query.page = params.page;

    let response = await this.api.get('/api/v3/oauth/clients/vouchers', { params: query });
    return validateResponse(response.data, 'list');
  }

  async findVoucher(code: string) {
    let response = await this.api.get('/api/v3/oauth/clients/vouchers/find', {
      params: { code }
    });
    return validateResponse(response.data, 'object');
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
    validateInteger(data.totalRedemptionsAllowed, 'totalRedemptionsAllowed');
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

    let response = await this.api.post('/api/v3/oauth/clients/vouchers', body);
    return validateResponse(response.data, 'object');
  }

  async updateVoucher(
    voucherUuid: string,
    data: {
      status?: 'ACTIVE' | 'DEACTIVATED';
      expirationDate?: string;
      customAttributes?: Array<{ name: string; value: string }>;
    }
  ) {
    if (data.status !== 'ACTIVE' && data.status !== 'DEACTIVATED')
      throw createApiServiceError('Voucher updates require status ACTIVE or DEACTIVATED.', {
        reason: 'piggy_invalid_input'
      });
    let body: Record<string, any> = {};
    if (data.status) body.status = data.status;
    if (data.expirationDate) body.expiration_date = data.expirationDate;
    if (data.customAttributes) body.custom_attributes = data.customAttributes;

    let response = await this.api.put(
      `/api/v3/oauth/clients/vouchers/${encodeURIComponent(voucherUuid)}`,
      body
    );
    return validateResponse(response.data, 'object');
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

    let response = await this.api.post('/api/v3/oauth/clients/vouchers/redeem', body);
    return validateResponse(response.data, 'object');
  }

  // ─── Gift Cards ──────────────────────────────────────────────

  async listGiftcards(params?: {
    giftcardProgramUuid?: string;
    page?: number;
    limit?: number;
  }) {
    validatePagination(params?.limit, params?.page, 100, 1);
    let query: Record<string, any> = {};
    if (params?.giftcardProgramUuid) query.giftcard_program_uuid = params.giftcardProgramUuid;
    if (params?.page !== undefined) query.page = params.page;
    if (params?.limit !== undefined) query.limit = params.limit;

    let response = await this.api.get('/api/v3/oauth/clients/giftcards', { params: query });
    return validateResponse(response.data, 'list');
  }

  async getGiftcard(giftcardUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/giftcards/${encodeURIComponent(giftcardUuid)}`
    );
    return validateResponse(response.data, 'object');
  }

  async findGiftcardByHash(hash: string) {
    let response = await this.api.get('/api/v3/oauth/clients/giftcards/find-one-by', {
      params: { hash }
    });
    return validateResponse(response.data, 'object');
  }

  async createGiftcard(data: { giftcardProgramUuid: string; type?: number }) {
    let response = await this.api.post('/api/v3/oauth/clients/giftcards', {
      giftcard_program_uuid: data.giftcardProgramUuid,
      type: data.type ?? 1 // 1 = digital
    });
    return validateResponse(response.data, 'object');
  }

  async listGiftcardPrograms() {
    let response = await this.api.get('/api/v3/oauth/clients/giftcard-programs');
    return validateResponse(response.data, 'list');
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
    validatePagination(params?.perPage, params?.page, 100, 1);
    let query: Record<string, any> = {};
    if (params?.giftcardHash) query.giftcard_hash = params.giftcardHash;
    if (params?.giftcardProgramUuid) query.giftcard_program_uuid = params.giftcardProgramUuid;
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.page !== undefined) query.page = params.page;
    if (params?.perPage !== undefined) query.perPage = params.perPage;
    if (params?.sort) query.sort = params.sort;
    if (params?.createdAtGt) query['created_at[gt]'] = params.createdAtGt;
    if (params?.createdAtGte) query['created_at[gte]'] = params.createdAtGte;
    if (params?.createdAtLt) query['created_at[lt]'] = params.createdAtLt;
    if (params?.createdAtLte) query['created_at[lte]'] = params.createdAtLte;

    let response = await this.api.get('/api/v3/oauth/clients/giftcard-transactions', {
      params: query
    });
    return validateResponse(response.data, 'list');
  }

  async createGiftcardTransaction(data: {
    giftcardUuid: string;
    amountInCents: number;
    shopUuid: string;
    customAttributes?: Array<{ name: string; value: string }>;
  }) {
    validateInteger(data.amountInCents, 'amountInCents');
    let body: Record<string, any> = {
      giftcard_uuid: data.giftcardUuid,
      amount_in_cents: data.amountInCents,
      shop_uuid: data.shopUuid
    };
    if (data.customAttributes) body.custom_attributes = data.customAttributes;

    let response = await this.api.post('/api/v3/oauth/clients/giftcard-transactions', body);
    return validateResponse(response.data, 'object');
  }

  async reverseGiftcardTransaction(giftcardTransactionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/clients/giftcard-transactions/${encodeURIComponent(giftcardTransactionUuid)}/reverse`
    );
    return validateResponse(response.data, 'object');
  }

  // ─── Prepaid ─────────────────────────────────────────────────

  async createPrepaidTransaction(data: {
    contactUuid?: string;
    contactIdentifierValue?: string;
    amountInCents: number;
    shopUuid: string;
  }) {
    validateInteger(data.amountInCents, 'amountInCents');
    let body: Record<string, any> = {
      amount_in_cents: data.amountInCents,
      shop_uuid: data.shopUuid
    };
    if (data.contactUuid) body.contact_uuid = data.contactUuid;
    if (data.contactIdentifierValue)
      body.contact_identifier_value = data.contactIdentifierValue;

    let response = await this.api.post('/api/v3/oauth/clients/prepaid-transactions', body);
    return validateResponse(response.data, 'object');
  }

  async listPrepaidTransactions(params?: {
    contactUuid?: string;
    shopUuid?: string;
    limit?: number;
    page?: number;
  }) {
    validatePagination(params?.limit, params?.page, 30, 1);
    let query: Record<string, any> = {};
    if (params?.contactUuid) query.contact_uuid = params.contactUuid;
    if (params?.shopUuid) query.shop_uuid = params.shopUuid;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.page !== undefined) query.page = params.page;

    let response = await this.api.get('/api/v3/oauth/clients/prepaid-transactions', {
      params: query
    });
    return validateResponse(response.data, 'list');
  }

  async reversePrepaidTransaction(prepaidTransactionUuid: string) {
    let response = await this.api.post(
      `/api/v3/oauth/clients/prepaid-transactions/${encodeURIComponent(prepaidTransactionUuid)}/reverse`
    );
    return validateResponse(response.data, 'object');
  }

  // ─── Shops ───────────────────────────────────────────────────

  async listShops() {
    let response = await this.api.get('/api/v3/oauth/clients/shops');
    return validateResponse(response.data, 'list');
  }

  async getShop(shopUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/shops/${encodeURIComponent(shopUuid)}`
    );
    return validateResponse(response.data, 'object');
  }

  // ─── Orders ──────────────────────────────────────────────────

  async createAndProcessOrder(data: Record<string, any>) {
    let response = await this.api.post(
      '/api/v3/oauth/clients/orders/create-and-process',
      data
    );
    return validateResponse(response.data, 'object');
  }

  async findOrder(externalIdentifier: string) {
    let response = await this.api.get('/api/v3/oauth/clients/orders/find', {
      params: { external_identifier: externalIdentifier }
    });
    return validateResponse(response.data, 'object');
  }

  async updateOrder(orderUuid: string, data: { status?: string; paymentStatus?: string }) {
    let body: Record<string, any> = {};
    if (data.status) body.status = data.status;
    if (data.paymentStatus) body.payment_status = data.paymentStatus;

    let response = await this.api.put(
      `/api/v3/oauth/clients/orders/${encodeURIComponent(orderUuid)}`,
      body
    );
    return validateResponse(response.data, 'object');
  }

  // ─── Forms ───────────────────────────────────────────────────

  async listForms(params?: { status?: string; type?: string }) {
    let query: Record<string, any> = {};
    if (params?.status) query.status = params.status;
    if (params?.type) query.type = params.type;

    let response = await this.api.get('/api/v3/oauth/clients/forms', { params: query });
    return validateResponse(response.data, 'list');
  }

  // ─── Tiers ───────────────────────────────────────────────────

  async listTiers() {
    let response = await this.api.get('/api/v3/oauth/clients/tiers');
    return validateResponse(response.data, 'list');
  }

  // ─── Contact Attributes ──────────────────────────────────────

  async listContactAttributes(entity?: string) {
    let query: Record<string, any> = {};
    if (entity) query.entity = entity;

    let response = await this.api.get('/api/v3/oauth/clients/contact-attributes', {
      params: query
    });
    return validateResponse(response.data, 'list');
  }

  // ─── Webhook Subscriptions ───────────────────────────────────

  async listWebhookSubscriptions(params?: { eventType?: string; status?: string }) {
    let query: Record<string, any> = {};
    if (params?.eventType) query.event_type = params.eventType;
    if (params?.status) query.status = params.status;

    let response = await this.api.get('/api/v3/oauth/clients/webhook-subscriptions', {
      params: query
    });
    return validateResponse(response.data, 'list');
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

    let response = await this.api.post('/api/v3/oauth/clients/webhook-subscriptions', body);
    return validateResponse(response.data, 'object');
  }

  async getWebhookSubscription(webhookSubscriptionUuid: string) {
    let response = await this.api.get(
      `/api/v3/oauth/clients/webhook-subscriptions/${encodeURIComponent(webhookSubscriptionUuid)}`
    );
    return validateResponse(response.data, 'object');
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
      `/api/v3/oauth/clients/webhook-subscriptions/${encodeURIComponent(webhookSubscriptionUuid)}`,
      body
    );
    return validateResponse(response.data, 'object');
  }

  async deleteWebhookSubscription(webhookSubscriptionUuid: string) {
    let response = await this.api.delete(
      `/api/v3/oauth/clients/webhook-subscriptions/${encodeURIComponent(webhookSubscriptionUuid)}`
    );
    return validateResponse(response.data, 'ack');
  }

  // ─── Automations ─────────────────────────────────────────────

  async listAutomations() {
    let response = await this.api.get('/api/v3/oauth/clients/automations');
    return validateResponse(response.data, 'list');
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

    let response = await this.api.post('/api/v3/oauth/clients/automations/runs', body);
    return validateResponse(response.data, 'ack');
  }
}
