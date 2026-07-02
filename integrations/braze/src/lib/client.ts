import { createAxios } from 'slates';

export class BrazeClient {
  private axios;

  constructor(private options: { token: string; instanceUrl: string }) {
    let baseURL = options.instanceUrl.replace(/\/+$/, '');
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${options.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── User Data ───────────────────────────────────────────────

  async trackUsers(params: {
    attributes?: Record<string, any>[];
    events?: Record<string, any>[];
    purchases?: Record<string, any>[];
  }) {
    let resp = await this.axios.post('/users/track', params);
    return resp.data;
  }

  async deleteUsers(params: {
    externalIds?: string[];
    brazeIds?: string[];
    userAliases?: { aliasName: string; aliasLabel: string }[];
  }) {
    let body: Record<string, any> = {};
    if (params.externalIds) body.external_ids = params.externalIds;
    if (params.brazeIds) body.braze_ids = params.brazeIds;
    if (params.userAliases)
      body.user_aliases = params.userAliases.map(a => ({
        alias_name: a.aliasName,
        alias_label: a.aliasLabel
      }));
    let resp = await this.axios.post('/users/delete', body);
    return resp.data;
  }

  async identifyUsers(
    aliases: {
      externalId: string;
      userAlias: { aliasName: string; aliasLabel: string };
    }[]
  ) {
    let resp = await this.axios.post('/users/identify', {
      aliases_to_identify: aliases.map(a => ({
        external_id: a.externalId,
        user_alias: {
          alias_name: a.userAlias.aliasName,
          alias_label: a.userAlias.aliasLabel
        }
      }))
    });
    return resp.data;
  }

  async createUserAliases(
    aliases: {
      externalId: string;
      aliasName: string;
      aliasLabel: string;
    }[]
  ) {
    let resp = await this.axios.post('/users/alias/new', {
      user_aliases: aliases.map(a => ({
        external_id: a.externalId,
        alias_name: a.aliasName,
        alias_label: a.aliasLabel
      }))
    });
    return resp.data;
  }

  async mergeUsers(
    mergeUpdates: {
      identifierToKeep: Record<string, any>;
      identifierToMerge: Record<string, any>;
    }[]
  ) {
    let resp = await this.axios.post('/users/merge', {
      merge_updates: mergeUpdates.map(m => ({
        identifier_to_keep: m.identifierToKeep,
        identifier_to_merge: m.identifierToMerge
      }))
    });
    return resp.data;
  }

  async exportUsersByIds(params: {
    externalIds?: string[];
    brazeIds?: string[];
    userAliases?: { aliasName: string; aliasLabel: string }[];
    emails?: string[];
    phones?: string[];
    fieldsToExport?: string[];
  }) {
    let body: Record<string, any> = {};
    if (params.externalIds) body.external_ids = params.externalIds;
    if (params.brazeIds) body.braze_ids = params.brazeIds;
    if (params.userAliases)
      body.user_aliases = params.userAliases.map(a => ({
        alias_name: a.aliasName,
        alias_label: a.aliasLabel
      }));
    if (params.emails) body.email_address = params.emails;
    if (params.phones) body.phone = params.phones;
    if (params.fieldsToExport) body.fields_to_export = params.fieldsToExport;
    let resp = await this.axios.post('/users/export/ids', body);
    return resp.data;
  }

  async exportUsersBySegment(segmentId: string, fieldsToExport?: string[]) {
    let body: Record<string, any> = { segment_id: segmentId };
    if (fieldsToExport) body.fields_to_export = fieldsToExport;
    let resp = await this.axios.post('/users/export/segment', body);
    return resp.data;
  }

  // ─── Messaging ───────────────────────────────────────────────

  async sendMessages(params: {
    externalUserIds?: string[];
    segmentId?: string;
    broadcast?: boolean;
    messages?: Record<string, any>;
    overrideMessageSettings?: Record<string, any>;
  }) {
    let body: Record<string, any> = {};
    if (params.externalUserIds) body.external_user_ids = params.externalUserIds;
    if (params.broadcast !== undefined) body.broadcast = params.broadcast;
    if (params.messages) body.messages = params.messages;
    let resp = await this.axios.post('/messages/send', body);
    return resp.data;
  }

  async triggerCampaignSend(params: {
    campaignId: string;
    recipients?: {
      externalUserId?: string;
      triggerProperties?: Record<string, any>;
      sendToExistingOnly?: boolean;
      attributes?: Record<string, any>;
    }[];
    broadcast?: boolean;
    triggerProperties?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      campaign_id: params.campaignId
    };
    if (params.broadcast !== undefined) body.broadcast = params.broadcast;
    if (params.triggerProperties) body.trigger_properties = params.triggerProperties;
    if (params.recipients) {
      body.recipients = params.recipients.map(r => {
        let rec: Record<string, any> = {};
        if (r.externalUserId) rec.external_user_id = r.externalUserId;
        if (r.triggerProperties) rec.trigger_properties = r.triggerProperties;
        if (r.sendToExistingOnly !== undefined)
          rec.send_to_existing_only = r.sendToExistingOnly;
        if (r.attributes) rec.attributes = r.attributes;
        return rec;
      });
    }
    let resp = await this.axios.post('/campaigns/trigger/send', body);
    return resp.data;
  }

  async triggerCanvasSend(params: {
    canvasId: string;
    recipients?: {
      externalUserId?: string;
      canvasEntryProperties?: Record<string, any>;
      sendToExistingOnly?: boolean;
    }[];
    broadcast?: boolean;
    canvasEntryProperties?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      canvas_id: params.canvasId
    };
    if (params.broadcast !== undefined) body.broadcast = params.broadcast;
    if (params.canvasEntryProperties)
      body.canvas_entry_properties = params.canvasEntryProperties;
    if (params.recipients) {
      body.recipients = params.recipients.map(r => {
        let rec: Record<string, any> = {};
        if (r.externalUserId) rec.external_user_id = r.externalUserId;
        if (r.canvasEntryProperties) rec.canvas_entry_properties = r.canvasEntryProperties;
        if (r.sendToExistingOnly !== undefined)
          rec.send_to_existing_only = r.sendToExistingOnly;
        return rec;
      });
    }
    let resp = await this.axios.post('/canvas/trigger/send', body);
    return resp.data;
  }

  // ─── Schedule Messages ──────────────────────────────────────

  async scheduleMessage(params: {
    broadcast?: boolean;
    externalUserIds?: string[];
    messages?: Record<string, any>;
    schedule: { time: string; inLocalTime?: boolean };
  }) {
    let body: Record<string, any> = {
      schedule: { time: params.schedule.time }
    };
    if (params.schedule.inLocalTime !== undefined)
      body.schedule.in_local_time = params.schedule.inLocalTime;
    if (params.broadcast !== undefined) body.broadcast = params.broadcast;
    if (params.externalUserIds) body.external_user_ids = params.externalUserIds;
    if (params.messages) body.messages = params.messages;
    let resp = await this.axios.post('/messages/schedule/create', body);
    return resp.data;
  }

  async deleteScheduledMessage(scheduleId: string) {
    let resp = await this.axios.post('/messages/schedule/delete', {
      schedule_id: scheduleId
    });
    return resp.data;
  }

  async listScheduledBroadcasts(endTime: string) {
    let resp = await this.axios.get('/messages/scheduled_broadcasts', {
      params: { end_time: endTime }
    });
    return resp.data;
  }

  // ─── Campaigns ──────────────────────────────────────────────

  async listCampaigns(params?: {
    page?: number;
    includeArchived?: boolean;
    sortDirection?: string;
    lastEditTimeGt?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.includeArchived !== undefined)
      queryParams.include_archived = params.includeArchived;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.lastEditTimeGt) queryParams['last_edit.time[gt]'] = params.lastEditTimeGt;
    let resp = await this.axios.get('/campaigns/list', { params: queryParams });
    return resp.data;
  }

  async getCampaignDetails(campaignId: string) {
    let resp = await this.axios.get('/campaigns/details', {
      params: { campaign_id: campaignId }
    });
    return resp.data;
  }

  async getCampaignAnalytics(campaignId: string, length: number, endingAt?: string) {
    let params: Record<string, any> = {
      campaign_id: campaignId,
      length
    };
    if (endingAt) params.ending_at = endingAt;
    let resp = await this.axios.get('/campaigns/data_series', { params });
    return resp.data;
  }

  // ─── Canvas ─────────────────────────────────────────────────

  async listCanvases(params?: {
    page?: number;
    includeArchived?: boolean;
    sortDirection?: string;
    lastEditTimeGt?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.includeArchived !== undefined)
      queryParams.include_archived = params.includeArchived;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.lastEditTimeGt) queryParams['last_edit.time[gt]'] = params.lastEditTimeGt;
    let resp = await this.axios.get('/canvas/list', { params: queryParams });
    return resp.data;
  }

