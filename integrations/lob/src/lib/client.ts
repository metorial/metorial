import { createAxios } from 'slates';

let BASE_URL = 'https://api.lob.com/v1';

export interface LobListParams {
  limit?: number;
  offset?: number;
  include?: string[];
  dateCreated?: Record<string, string>;
  metadata?: Record<string, string>;
  sortBy?: Record<string, string>;
}

export interface LobAddress {
  name?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  phone?: string;
  email?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    let encoded = Buffer.from(`${config.token}:`).toString('base64');
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ==================== Addresses ====================

  async createAddress(params: {
    name?: string;
    company?: string;
    addressLine1: string;
    addressLine2?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    addressCountry?: string;
    phone?: string;
    email?: string;
    metadata?: Record<string, string>;
    description?: string;
  }) {
    let body: Record<string, any> = {
      address_line1: params.addressLine1
    };
    if (params.name) body.name = params.name;
    if (params.company) body.company = params.company;
    if (params.addressLine2) body.address_line2 = params.addressLine2;
    if (params.addressCity) body.address_city = params.addressCity;
    if (params.addressState) body.address_state = params.addressState;
    if (params.addressZip) body.address_zip = params.addressZip;
    if (params.addressCountry) body.address_country = params.addressCountry;
    if (params.phone) body.phone = params.phone;
    if (params.email) body.email = params.email;
    if (params.metadata) body.metadata = params.metadata;
    if (params.description) body.description = params.description;
    let res = await this.axios.post('/addresses', body);
    return res.data;
  }

  async getAddress(addressId: string) {
    let res = await this.axios.get(`/addresses/${addressId}`);
    return res.data;
  }

  async listAddresses(params?: LobListParams) {
    let res = await this.axios.get('/addresses', { params: this.buildListParams(params) });
    return res.data;
  }

  async deleteAddress(addressId: string) {
    let res = await this.axios.delete(`/addresses/${addressId}`);
    return res.data;
  }

  // ==================== Postcards ====================

  async createPostcard(params: {
    to: string | Record<string, any>;
    from?: string | Record<string, any>;
    front: string;
    back: string;
    size?: string;
    description?: string;
    metadata?: Record<string, string>;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    mailType?: string;
    billingGroupId?: string;
    qrCode?: Record<string, any>;
    useType?: string;
  }) {
    let body: Record<string, any> = {
      to: params.to,
      front: params.front,
      back: params.back
    };
    if (params.from) body.from = params.from;
    if (params.size) body.size = params.size;
    if (params.description) body.description = params.description;
    if (params.metadata) body.metadata = params.metadata;
    if (params.mergeVariables) body.merge_variables = params.mergeVariables;
    if (params.sendDate) body.send_date = params.sendDate;
    if (params.mailType) body.mail_type = params.mailType;
    if (params.billingGroupId) body.billing_group_id = params.billingGroupId;
    if (params.qrCode) body.qr_code = params.qrCode;
    if (params.useType) body.use_type = params.useType;
    let res = await this.axios.post('/postcards', body);
    return res.data;
  }

  async getPostcard(postcardId: string) {
    let res = await this.axios.get(`/postcards/${postcardId}`);
    return res.data;
  }

  async listPostcards(params?: LobListParams) {
    let res = await this.axios.get('/postcards', { params: this.buildListParams(params) });
    return res.data;
  }

  async cancelPostcard(postcardId: string) {
    let res = await this.axios.delete(`/postcards/${postcardId}`);
    return res.data;
  }

  // ==================== Letters ====================

