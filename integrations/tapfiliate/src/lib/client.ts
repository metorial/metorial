import { createAxios } from 'slates';

let BASE_URL = 'https://api.tapfiliate.com/1.6';

export class TapfiliateClient {
  private http;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.token
      }
    });
  }

  // ─── Affiliates ───────────────────────────────────────────────

  async listAffiliates(params?: {
    email?: string;
    referralCode?: string;
    clickId?: string;
    sourceId?: string;
    parentId?: string;
    affiliateGroupId?: string;
    page?: number;
  }) {
    let res = await this.http.get('/affiliates/', {
      params: {
        email: params?.email,
        referral_code: params?.referralCode,
        click_id: params?.clickId,
        source_id: params?.sourceId,
        parent_id: params?.parentId,
        affiliate_group_id: params?.affiliateGroupId,
        page: params?.page
      }
    });
    return res.data;
  }

  async getAffiliate(affiliateId: string) {
    let res = await this.http.get(`/affiliates/${affiliateId}/`);
    return res.data;
  }

  async createAffiliate(data: {
    firstname: string;
    lastname: string;
    email: string;
    companyName?: string;
    password?: string;
    address?: {
      address?: string;
      addressTwo?: string;
      postalCode?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    metaData?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email
    };
    if (data.companyName) body.company = { name: data.companyName };
    if (data.password) body.password = data.password;
    if (data.address) {
      body.address = {
        address: data.address.address,
        address_two: data.address.addressTwo,
        postal_code: data.address.postalCode,
        city: data.address.city,
        state: data.address.state,
        country: data.address.country
      };
    }
    if (data.metaData) body.meta_data = data.metaData;

    let res = await this.http.post('/affiliates/', body);
    return res.data;
  }

  async deleteAffiliate(affiliateId: string) {
    await this.http.delete(`/affiliates/${affiliateId}/`);
  }

  async getAffiliateMetaData(affiliateId: string) {
    let res = await this.http.get(`/affiliates/${affiliateId}/meta-data/`);
    return res.data;
  }

  async setAffiliateMetaData(affiliateId: string, metaData: Record<string, any>) {
    let res = await this.http.put(`/affiliates/${affiliateId}/meta-data/`, metaData);
    return res.data;
  }

  async setAffiliateMetaDataKey(affiliateId: string, key: string, value: string) {
    let res = await this.http.put(`/affiliates/${affiliateId}/meta-data/${key}/`, { value });
    return res.data;
  }

  async deleteAffiliateMetaDataKey(affiliateId: string, key: string) {
    await this.http.delete(`/affiliates/${affiliateId}/meta-data/${key}/`);
  }

  async setAffiliateGroup(affiliateId: string, groupId: string) {
    let res = await this.http.put(`/affiliates/${affiliateId}/group/`, { group: groupId });
    return res.data;
  }

  async removeAffiliateGroup(affiliateId: string) {
    let res = await this.http.delete(`/affiliates/${affiliateId}/group/`);
    return res.data;
  }

  async getAffiliatePayoutMethod(affiliateId: string) {
    let res = await this.http.get(`/affiliates/${affiliateId}/payout-method/`);
    return res.data;
  }

  async setAffiliatePayoutMethod(affiliateId: string, payoutMethod: Record<string, any>) {
    let res = await this.http.put(`/affiliates/${affiliateId}/payout-method/`, payoutMethod);
    return res.data;
  }

  async setMlmParent(affiliateId: string, parentAffiliateId: string) {
    let res = await this.http.put(`/affiliates/${affiliateId}/mlm/parent/`, {
      parent_id: parentAffiliateId
    });
    return res.data;
  }

  async removeMlmParent(affiliateId: string) {
    await this.http.delete(`/affiliates/${affiliateId}/mlm/parent/`);
  }

  async getAffiliateBalances(affiliateId: string) {
    let res = await this.http.get(`/affiliates/${affiliateId}/balances/`);
    return res.data;
  }

  // ─── Affiliate Groups ────────────────────────────────────────

  async listAffiliateGroups() {
    let res = await this.http.get('/affiliate-groups/');
    return res.data;
  }

  async createAffiliateGroup(data: { title: string; currency?: string }) {
    let res = await this.http.post('/affiliate-groups/', data);
    return res.data;
  }

  async updateAffiliateGroup(groupId: string, data: { title?: string }) {
    let res = await this.http.patch(`/affiliate-groups/${groupId}/`, data);
    return res.data;
  }

  // ─── Affiliate Prospects ─────────────────────────────────────

  async listAffiliateProspects(params?: { programId?: string; page?: number }) {
    let res = await this.http.get('/affiliate-prospects/', {
      params: {
        program_id: params?.programId,
        page: params?.page
      }
    });
    return res.data;
  }

  async getAffiliateProspect(prospectId: string) {
    let res = await this.http.get(`/affiliate-prospects/${prospectId}/`);
    return res.data;
  }

  async createAffiliateProspect(data: {
    email: string;
    firstname: string;
    lastname: string;
    programId?: string;
    groupId?: string;
  }) {
    let body: Record<string, any> = {
      email: data.email,
      firstname: data.firstname,
      lastname: data.lastname
    };
    if (data.programId) body.program_id = data.programId;
    if (data.groupId) body.group_id = data.groupId;

    let res = await this.http.post('/affiliate-prospects/', body);
    return res.data;
  }

  async deleteAffiliateProspect(prospectId: string) {
    await this.http.delete(`/affiliate-prospects/${prospectId}/`);
  }

  // ─── Programs ────────────────────────────────────────────────

  async listPrograms(params?: { page?: number }) {
    let res = await this.http.get('/programs/', {
      params: { page: params?.page }
    });
    return res.data;
  }

  async getProgram(programId: string) {
    let res = await this.http.get(`/programs/${programId}/`);
    return res.data;
  }

  async listProgramAffiliates(
    programId: string,
    params?: {
      affiliateId?: string;
      page?: number;
    }
  ) {
    let res = await this.http.get(`/programs/${programId}/affiliates/`, {
      params: {
        affiliate_id: params?.affiliateId,
        page: params?.page
      }
    });
    return res.data;
  }

  async addAffiliateToProgram(
    programId: string,
    data: {
      affiliateId: string;
      approved?: boolean;
      coupon?: string;
    }
  ) {
    let body: Record<string, any> = {
      affiliate: { id: data.affiliateId }
    };
    if (data.approved !== undefined) body.approved = data.approved;
    if (data.coupon) body.coupon = data.coupon;

    let res = await this.http.post(`/programs/${programId}/affiliates/`, body);
    return res.data;
  }

  async updateAffiliateInProgram(
    programId: string,
    affiliateId: string,
    data: {
      coupon?: string;
      approved?: boolean;
    }
  ) {
    let res = await this.http.patch(`/programs/${programId}/affiliates/${affiliateId}/`, data);
    return res.data;
  }

  async approveAffiliateForProgram(programId: string, affiliateId: string) {
    let res = await this.http.put(
      `/programs/${programId}/affiliates/${affiliateId}/approval/`
    );
    return res.data;
  }

  async disapproveAffiliateForProgram(programId: string, affiliateId: string) {
    let res = await this.http.delete(
      `/programs/${programId}/affiliates/${affiliateId}/approval/`
    );
    return res.data;
  }

  async listProgramCommissionTypes(programId: string) {
    let res = await this.http.get(`/programs/${programId}/commission-types/`);
    return res.data;
  }

  async listProgramMlmLevels(programId: string) {
    let res = await this.http.get(`/programs/${programId}/mlm-levels/`);
    return res.data;
  }

  async listProgramBonuses(programId: string) {
    let res = await this.http.get(`/programs/${programId}/bonuses/`);
    return res.data;
  }

  // ─── Conversions ─────────────────────────────────────────────

  async listConversions(params?: {
    programId?: string;
    externalId?: string;
    affiliateId?: string;
    pending?: boolean;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    let res = await this.http.get('/conversions/', {
      params: {
        program_id: params?.programId,
        external_id: params?.externalId,
        affiliate_id: params?.affiliateId,
        pending: params?.pending,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page
      }
    });
    return res.data;
  }

  async getConversion(conversionId: number) {
    let res = await this.http.get(`/conversions/${conversionId}/`);
    return res.data;
  }

  async createConversion(data: {
    referralCode?: string;
    trackingId?: string;
    clickId?: string;
    coupon?: string;
    customerId?: string;
    externalId?: string;
    amount?: number;
    currency?: string;
    commissionType?: string;
    commissions?: Array<{ subAmount?: number; commissionType?: string; comment?: string }>;
    programGroup?: string;
    assetId?: string;
    sourceId?: string;
    userAgent?: string;
    ip?: string;
    metaData?: Record<string, any>;
    overrideMaxCookieTime?: boolean;
  }) {
    let body: Record<string, any> = {};
    if (data.referralCode) body.referral_code = data.referralCode;
    if (data.trackingId) body.tracking_id = data.trackingId;
    if (data.clickId) body.click_id = data.clickId;
    if (data.coupon) body.coupon = data.coupon;
    if (data.customerId) body.customer_id = data.customerId;
    if (data.externalId) body.external_id = data.externalId;
    if (data.amount !== undefined) body.amount = data.amount;
    if (data.currency) body.currency = data.currency;
    if (data.commissionType) body.commission_type = data.commissionType;
    if (data.commissions) {
      body.commissions = data.commissions.map(c => ({
        sub_amount: c.subAmount,
        commission_type: c.commissionType,
        comment: c.comment
      }));
    }
    if (data.programGroup) body.program_group = data.programGroup;
    if (data.assetId) body.asset_id = data.assetId;
    if (data.sourceId) body.source_id = data.sourceId;
    if (data.userAgent) body.user_agent = data.userAgent;
    if (data.ip) body.ip = data.ip;
    if (data.metaData) body.meta_data = data.metaData;

    let res = await this.http.post('/conversions/', body, {
      params: data.overrideMaxCookieTime ? { override_max_cookie_time: true } : undefined
    });
    return res.data;
  }

  async updateConversion(
    conversionId: number,
    data: {
      amount?: number;
      externalId?: string;
      metaData?: Record<string, any>;
      recalculateCommissions?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.amount !== undefined) body.amount = data.amount;
    if (data.externalId) body.external_id = data.externalId;
    if (data.metaData) body.meta_data = data.metaData;

    let res = await this.http.patch(`/conversions/${conversionId}/`, body, {
      params:
        data.recalculateCommissions === false ? { recalculate_commissions: false } : undefined
    });
    return res.data;
  }

  async deleteConversion(conversionId: number) {
    await this.http.delete(`/conversions/${conversionId}/`);
  }

  async addCommissionsToConversion(
    conversionId: number,
    data: {
      conversionSubAmount: number;
      commissionType?: string;
      comment?: string;
    }
  ) {
    let body: Record<string, any> = {
      conversion_sub_amount: data.conversionSubAmount
    };
    if (data.commissionType) body.commission_type = data.commissionType;
    if (data.comment) body.comment = data.comment;

    let res = await this.http.post(`/conversions/${conversionId}/commissions/`, body);
    return res.data;
  }

  async getConversionMetaData(conversionId: number) {
    let res = await this.http.get(`/conversions/${conversionId}/meta-data/`);
    return res.data;
  }

  async setConversionMetaData(conversionId: number, metaData: Record<string, any>) {
    let res = await this.http.put(`/conversions/${conversionId}/meta-data/`, metaData);
    return res.data;
  }

  // ─── Commissions ─────────────────────────────────────────────

  async listCommissions(params?: {
    programId?: string;
    affiliateId?: string;
    commissionId?: number;
    approved?: boolean;
    pending?: boolean;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    let res = await this.http.get('/commissions/', {
      params: {
        program_id: params?.programId,
        affiliate_id: params?.affiliateId,
        commission_id: params?.commissionId,
        approved: params?.approved,
        pending: params?.pending,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page
      }
    });
    return res.data;
  }

  async getCommission(commissionId: number) {
    let res = await this.http.get(`/commissions/${commissionId}/`);
    return res.data;
  }

  async updateCommission(
    commissionId: number,
    data: {
      amount?: number;
      comment?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.amount !== undefined) body.amount = data.amount;
    if (data.comment) body.comment = data.comment;

    let res = await this.http.patch(`/commissions/${commissionId}/`, body);
    return res.data;
  }

  async approveCommission(commissionId: number) {
    let res = await this.http.put(`/commissions/${commissionId}/approval/`);
    return res.data;
  }

  async disapproveCommission(commissionId: number) {
    let res = await this.http.delete(`/commissions/${commissionId}/approval/`);
    return res.data;
  }

  // ─── Customers ───────────────────────────────────────────────

  async listCustomers(params?: {
    programId?: string;
    customerId?: string;
    affiliateId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    let res = await this.http.get('/customers/', {
      params: {
        program_id: params?.programId,
        customer_id: params?.customerId,
        affiliate_id: params?.affiliateId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page
      }
    });
    return res.data;
  }

  async getCustomer(customerId: string) {
    let res = await this.http.get(`/customers/${customerId}/`);
    return res.data;
  }

  async createCustomer(data: {
    customerId: string;
    referralCode?: string;
    trackingId?: string;
    clickId?: string;
    coupon?: string;
    assetId?: string;
    sourceId?: string;
    status?: string;
    userAgent?: string;
    ip?: string;
    metaData?: Record<string, any>;
    overrideMaxCookieTime?: boolean;
  }) {
    let body: Record<string, any> = {
      customer_id: data.customerId
    };
    if (data.referralCode) body.referral_code = data.referralCode;
    if (data.trackingId) body.tracking_id = data.trackingId;
    if (data.clickId) body.click_id = data.clickId;
    if (data.coupon) body.coupon = data.coupon;
    if (data.assetId) body.asset_id = data.assetId;
    if (data.sourceId) body.source_id = data.sourceId;
    if (data.status) body.status = data.status;
    if (data.userAgent) body.user_agent = data.userAgent;
    if (data.ip) body.ip = data.ip;
    if (data.metaData) body.meta_data = data.metaData;

    let res = await this.http.post('/customers/', body, {
      params: data.overrideMaxCookieTime ? { override_max_cookie_time: true } : undefined
    });
    return res.data;
  }

  async updateCustomer(
    customerId: string,
    data: {
      customerId?: string;
      metaData?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (data.customerId) body.customer_id = data.customerId;
    if (data.metaData) body.meta_data = data.metaData;

    let res = await this.http.patch(`/customers/${customerId}/`, body);
    return res.data;
  }

  async deleteCustomer(customerId: string) {
    await this.http.delete(`/customers/${customerId}/`);
  }

  async cancelCustomer(customerId: string) {
    let res = await this.http.delete(`/customers/${customerId}/status/`);
    return res.data;
  }

  async uncancelCustomer(customerId: string) {
    let res = await this.http.put(`/customers/${customerId}/status/`);
    return res.data;
  }

  async getCustomerMetaData(customerId: string) {
    let res = await this.http.get(`/customers/${customerId}/meta-data/`);
    return res.data;
  }

  async setCustomerMetaData(customerId: string, metaData: Record<string, any>) {
    let res = await this.http.put(`/customers/${customerId}/meta-data/`, metaData);
    return res.data;
  }

  // ─── Payments ────────────────────────────────────────────────

  async listBalances(params?: { affiliateId?: string }) {
    let res = await this.http.get('/payments/balances/', {
      params: { affiliate_id: params?.affiliateId }
    });
    return res.data;
  }

  async listPayments(params?: {
    affiliateId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    let res = await this.http.get('/payments/', {
      params: {
        affiliate_id: params?.affiliateId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page
      }
    });
    return res.data;
  }

  async getPayment(paymentId: number) {
    let res = await this.http.get(`/payments/${paymentId}/`);
    return res.data;
  }

  async createPayment(affiliateId: string) {
    let res = await this.http.post('/payments/', { affiliate_id: affiliateId });
    return res.data;
  }

  async cancelPayment(paymentId: number) {
    await this.http.delete(`/payments/${paymentId}/`);
  }

  // ─── Clicks ──────────────────────────────────────────────────

  async listClicks(params?: {
    affiliateId?: string;
    programId?: string;
    assetId?: string;
    sourceId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) {
    let res = await this.http.get('/clicks/', {
      params: {
        affiliate_id: params?.affiliateId,
        program_id: params?.programId,
        asset_id: params?.assetId,
        source_id: params?.sourceId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page
      }
    });
    return res.data;
  }

  async getClick(clickId: string) {
    let res = await this.http.get(`/clicks/${clickId}/`);
    return res.data;
  }

  async createClick(data: {
    referralCode: string;
    assetId?: string;
    sourceId?: string;
    userAgent?: string;
    ip?: string;
  }) {
    let body: Record<string, any> = {
      referral_code: data.referralCode
    };
    if (data.assetId) body.asset_id = data.assetId;
    if (data.sourceId) body.source_id = data.sourceId;
    if (data.userAgent) body.user_agent = data.userAgent;
    if (data.ip) body.ip = data.ip;

    let res = await this.http.post('/clicks/', body);
    return res.data;
  }
}