  async getCanvasDetails(canvasId: string) {
    let resp = await this.axios.get('/canvas/details', {
      params: { canvas_id: canvasId }
    });
    return resp.data;
  }

  async getCanvasAnalytics(
    canvasId: string,
    length: number,
    endingAt?: string,
    includeVariantBreakdown?: boolean,
    includeStepBreakdown?: boolean
  ) {
    let params: Record<string, any> = {
      canvas_id: canvasId,
      length
    };
    if (endingAt) params.ending_at = endingAt;
    if (includeVariantBreakdown !== undefined)
      params.include_variant_breakdown = includeVariantBreakdown;
    if (includeStepBreakdown !== undefined)
      params.include_step_breakdown = includeStepBreakdown;
    let resp = await this.axios.get('/canvas/data_series', { params });
    return resp.data;
  }

  // ─── Segments ───────────────────────────────────────────────

  async listSegments(params?: { page?: number; sortDirection?: string }) {
    let queryParams: Record<string, any> = {};
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    let resp = await this.axios.get('/segments/list', { params: queryParams });
    return resp.data;
  }

  async getSegmentDetails(segmentId: string) {
    let resp = await this.axios.get('/segments/details', {
      params: { segment_id: segmentId }
    });
    return resp.data;
  }

  async getSegmentAnalytics(segmentId: string, length: number) {
    let resp = await this.axios.get('/segments/data_series', {
      params: { segment_id: segmentId, length }
    });
    return resp.data;
  }