  async createLetter(params: {
    to: string | Record<string, any>;
    from: string | Record<string, any>;
    file: string;
    color: boolean;
    description?: string;
    metadata?: Record<string, string>;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    doubleSided?: boolean;
    addressPlacement?: string;
    returnEnvelope?: boolean | string;
    perforatedPage?: number;
    customEnvelope?: string;
    mailType?: string;
    extraService?: string;
    billingGroupId?: string;
    qrCode?: Record<string, any>;
    useType?: string;
    cards?: string[];
  }) {
    let body: Record<string, any> = {
      to: params.to,
      from: params.from,
      file: params.file,
      color: params.color
    };
    if (params.description) body.description = params.description;
    if (params.metadata) body.metadata = params.metadata;
    if (params.mergeVariables) body.merge_variables = params.mergeVariables;
    if (params.sendDate) body.send_date = params.sendDate;
    if (params.doubleSided !== undefined) body.double_sided = params.doubleSided;
    if (params.addressPlacement) body.address_placement = params.addressPlacement;
    if (params.returnEnvelope !== undefined) body.return_envelope = params.returnEnvelope;
    if (params.perforatedPage) body.perforated_page = params.perforatedPage;
    if (params.customEnvelope) body.custom_envelope = params.customEnvelope;
    if (params.mailType) body.mail_type = params.mailType;
    if (params.extraService) body.extra_service = params.extraService;
    if (params.billingGroupId) body.billing_group_id = params.billingGroupId;
    if (params.qrCode) body.qr_code = params.qrCode;
    if (params.useType) body.use_type = params.useType;
    if (params.cards) body.cards = params.cards;
    let res = await this.axios.post('/letters', body);
    return res.data;
  }

  async getLetter(letterId: string) {
    let res = await this.axios.get(`/letters/${letterId}`);
    return res.data;
  }

  async listLetters(params?: LobListParams) {
    let res = await this.axios.get('/letters', { params: this.buildListParams(params) });
    return res.data;
  }

  async cancelLetter(letterId: string) {
    let res = await this.axios.delete(`/letters/${letterId}`);
    return res.data;
  }

  // ==================== Self-Mailers ====================

  async createSelfMailer(params: {
    to: string | Record<string, any>;
    from?: string | Record<string, any>;
    inside: string;
    outside: string;
    size?: string;
    description?: string;
    metadata?: Record<string, string>;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    mailType?: string;
    billingGroupId?: string;
    qrCode?: Record<string, any>;
    useType?: string;
  }) {
    let body: Record<string, any> = {
      to: params.to,
      inside: params.inside,
      outside: params.outside
    };
    if (params.from) body.from = params.from;
    if (params.size) body.size = params.size;
    if (params.description) body.description = params.description;
    if (params.metadata) body.metadata = params.metadata;
    if (params.mergeVariables) body.merge_variables = params.mergeVariables;
    if (params.sendDate) body.send_date = params.sendDate;
    if (params.mailType) body.mail_type = params.mailType;
    if (params.billingGroupId) body.billing_group_id = params.billingGroupId;
    if (params.qrCode) body.qr_code = params.qrCode;
    if (params.useType) body.use_type = params.useType;
    let res = await this.axios.post('/self_mailers', body);
    return res.data;
  }

  async getSelfMailer(selfMailerId: string) {
    let res = await this.axios.get(`/self_mailers/${selfMailerId}`);
    return res.data;
  }

  async listSelfMailers(params?: LobListParams) {
    let res = await this.axios.get('/self_mailers', { params: this.buildListParams(params) });
    return res.data;
  }

  async cancelSelfMailer(selfMailerId: string) {
    let res = await this.axios.delete(`/self_mailers/${selfMailerId}`);
    return res.data;
  }

  // ==================== Checks ====================

  async createCheck(params: {
    to: string | Record<string, any>;
    from: string | Record<string, any>;
    bankAccountId: string;
    amount: number;
    memo?: string;
    checkNumber?: number;
    message?: string;
    description?: string;
    metadata?: Record<string, string>;
    mergeVariables?: Record<string, any>;
    sendDate?: string;
    mailType?: string;
    billingGroupId?: string;
    logo?: string;
    checkBottom?: string;
    attachment?: string;
    useType?: string;
  }) {
    let body: Record<string, any> = {
      to: params.to,
      from: params.from,
      bank_account: params.bankAccountId,
      amount: params.amount
    };
    if (params.memo) body.memo = params.memo;
    if (params.checkNumber) body.check_number = params.checkNumber;
    if (params.message) body.message = params.message;
    if (params.description) body.description = params.description;
    if (params.metadata) body.metadata = params.metadata;
    if (params.mergeVariables) body.merge_variables = params.mergeVariables;
    if (params.sendDate) body.send_date = params.sendDate;
    if (params.mailType) body.mail_type = params.mailType;
    if (params.billingGroupId) body.billing_group_id = params.billingGroupId;
    if (params.logo) body.logo = params.logo;
    if (params.checkBottom) body.check_bottom = params.checkBottom;
    if (params.attachment) body.attachment = params.attachment;
    if (params.useType) body.use_type = params.useType;
    let res = await this.axios.post('/checks', body);
    return res.data;
  }

