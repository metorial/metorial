import { createAxios } from 'slates';

export class UnisenderClient {
  private ax;
  private apiKey: string;

  constructor(config: { token: string; locale?: string }) {
    let locale = config.locale || 'en';
    this.apiKey = config.token;
    this.ax = createAxios({
      baseURL: `https://api.unisender.com/${locale}/api`
    });
  }

  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    let formParams = new URLSearchParams();
    formParams.append('api_key', this.apiKey);
    formParams.append('format', 'json');

    let flattenParams = (obj: Record<string, any>, prefix?: string) => {
      for (let [key, value] of Object.entries(obj)) {
        if (value === undefined || value === null) continue;
        let paramKey = prefix ? `${prefix}[${key}]` : key;
        if (typeof value === 'object' && !Array.isArray(value)) {
          flattenParams(value, paramKey);
        } else if (Array.isArray(value)) {
          for (let item of value) {
            formParams.append(`${paramKey}[]`, String(item));
          }
        } else {
          formParams.append(paramKey, String(value));
        }
      }
    };

    flattenParams(params);

    let response = await this.ax.post(`/${method}`, formParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    let data = response.data;
    if (data?.error) {
      throw new Error(`Unisender API error (${data.code || 'unknown'}): ${data.error}`);
    }

    return data?.result as T;
  }

  // === List Management ===

  async getLists(): Promise<Array<{ id: number; title: string }>> {
    return this.call('getLists');
  }

  async createList(params: {
    title: string;
    before_subscribe_url?: string;
    after_subscribe_url?: string;
  }): Promise<{ id: number }> {
    return this.call('createList', params);
  }

  async updateList(params: {
    list_id: number;
    title: string;
    before_subscribe_url?: string;
    after_subscribe_url?: string;
  }): Promise<void> {
    return this.call('updateList', params);
  }

  async deleteList(listId: number): Promise<void> {
    return this.call('deleteList', { list_id: listId });
  }

  // === Contact/Subscriber Management ===

  async subscribe(params: {
    list_ids: string;
    fields: Record<string, string>;
    tags?: string;
    double_optin?: number;
    overwrite?: number;
    request_ip?: string;
    request_time?: string;
    confirm_ip?: string;
    confirm_time?: string;
  }): Promise<{ person_id: number }> {
    let formattedParams: Record<string, any> = {
      list_ids: params.list_ids,
      double_optin: params.double_optin,
      overwrite: params.overwrite,
      tags: params.tags,
      request_ip: params.request_ip,
      request_time: params.request_time,
      confirm_ip: params.confirm_ip,
      confirm_time: params.confirm_time
    };

    if (params.fields) {
      for (let [key, value] of Object.entries(params.fields)) {
        formattedParams[`fields[${key}]`] = value;
      }
    }

    return this.call('subscribe', formattedParams);
  }

  async unsubscribe(params: {
    contact: string;
    contact_type?: string;
    list_ids?: string;
  }): Promise<void> {
    return this.call('unsubscribe', params);
  }

  async exclude(params: {
    contact: string;
    contact_type?: string;
    list_ids?: string;
  }): Promise<void> {
    return this.call('exclude', params);
  }

  async getContact(email: string): Promise<any> {
    return this.call('getContact', { email });
  }

  async getContactCount(
    listId: number,
    params?: { tag_id?: number; type?: string; search?: string }
  ): Promise<{ count: number }> {
    return this.call('getContactCount', { list_id: listId, ...params });
  }

  async isContactInList(params: {
    email: string;
    list_ids: string;
    condition?: string;
  }): Promise<any> {
    return this.call('isContactInList', params);
  }

  async getTotalContactsCount(login: string): Promise<{ total: number }> {
    return this.call('getTotalContactsCount', { login });
  }