  // ─── Subscription Groups ────────────────────────────────────

  async setSubscriptionStatus(params: {
    subscriptionGroupId: string;
    subscriptionState: string;
    externalIds?: string[];
    emails?: string[];
    phones?: string[];
  }) {
    let body: Record<string, any> = {
      subscription_group_id: params.subscriptionGroupId,
      subscription_state: params.subscriptionState
    };
    if (params.externalIds) body.external_id = params.externalIds;
    if (params.emails) body.email = params.emails;
    if (params.phones) body.phone = params.phones;
    let resp = await this.axios.post('/subscription/status/set', body);
    return resp.data;
  }

  async getSubscriptionStatus(params: {
    subscriptionGroupId: string;
    externalId?: string;
    email?: string;
    phone?: string;
  }) {
    let queryParams: Record<string, any> = {
      subscription_group_id: params.subscriptionGroupId
    };
    if (params.externalId) queryParams.external_id = params.externalId;
    if (params.email) queryParams.email = params.email;
    if (params.phone) queryParams.phone = params.phone;
    let resp = await this.axios.get('/subscription/status/get', { params: queryParams });
    return resp.data;
  }

  async getUserSubscriptionGroups(params: {
    externalId?: string;
    email?: string;
    phone?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params.externalId) queryParams.external_id = params.externalId;
    if (params.email) queryParams.email = params.email;
    if (params.phone) queryParams.phone = params.phone;
    let resp = await this.axios.get('/subscription/user/status', { params: queryParams });
    return resp.data;
  }