  async getCheck(checkId: string) {
    let res = await this.axios.get(`/checks/${checkId}`);
    return res.data;
  }

  async listChecks(params?: LobListParams) {
    let res = await this.axios.get('/checks', { params: this.buildListParams(params) });
    return res.data;
  }

  async cancelCheck(checkId: string) {
    let res = await this.axios.delete(`/checks/${checkId}`);
    return res.data;
  }

  // ==================== Templates ====================

  async createTemplate(params: {
    html: string;
    description?: string;
    metadata?: Record<string, string>;
    engine?: string;
  }) {
    let body: Record<string, any> = {
      html: params.html
    };
    if (params.description) body.description = params.description;
    if (params.metadata) body.metadata = params.metadata;
    if (params.engine) body.engine = params.engine;
    let res = await this.axios.post('/templates', body);
    return res.data;
  }

  async getTemplate(templateId: string) {
    let res = await this.axios.get(`/templates/${templateId}`);
    return res.data;
  }

  async listTemplates(params?: LobListParams) {
    let res = await this.axios.get('/templates', { params: this.buildListParams(params) });
    return res.data;
  }

  async updateTemplate(
    templateId: string,
    params: {
      description?: string;
      publishedVersion?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.description) body.description = params.description;
    if (params.publishedVersion) body.published_version = params.publishedVersion;
    let res = await this.axios.post(`/templates/${templateId}`, body);
    return res.data;
  }

  async deleteTemplate(templateId: string) {
    let res = await this.axios.delete(`/templates/${templateId}`);
    return res.data;
  }

  async createTemplateVersion(
    templateId: string,
    params: {
      html: string;
      description?: string;
      engine?: string;
    }
  ) {
    let body: Record<string, any> = {
      html: params.html
    };
    if (params.description) body.description = params.description;
    if (params.engine) body.engine = params.engine;
    let res = await this.axios.post(`/templates/${templateId}/versions`, body);
    return res.data;
  }

  async getTemplateVersion(templateId: string, versionId: string) {
    let res = await this.axios.get(`/templates/${templateId}/versions/${versionId}`);
    return res.data;
  }

  async listTemplateVersions(templateId: string, params?: LobListParams) {
    let res = await this.axios.get(`/templates/${templateId}/versions`, {
      params: this.buildListParams(params)
    });
    return res.data;
  }

  async updateTemplateVersion(
    templateId: string,
    versionId: string,
    params: {
      description?: string;
      engine?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.description) body.description = params.description;
    if (params.engine) body.engine = params.engine;
    let res = await this.axios.post(`/templates/${templateId}/versions/${versionId}`, body);
    return res.data;
  }

  async deleteTemplateVersion(templateId: string, versionId: string) {
    let res = await this.axios.delete(`/templates/${templateId}/versions/${versionId}`);
    return res.data;
  }

  // ==================== Bank Accounts ====================