  async importContacts(params: {
    field_names: string[];
    data: string[][];
    overwrite_tags?: number;
    overwrite_lists?: number;
    double_optin?: number;
  }): Promise<{
    total: number;
    inserted: number;
    updated: number;
    deleted: number;
    new_emails: number;
    invalid: number;
    log?: any[];
  }> {
    let formattedParams: Record<string, any> = {
      overwrite_tags: params.overwrite_tags,
      overwrite_lists: params.overwrite_lists,
      double_optin: params.double_optin
    };

    for (let i = 0; i < params.field_names.length; i++) {
      formattedParams[`field_names[${i}]`] = params.field_names[i];
    }

    for (let i = 0; i < params.data.length; i++) {
      for (let j = 0; j < params.data[i]!.length; j++) {
        formattedParams[`data[${i}][${j}]`] = params.data[i]![j];
      }
    }

    return this.call('importContacts', formattedParams);
  }

  async exportContacts(params?: {
    list_id?: number;
    field_names?: string[];
    email_status?: string;
    phone_status?: string;
    tag?: string;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    let formattedParams: Record<string, any> = {
      list_id: params?.list_id,
      email_status: params?.email_status,
      phone_status: params?.phone_status,
      tag: params?.tag,
      offset: params?.offset,
      limit: params?.limit
    };

    if (params?.field_names) {
      for (let i = 0; i < params.field_names.length; i++) {
        formattedParams[`field_names[${i}]`] = params.field_names[i];
      }
    }

    return this.call('exportContacts', formattedParams);
  }

  // === Custom Fields ===

  async getFields(): Promise<
    Array<{ id: number; name: string; type: string; is_visible: number; view_pos: number }>
  > {
    return this.call('getFields');
  }

  async createField(params: {
    name: string;
    type?: string;
    public_name?: string;
  }): Promise<{ id: number }> {
    return this.call('createField', params);
  }

  async updateField(params: {
    id: number;
    name?: string;
    public_name?: string;
  }): Promise<void> {
    return this.call('updateField', params);
  }

  async deleteField(fieldId: number): Promise<void> {
    return this.call('deleteField', { id: fieldId });
  }

  // === Tags ===

  async getTags(): Promise<Array<{ id: number; name: string }>> {
    return this.call('getTags');
  }

  async deleteTag(tagId: number): Promise<void> {
    return this.call('deleteTag', { id: tagId });
  }

  // === Email Messages ===

  async createEmailMessage(params: {
    sender_name: string;
    sender_email: string;
    subject: string;
    body: string;
    list_id: number;
    text_body?: string;
    generate_text?: number;
    tag?: string;
    lang?: string;
    series_day?: number;
    series_time?: string;
    wrap_type?: string;
    categories?: string;
  }): Promise<{ message_id: number }> {
    return this.call('createEmailMessage', params);
  }

  async updateEmailMessage(params: {
    id: number;
    sender_name?: string;
    sender_email?: string;
    subject?: string;
    body?: string;
    list_id?: number;
    text_body?: string;
    generate_text?: number;
    tag?: string;
    lang?: string;
    series_day?: number;
    series_time?: string;
    wrap_type?: string;
    categories?: string;
  }): Promise<void> {
    return this.call('updateEmailMessage', params);
  }

  async deleteMessage(messageId: number): Promise<void> {
    return this.call('deleteMessage', { message_id: messageId });
  }

  async getMessage(messageId: number): Promise<any> {
    return this.call('getMessage', { id: messageId });
  }

  async getMessages(params?: {
    date_from?: string;
    date_to?: string;
    format?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.call('getMessages', params || {});
  }

  async listMessages(params?: {
    date_from?: string;
    date_to?: string;
    format?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.call('listMessages', params || {});
  }

  // === Campaigns ===

  async createCampaign(params: {
    message_id: number;
    start_time?: string;
    timezone?: string;
    track_read?: number;
    track_links?: number;
    contacts?: string;
    contacts_url?: string;
    track_ga?: number;
    payment_limit?: number;
    payment_currency?: string;
  }): Promise<{ campaign_id: number; status: string; count: number }> {
    return this.call('createCampaign', params);
  }

  async cancelCampaign(campaignId: number): Promise<void> {
    return this.call('cancelCampaign', { campaign_id: campaignId });
  }

  async getCampaignStatus(
    campaignId: number
  ): Promise<{ status: string; creation_time?: string; start_time?: string }> {
    return this.call('getCampaignStatus', { campaign_id: campaignId });
  }

  async getCampaignCommonStats(campaignId: number): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read_unique: number;
    read_all: number;
    clicked_unique: number;
    clicked_all: number;
    unsubscribed: number;
    spam: number;
  }> {
    return this.call('getCampaignCommonStats', { campaign_id: campaignId });
  }

  async getVisitedLinks(params: { campaign_id: number; group?: number }): Promise<any> {
    return this.call('getVisitedLinks', params);
  }

  async getCampaigns(params?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<any> {
    return this.call('getCampaigns', params || {});
  }

  // === Send Individual Messages ===

  async sendEmail(params: {
    email: string;
    sender_name: string;
    sender_email: string;
    subject: string;
    body: string;
    list_id: number;
    track_read?: number;
    track_links?: number;
    cc?: string;
    headers?: string;
    wrap_type?: string;
    images_as?: string;
    lang?: string;
    error_checking?: number;
  }): Promise<any> {
    return this.call('sendEmail', params);
  }

  async sendTestEmail(params: { id: number; email?: string }): Promise<any> {
    return this.call('sendTestEmail', params);
  }

  async checkEmail(params: { email_id: number[] }): Promise<any> {
    let formattedParams: Record<string, any> = {};
    for (let i = 0; i < params.email_id.length; i++) {
      formattedParams[`email_id[${i}]`] = params.email_id[i];
    }
    return this.call('checkEmail', formattedParams);
  }

  // === SMS ===

  async createSmsMessage(params: {
    sender: string;
    body: string;
    list_id: number;
    tag?: string;
  }): Promise<{ message_id: number }> {
    return this.call('createSmsMessage', params);
  }

  async sendSms(params: { phone: string; sender?: string; text: string }): Promise<any> {
    return this.call('sendSms', params);
  }

  async checkSms(smsId: number): Promise<any> {
    return this.call('checkSms', { sms_id: smsId });
  }

  // === Templates ===

  async createEmailTemplate(params: {
    title: string;
    subject?: string;
    body?: string;
    text_body?: string;
    lang?: string;
    description?: string;
    list_id?: number;
  }): Promise<{ template_id: number }> {
    return this.call('createEmailTemplate', params);
  }

  async updateEmailTemplate(params: {
    template_id: number;
    title?: string;
    subject?: string;
    body?: string;
    text_body?: string;
    lang?: string;
    description?: string;
    list_id?: number;
  }): Promise<void> {
    return this.call('updateEmailTemplate', params);
  }

  async deleteTemplate(templateId: number): Promise<void> {
    return this.call('deleteTemplate', { template_id: templateId });
  }

  async getTemplate(templateId: number): Promise<any> {
    return this.call('getTemplate', { template_id: templateId });
  }

  async getTemplates(params?: {
    type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.call('getTemplates', params || {});
  }

  async listTemplates(params?: {
    type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.call('listTemplates', params || {});
  }

  // === Webhooks ===

  async setHook(params: {
    url: string;
    event_format?: string;
    single_event?: number;
    max_parallel?: number;
    status?: string;
    events?: Record<string, string>;
  }): Promise<{ id: number }> {
    let formattedParams: Record<string, any> = {
      url: params.url,
      event_format: params.event_format,
      single_event: params.single_event,
      max_parallel: params.max_parallel,
      status: params.status
    };

    if (params.events) {
      for (let [key, value] of Object.entries(params.events)) {
        formattedParams[`events[${key}]`] = value;
      }
    }

    return this.call('setHook', formattedParams);
  }

  async listHooks(): Promise<
    Array<{ id: number; url: string; event_format: string; status: string; events: any }>
  > {
    return this.call('listHooks');
  }

  async removeHook(hookId: number): Promise<void> {
    return this.call('removeHook', { id: hookId });
  }

  // === Sender Verification ===

  async validateSender(email: string): Promise<any> {
    return this.call('validateSender', { email });
  }

  async getCheckedEmail(login?: string): Promise<any> {
    return this.call('getCheckedEmail', login ? { login } : {});
  }

  // === Account ===

  async getUserInfo(login?: string): Promise<any> {
    return this.call('getUserInfo', login ? { login } : {});
  }
}