  // ─── Email Management ──────────────────────────────────────

  async listHardBounces(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    email?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.email) queryParams.email = params.email;
    let resp = await this.axios.get('/email/hard_bounces', { params: queryParams });
    return resp.data;
  }

  async listUnsubscribes(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sortDirection?: string;
    email?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.sortDirection) queryParams.sort_direction = params.sortDirection;
    if (params?.email) queryParams.email = params.email;
    let resp = await this.axios.get('/email/unsubscribes', { params: queryParams });
    return resp.data;
  }

  async removeFromBounceList(emails: string[]) {
    let resp = await this.axios.post('/email/bounce/remove', { email: emails });
    return resp.data;
  }

  async removeFromSpamList(emails: string[]) {
    let resp = await this.axios.post('/email/spam/remove', { email: emails });
    return resp.data;
  }

  async setEmailSubscriptionStatus(email: string, subscriptionState: string) {
    let resp = await this.axios.post('/email/status', {
      email,
      subscription_state: subscriptionState
    });
    return resp.data;
  }

  // ─── SMS Management ────────────────────────────────────────

  async listInvalidPhoneNumbers(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    phone?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    if (params?.phone) queryParams.phone = params.phone;
    let resp = await this.axios.get('/sms/invalid_phone_numbers', { params: queryParams });
    return resp.data;
  }

  async removeInvalidPhoneNumbers(phones: string[]) {
    let resp = await this.axios.post('/sms/invalid_phone_numbers/remove', { phone: phones });
    return resp.data;
  }

  // ─── Catalogs ──────────────────────────────────────────────

  async listCatalogs() {
    let resp = await this.axios.get('/catalogs');
    return resp.data;
  }

  async createCatalog(params: {
    name: string;
    description: string;
    fields: { name: string; type: string }[];
  }) {
    let resp = await this.axios.post('/catalogs', {
      catalogs: [
        {
          name: params.name,
          description: params.description,
          fields: params.fields
        }
      ]
    });
    return resp.data;
  }

  async deleteCatalog(catalogName: string) {
    let resp = await this.axios.delete(`/catalogs/${catalogName}`);
    return resp.data;
  }

  async listCatalogItems(catalogName: string, cursor?: string) {
    let params: Record<string, any> = {};
    if (cursor) params.cursor = cursor;
    let resp = await this.axios.get(`/catalogs/${catalogName}/items`, { params });
    return resp.data;
  }

  async getCatalogItem(catalogName: string, itemId: string) {
    let resp = await this.axios.get(`/catalogs/${catalogName}/items/${itemId}`);
    return resp.data;
  }

  async createCatalogItem(catalogName: string, itemId: string, fields: Record<string, any>) {
    let resp = await this.axios.post(`/catalogs/${catalogName}/items/${itemId}`, {
      items: [{ id: itemId, ...fields }]
    });
    return resp.data;
  }

  async updateCatalogItem(catalogName: string, itemId: string, fields: Record<string, any>) {
    let resp = await this.axios.patch(`/catalogs/${catalogName}/items/${itemId}`, {
      items: [{ id: itemId, ...fields }]
    });
    return resp.data;
  }

  async deleteCatalogItem(catalogName: string, itemId: string) {
    let resp = await this.axios.delete(`/catalogs/${catalogName}/items/${itemId}`);
    return resp.data;
  }

  // ─── Email Templates ───────────────────────────────────────

  async listEmailTemplates(params?: {
    modifiedAfter?: string;
    modifiedBefore?: string;
    limit?: number;
    offset?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.modifiedAfter) queryParams.modified_after = params.modifiedAfter;
    if (params?.modifiedBefore) queryParams.modified_before = params.modifiedBefore;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    let resp = await this.axios.get('/templates/email/list', { params: queryParams });
    return resp.data;
  }

  async getEmailTemplate(templateId: string) {
    let resp = await this.axios.get('/templates/email/info', {
      params: { email_template_id: templateId }
    });
    return resp.data;
  }

  async createEmailTemplate(params: {
    templateName: string;
    subject: string;
    body: string;
    plaintextBody?: string;
    preheader?: string;
    tags?: string[];
  }) {
    let body: Record<string, any> = {
      template_name: params.templateName,
      subject: params.subject,
      body: params.body
    };
    if (params.plaintextBody) body.plaintext_body = params.plaintextBody;
    if (params.preheader) body.preheader = params.preheader;
    if (params.tags) body.tags = params.tags;
    let resp = await this.axios.post('/templates/email/create', body);
    return resp.data;
  }

  async updateEmailTemplate(params: {
    templateId: string;
    templateName?: string;
    subject?: string;
    body?: string;
    plaintextBody?: string;
    preheader?: string;
    tags?: string[];
  }) {
    let body: Record<string, any> = {
      email_template_id: params.templateId
    };
    if (params.templateName) body.template_name = params.templateName;
    if (params.subject) body.subject = params.subject;
    if (params.body) body.body = params.body;
    if (params.plaintextBody) body.plaintext_body = params.plaintextBody;
    if (params.preheader) body.preheader = params.preheader;
    if (params.tags) body.tags = params.tags;
    let resp = await this.axios.post('/templates/email/update', body);
    return resp.data;
  }

  // ─── Content Blocks ────────────────────────────────────────

  async listContentBlocks(params?: {
    modifiedAfter?: string;
    modifiedBefore?: string;
    limit?: number;
    offset?: number;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.modifiedAfter) queryParams.modified_after = params.modifiedAfter;
    if (params?.modifiedBefore) queryParams.modified_before = params.modifiedBefore;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;
    let resp = await this.axios.get('/content_blocks/list', { params: queryParams });
    return resp.data;
  }

  async getContentBlock(contentBlockId: string, includeInclusionData?: boolean) {
    let params: Record<string, any> = { content_block_id: contentBlockId };
    if (includeInclusionData !== undefined)
      params.include_inclusion_data = includeInclusionData;
    let resp = await this.axios.get('/content_blocks/info', { params });
    return resp.data;
  }

  async createContentBlock(params: {
    name: string;
    contentType: string;
    content: string;
    description?: string;
    state?: string;
    tags?: string[];
  }) {
    let body: Record<string, any> = {
      name: params.name,
      content_type: params.contentType,
      content: params.content
    };
    if (params.description) body.description = params.description;
    if (params.state) body.state = params.state;
    if (params.tags) body.tags = params.tags;
    let resp = await this.axios.post('/content_blocks/create', body);
    return resp.data;
  }

  async updateContentBlock(params: {
    contentBlockId: string;
    name?: string;
    contentType?: string;
    content?: string;
    description?: string;
    state?: string;
    tags?: string[];
  }) {
    let body: Record<string, any> = {
      content_block_id: params.contentBlockId
    };
    if (params.name) body.name = params.name;
    if (params.contentType) body.content_type = params.contentType;
    if (params.content) body.content = params.content;
    if (params.description) body.description = params.description;
    if (params.state) body.state = params.state;
    if (params.tags) body.tags = params.tags;
    let resp = await this.axios.post('/content_blocks/update', body);
    return resp.data;
  }

  // ─── KPIs & Analytics ──────────────────────────────────────

  async getDauDataSeries(length: number, endingAt?: string) {
    let params: Record<string, any> = { length };
    if (endingAt) params.ending_at = endingAt;
    let resp = await this.axios.get('/kpi/dau/data_series', { params });
    return resp.data;
  }

  async getMauDataSeries(length: number, endingAt?: string) {
    let params: Record<string, any> = { length };
    if (endingAt) params.ending_at = endingAt;
    let resp = await this.axios.get('/kpi/mau/data_series', { params });
    return resp.data;
  }

  async getNewUsersDataSeries(length: number, endingAt?: string) {
    let params: Record<string, any> = { length };
    if (endingAt) params.ending_at = endingAt;
    let resp = await this.axios.get('/kpi/new_users/data_series', { params });
    return resp.data;
  }

  async getSessionsDataSeries(length: number, endingAt?: string, segmentId?: string) {
    let params: Record<string, any> = { length };
    if (endingAt) params.ending_at = endingAt;
    if (segmentId) params.segment_id = segmentId;
    let resp = await this.axios.get('/sessions/data_series', { params });
    return resp.data;
  }

  // ─── Custom Events ─────────────────────────────────────────

  async listCustomEvents(page?: number) {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let resp = await this.axios.get('/events/list', { params });
    return resp.data;
  }

  async getCustomEventAnalytics(eventName: string, length: number, endingAt?: string) {
    let params: Record<string, any> = { event: eventName, length };
    if (endingAt) params.ending_at = endingAt;
    let resp = await this.axios.get('/events/data_series', { params });
    return resp.data;
  }

  // ─── Purchases ─────────────────────────────────────────────

  async listProducts(page?: number) {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let resp = await this.axios.get('/purchases/product_list', { params });
    return resp.data;
  }

  async getPurchaseQuantitySeries(length: number, endingAt?: string, productId?: string) {
    let params: Record<string, any> = { length };
    if (endingAt) params.ending_at = endingAt;
    if (productId) params.product_id = productId;
    let resp = await this.axios.get('/purchases/quantity_series', { params });
    return resp.data;
  }

  async getPurchaseRevenueSeries(length: number, endingAt?: string, productId?: string) {
    let params: Record<string, any> = { length };
    if (endingAt) params.ending_at = endingAt;
    if (productId) params.product_id = productId;
    let resp = await this.axios.get('/purchases/revenue_series', { params });
    return resp.data;
  }

  // ─── Preference Center ─────────────────────────────────────

  async listPreferenceCenters() {
    let resp = await this.axios.get('/preference_center/v1/list');
    return resp.data;
  }

  async getPreferenceCenter(preferenceCenterId: string) {
    let resp = await this.axios.get(`/preference_center/v1/${preferenceCenterId}`);
    return resp.data;
  }

  async createPreferenceCenter(params: {
    name: string;
    preferenceCenterTitle?: string;
    preferenceCenterPageHtml: string;
    confirmationPageHtml: string;
    options?: Record<string, any>;
  }) {
    let body: Record<string, any> = {
      name: params.name,
      preference_center_page_html: params.preferenceCenterPageHtml,
      confirmation_page_html: params.confirmationPageHtml
    };
    if (params.preferenceCenterTitle)
      body.preference_center_title = params.preferenceCenterTitle;
    if (params.options) body.options = params.options;
    let resp = await this.axios.post('/preference_center/v1', body);
    return resp.data;
  }

  async updatePreferenceCenter(
    preferenceCenterId: string,
    params: {
      name?: string;
      preferenceCenterTitle?: string;
      preferenceCenterPageHtml?: string;
      confirmationPageHtml?: string;
      options?: Record<string, any>;
    }
  ) {
    let body: Record<string, any> = {};
    if (params.name) body.name = params.name;
    if (params.preferenceCenterTitle)
      body.preference_center_title = params.preferenceCenterTitle;
    if (params.preferenceCenterPageHtml)
      body.preference_center_page_html = params.preferenceCenterPageHtml;
    if (params.confirmationPageHtml) body.confirmation_page_html = params.confirmationPageHtml;
    if (params.options) body.options = params.options;
    let resp = await this.axios.put(`/preference_center/v1/${preferenceCenterId}`, body);
    return resp.data;
  }

  async getPreferenceCenterUrl(preferenceCenterId: string, userId: string) {
    let resp = await this.axios.get(
      `/preference_center/v1/${preferenceCenterId}/url/${userId}`
    );
    return resp.data;
  }

  // ─── Send ID ───────────────────────────────────────────────

  async createSendId(campaignId: string, sendId?: string) {
    let body: Record<string, any> = { campaign_id: campaignId };
    if (sendId) body.send_id = sendId;
    let resp = await this.axios.post('/sends/id/create', body);
    return resp.data;
  }
}