  async createBankAccount(params: {
    routingNumber: string;
    accountNumber: string;
    accountType: string;
    signatory: string;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    let body: Record<string, any> = {
      routing_number: params.routingNumber,
      account_number: params.accountNumber,
      account_type: params.accountType,
      signatory: params.signatory
    };
    if (params.description) body.description = params.description;
    if (params.metadata) body.metadata = params.metadata;
    let res = await this.axios.post('/bank_accounts', body);
    return res.data;
  }

  async verifyBankAccount(bankAccountId: string, amounts: [number, number]) {
    let res = await this.axios.post(`/bank_accounts/${bankAccountId}/verify`, {
      amounts
    });
    return res.data;
  }

  async getBankAccount(bankAccountId: string) {
    let res = await this.axios.get(`/bank_accounts/${bankAccountId}`);
    return res.data;
  }

  async listBankAccounts(params?: LobListParams) {
    let res = await this.axios.get('/bank_accounts', { params: this.buildListParams(params) });
    return res.data;
  }

  async deleteBankAccount(bankAccountId: string) {
    let res = await this.axios.delete(`/bank_accounts/${bankAccountId}`);
    return res.data;
  }

  // ==================== US Verifications ====================

  async verifyUSAddress(params: {
    primaryLine?: string;
    secondaryLine?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    recipient?: string;
    urbanization?: string;
    address?: string;
  }) {
    let body: Record<string, any> = {};
    if (params.primaryLine) body.primary_line = params.primaryLine;
    if (params.secondaryLine) body.secondary_line = params.secondaryLine;
    if (params.city) body.city = params.city;
    if (params.state) body.state = params.state;
    if (params.zipCode) body.zip_code = params.zipCode;
    if (params.recipient) body.recipient = params.recipient;
    if (params.urbanization) body.urbanization = params.urbanization;
    if (params.address) body.address = params.address;
    let res = await this.axios.post('/us_verifications', body);
    return res.data;
  }

  async bulkVerifyUSAddresses(
    addresses: Array<{
      primaryLine?: string;
      secondaryLine?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      recipient?: string;
      urbanization?: string;
    }>
  ) {
    let body = {
      addresses: addresses.map(a => ({
        primary_line: a.primaryLine,
        secondary_line: a.secondaryLine,
        city: a.city,
        state: a.state,
        zip_code: a.zipCode,
        recipient: a.recipient,
        urbanization: a.urbanization
      }))
    };
    let res = await this.axios.post('/bulk/us_verifications', body);
    return res.data;
  }

  async autocompleteUSAddress(params: {
    addressPrefix: string;
    city?: string;
    state?: string;
    zipCode?: string;
    geoIpSort?: boolean;
  }) {
    let body: Record<string, any> = {
      address_prefix: params.addressPrefix
    };
    if (params.city) body.city = params.city;
    if (params.state) body.state = params.state;
    if (params.zipCode) body.zip_code = params.zipCode;
    if (params.geoIpSort !== undefined) body.geo_ip_sort = params.geoIpSort;
    let res = await this.axios.post('/us_autocompletions', body);
    return res.data;
  }

  async reverseGeocodeLookup(params: { latitude: number; longitude: number }) {
    let res = await this.axios.post('/us_reverse_geocode_lookups', {
      latitude: params.latitude,
      longitude: params.longitude
    });
    return res.data;
  }

  async zipCodeLookup(params: { zipCode: string }) {
    let res = await this.axios.get(`/us_zip_lookups/${params.zipCode}`);
    return res.data;
  }

  // ==================== International Verifications ====================

  async verifyInternationalAddress(params: {
    primaryLine?: string;
    secondaryLine?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
    recipient?: string;
    address?: string;
  }) {
    let body: Record<string, any> = {
      country: params.country
    };
    if (params.primaryLine) body.primary_line = params.primaryLine;
    if (params.secondaryLine) body.secondary_line = params.secondaryLine;
    if (params.city) body.city = params.city;
    if (params.state) body.state = params.state;
    if (params.postalCode) body.postal_code = params.postalCode;
    if (params.recipient) body.recipient = params.recipient;
    if (params.address) body.address = params.address;
    let res = await this.axios.post('/intl_verifications', body);
    return res.data;
  }

  // ==================== Campaigns ====================

  async createCampaign(params: {
    name: string;
    description?: string;
    scheduleSendDate?: string;
    useType?: string;
  }) {
    let body: Record<string, any> = {
      name: params.name
    };
    if (params.description) body.description = params.description;
    if (params.scheduleSendDate) body.schedule_send_date = params.scheduleSendDate;
    if (params.useType) body.use_type = params.useType;
    let res = await this.axios.post('/campaigns', body);
    return res.data;
  }

  async getCampaign(campaignId: string) {
    let res = await this.axios.get(`/campaigns/${campaignId}`);
    return res.data;
  }

  async listCampaigns(params?: LobListParams) {
    let res = await this.axios.get('/campaigns', { params: this.buildListParams(params) });
    return res.data;
  }

  async updateCampaign(
    campaignId: string,
    params: {
      name?: string;
      description?: string;
      scheduleSendDate?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.name) body.name = params.name;
    if (params.description) body.description = params.description;
    if (params.scheduleSendDate) body.schedule_send_date = params.scheduleSendDate;
    let res = await this.axios.patch(`/campaigns/${campaignId}`, body);
    return res.data;
  }

  async sendCampaign(campaignId: string) {
    let res = await this.axios.post(`/campaigns/${campaignId}/send`);
    return res.data;
  }

  async deleteCampaign(campaignId: string) {
    let res = await this.axios.delete(`/campaigns/${campaignId}`);
    return res.data;
  }

  // ==================== Webhooks ====================

  async createWebhook(params: {
    url: string;
    eventTypes: Array<{ id: string; enabledForTest?: boolean }>;
    description?: string;
  }) {
    let body: Record<string, any> = {
      url: params.url,
      event_types: params.eventTypes.map(e => ({
        id: e.id,
        enabled_for_test: e.enabledForTest
      }))
    };
    if (params.description) body.description = params.description;
    let res = await this.axios.post('/webhooks', body);
    return res.data;
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async listWebhooks() {
    let res = await this.axios.get('/webhooks');
    return res.data;
  }

  async updateWebhook(
    webhookId: string,
    params: {
      eventTypes?: Array<{ id: string; enabledForTest?: boolean }>;
      description?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.eventTypes)
      body.event_types = params.eventTypes.map(e => ({
        id: e.id,
        enabled_for_test: e.enabledForTest
      }));
    if (params.description) body.description = params.description;
    let res = await this.axios.patch(`/webhooks/${webhookId}`, body);
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }

  // ==================== Billing Groups ====================

  async createBillingGroup(params: { name: string; description?: string }) {
    let body: Record<string, any> = {
      name: params.name
    };
    if (params.description) body.description = params.description;
    let res = await this.axios.post('/billing_groups', body);
    return res.data;
  }

  async getBillingGroup(billingGroupId: string) {
    let res = await this.axios.get(`/billing_groups/${billingGroupId}`);
    return res.data;
  }

  async listBillingGroups(params?: LobListParams) {
    let res = await this.axios.get('/billing_groups', {
      params: this.buildListParams(params)
    });
    return res.data;
  }

  async updateBillingGroup(
    billingGroupId: string,
    params: {
      name?: string;
      description?: string;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.name) body.name = params.name;
    if (params.description) body.description = params.description;
    let res = await this.axios.post(`/billing_groups/${billingGroupId}`, body);
    return res.data;
  }

  // ==================== Events ====================

  async listEvents(params?: {
    limit?: number;
    offset?: number;
    dateCreated?: Record<string, string>;
  }) {
    let res = await this.axios.get('/events', { params: this.buildListParams(params) });
    return res.data;
  }

  // ==================== Helpers ====================

  private buildListParams(params?: Record<string, any>): Record<string, any> {
    if (!params) return {};
    let result: Record<string, any> = {};
    if (params.limit) result.limit = params.limit;
    if (params.offset) result.offset = params.offset;
    if (params.include) result['include[]'] = params.include;
    if (params.metadata) {
      for (let [key, value] of Object.entries(params.metadata)) {
        result[`metadata[${key}]`] = value;
      }
    }
    if (params.dateCreated) {
      for (let [key, value] of Object.entries(params.dateCreated)) {
        result[`date_created[${key}]`] = value;
      }
    }
    if (params.sortBy) {
      for (let [key, value] of Object.entries(params.sortBy)) {
        result[`sort_by[${key}]`] = value;
      }
    }
    return result;
  }
}
