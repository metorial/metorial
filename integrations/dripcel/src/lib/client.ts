import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.dripcel.com',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Contacts ──────────────────────────────────────────────

  async getContact(cell: string) {
    let res = await this.axios.get(`/contacts/${encodeURIComponent(cell)}`);
    return res.data;
  }

  async searchContacts(params: {
    find?: {
      cell?: string[];
      tag_ids?: { $in?: string[]; $all?: string[] };
      updatedAt?: { $gte?: string; $lte?: string };
    };
    projection?: Record<string, number>;
    options?: { skip?: number; limit?: number };
  }) {
    let res = await this.axios.post('/contacts/search', params);
    return res.data;
  }

  async createContacts(params: {
    contacts: Record<string, any>[];
    country?: string;
    tag_ids?: string[];
    send?: Record<string, any>;
  }) {
    let res = await this.axios.post('/contacts', params);
    return res.data;
  }

  async upsertContacts(params: {
    contacts: Record<string, any>[];
    country?: string;
    tag_ids?: string[];
    send?: Record<string, any>;
  }) {
    let res = await this.axios.put('/contacts', params);
    return res.data;
  }

  async deleteContact(cell: string) {
    let res = await this.axios.delete(`/contacts/${encodeURIComponent(cell)}`);
    return res.data;
  }

  async optOutContact(
    cell: string,
    params: {
      campaignIds?: string[];
      all?: boolean;
      createMissingContact?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.campaignIds) body.campaign_ids = params.campaignIds;
    if (params.all !== undefined) body.all = params.all;
    if (params.createMissingContact !== undefined)
      body.create_missing_contact = params.createMissingContact;
    let res = await this.axios.post(`/contacts/${encodeURIComponent(cell)}/optOut`, body);
    return res.data;
  }

  async addTagsToContact(
    cell: string,
    params: {
      tagIds?: string[];
      tags?: string[];
      createMissingContact?: boolean;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.tagIds) body.tag_ids = params.tagIds;
    if (params.tags) body.tags = params.tags;
    if (params.createMissingContact !== undefined)
      body.create_missing_contact = params.createMissingContact;
    let res = await this.axios.put(`/contacts/${encodeURIComponent(cell)}/tag/add`, body);
    return res.data;
  }

  async removeTagsFromContact(
    cell: string,
    params: {
      tagIds?: string[];
      tags?: string[];
    }
  ) {
    let body: Record<string, any> = {};
    if (params.tagIds) body.tag_ids = params.tagIds;
    if (params.tags) body.tags = params.tags;
    let res = await this.axios.put(`/contacts/${encodeURIComponent(cell)}/tag/remove`, body);
    return res.data;
  }

  async bulkUpdateContacts(params: {
    find: {
      cell?: string[];
      tag_ids?: { $in?: string[]; $all?: string[] };
    };
    update: Record<string, any>;
  }) {
    let res = await this.axios.post('/contacts/update', params);
    return res.data;
  }

  // ── SMS ───────────────────────────────────────────────────

  async sendSms(params: {
    content: string;
    cell: string;
    country: string;
    deliveryMethod: 'reverse' | 'standard' | 'transactional';
    skipNonContacts: boolean;
    campaignId?: string;
    sendOptions?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      content: params.content,
      cell: params.cell,
      country: params.country,
      deliveryMethod: params.deliveryMethod,
      skipNonContacts: params.skipNonContacts
    };
    if (params.campaignId) body.campaign_id = params.campaignId;
    if (params.sendOptions) body.sendOptions = params.sendOptions;
    let res = await this.axios.post('/send/sms', body);
    return res.data;
  }

  // ── Email ─────────────────────────────────────────────────

  async sendBulkEmail(params: {
    from: string;
    templateId: string;
    destinations: string[];
    filterNonContacts?: boolean;
    toStartAt?: string;
  }) {
    let body: Record<string, any> = {
      from: params.from,
      template_id: params.templateId,
      destinations: params.destinations
    };
    if (params.filterNonContacts !== undefined)
      body.filter_non_contacts = params.filterNonContacts;
    if (params.toStartAt) body.to_start_at = params.toStartAt;
    let res = await this.axios.post('/send/email/bulk', body);
    return res.data;
  }

  async getEmailTemplates() {
    let res = await this.axios.get('/email/templates');
    return res.data;
  }

  // ── Campaigns ─────────────────────────────────────────────

  async getCampaigns() {
    let res = await this.axios.get('/campaigns');
    return res.data;
  }

  async getCampaign(campaignId: string) {
    let res = await this.axios.get(`/campaigns/${encodeURIComponent(campaignId)}`);
    return res.data;
  }

  // ── Deliveries ────────────────────────────────────────────

  async getDeliveries(params: { cell?: string; customerId?: string }) {
    let queryParams: Record<string, string> = {};
    if (params.cell) queryParams.cell = params.cell;
    if (params.customerId) queryParams.customerId = params.customerId;
    let res = await this.axios.get('/deliveries', { params: queryParams });
    return res.data;
  }

  // ── Send Logs ─────────────────────────────────────────────

  async getSendLog(sendId: string, groupDestinations?: 'count' | 'list') {
    let params: Record<string, string> = {};
    if (groupDestinations) params.group_destinations = groupDestinations;
    let res = await this.axios.get(`/send-logs/${encodeURIComponent(sendId)}`, { params });
    return res.data;
  }

  async searchSendLogs(params: {
    find?: {
      campaignId?: string[];
      startDeliveryAt?: { $gte?: string; $lte?: string };
    };
    options?: { skip?: number; limit?: number };
  }) {
    let body: Record<string, any> = {};
    if (params.find) {
      body.find = {};
      if (params.find.campaignId) body.find.campaign_id = params.find.campaignId;
      if (params.find.startDeliveryAt) body.find.startDeliveryAt = params.find.startDeliveryAt;
    }
    if (params.options) body.options = params.options;
    let res = await this.axios.post('/send-logs/search', body);
    return res.data;
  }

  // ── Replies ───────────────────────────────────────────────

  async searchReplies(params: {
    replyId?: string | string[];
    message?: string;
    kind?: string | string[];
    msisdn?: string | string[];
    campaignId?: string | string[];
    userReference?: string | string[];
    received?: { $gte?: string; $lte?: string };
  }) {
    let body: Record<string, any> = {};
    if (params.replyId) body._id = params.replyId;
    if (params.message) body.Message = params.message;
    if (params.kind) body.kind = params.kind;
    if (params.msisdn) body.Msisdn = params.msisdn;
    if (params.campaignId) body.campaign_id = params.campaignId;
    if (params.userReference) body.UserReference = params.userReference;
    if (params.received) body.Received = params.received;
    let res = await this.axios.post('/replies/search', body);
    return res.data;
  }

  // ── Sales ─────────────────────────────────────────────────

  async uploadSales(
    sales: Array<{
      campaignId: string;
      cell: string;
      sendId?: string;
      clickId?: string;
      soldAt?: string;
      saleValue?: number;
    }>
  ) {
    let body = sales.map(s => {
      let entry: Record<string, any> = {
        campaign_id: s.campaignId,
        cell: s.cell
      };
      if (s.sendId) entry.send_id = s.sendId;
      if (s.clickId) entry.click_id = s.clickId;
      if (s.soldAt) entry.soldAt = s.soldAt;
      if (s.saleValue !== undefined) entry.saleValue = s.saleValue;
      return entry;
    });
    let res = await this.axios.post('/sales', body);
    return res.data;
  }

  // ── Tags ──────────────────────────────────────────────────

  async getTags() {
    let res = await this.axios.get('/tags');
    return res.data;
  }

  async getTag(tagId: string) {
    let res = await this.axios.get(`/tags/${encodeURIComponent(tagId)}`);
    return res.data;
  }

  async deleteTag(tagId: string) {
    let res = await this.axios.delete(`/tags/${encodeURIComponent(tagId)}`);
    return res.data;
  }

  // ── Compliance ────────────────────────────────────────────

  async checkCompliance(params: { cells: string[]; country: string; campaignId?: string }) {
    let queryParams: Record<string, string> = {};
    if (params.campaignId) queryParams.campaign_id = params.campaignId;
    let res = await this.axios.post(
      '/compliance/send',
      {
        cells: params.cells,
        country: params.country
      },
      { params: queryParams }
    );
    return res.data;
  }

  // ── Exchange Transactions ─────────────────────────────────

  async updateTransactionStatus(transactionId: string, status: 'completed' | 'rejected') {
    let res = await this.axios.put(
      `/exchange/buyer/transaction/${encodeURIComponent(transactionId)}/status`,
      { status }
    );
    return res.data;
  }

  async searchTransactions(params: {
    transactionId?: string | string[];
    status?: 'pending' | 'completed' | 'rejected';
    offerId?: string | string[];
    createdAt?: { $gte?: string; $lte?: string };
  }) {
    let body: Record<string, any> = {};
    if (params.transactionId) body._id = params.transactionId;
    if (params.status) body.status = params.status;
    if (params.offerId) body.offer_id = params.offerId;
    if (params.createdAt) body.createdAt = params.createdAt;
    let res = await this.axios.post('/exchange/buyer/transaction/search', body);
    return res.data;
  }

  // ── Balance ───────────────────────────────────────────────

  async getBalance() {
    let res = await this.axios.get('/balance');
    return res.data;
  }
}
