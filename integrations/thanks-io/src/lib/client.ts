import { createAxios } from 'slates';

export class ThanksIoClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.thanks.io/api/v2',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- Send Mailer ----

  async sendPostcard(params: {
    size?: string;
    frontImageUrl?: string;
    imageTemplate?: number;
    message?: string;
    messageTemplate?: number;
    useCustomBackground?: boolean;
    customBackgroundImage?: string;
    qrcodeUrl?: string;
    mailingLists?: number[];
    recipients?: Record<string, unknown>[];
    radiusSearch?: Record<string, unknown>;
    handwritingStyle?: number;
    handwritingColor?: string;
    handwritingRealism?: boolean;
    subAccount?: number;
    emailAdditional?: string;
    sendStandardMail?: boolean;
    returnName?: string;
    returnAddress?: string;
    returnAddress2?: string;
    returnCity?: string;
    returnState?: string;
    returnPostalCode?: string;
    preview?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.size !== undefined) body.size = params.size;
    if (params.frontImageUrl !== undefined) body.front_image_url = params.frontImageUrl;
    if (params.imageTemplate !== undefined) body.image_template = params.imageTemplate;
    if (params.message !== undefined) body.message = params.message;
    if (params.messageTemplate !== undefined) body.message_template = params.messageTemplate;
    if (params.useCustomBackground !== undefined)
      body.use_custom_background = params.useCustomBackground;
    if (params.customBackgroundImage !== undefined)
      body.custom_background_image = params.customBackgroundImage;
    if (params.qrcodeUrl !== undefined) body.qrcode_url = params.qrcodeUrl;
    if (params.mailingLists !== undefined) body.mailing_lists = params.mailingLists;
    if (params.recipients !== undefined) body.recipients = params.recipients;
    if (params.radiusSearch !== undefined) body.radius_search = params.radiusSearch;
    if (params.handwritingStyle !== undefined)
      body.handwriting_style = params.handwritingStyle;
    if (params.handwritingColor !== undefined)
      body.handwriting_color = params.handwritingColor;
    if (params.handwritingRealism !== undefined)
      body.handwriting_realism = params.handwritingRealism;
    if (params.subAccount !== undefined) body.sub_account = params.subAccount;
    if (params.emailAdditional !== undefined) body.email_additional = params.emailAdditional;
    if (params.sendStandardMail !== undefined)
      body.send_standard_mail = params.sendStandardMail;
    if (params.returnName !== undefined) body.return_name = params.returnName;
    if (params.returnAddress !== undefined) body.return_address = params.returnAddress;
    if (params.returnAddress2 !== undefined) body.return_address2 = params.returnAddress2;
    if (params.returnCity !== undefined) body.return_city = params.returnCity;
    if (params.returnState !== undefined) body.return_state = params.returnState;
    if (params.returnPostalCode !== undefined)
      body.return_postal_code = params.returnPostalCode;
    if (params.preview !== undefined) body.preview = params.preview;

    let response = await this.axios.post('/send/postcard', body);
    return response.data;
  }

  async sendNotecard(params: {
    frontImageUrl?: string;
    imageTemplate?: number;
    message?: string;
    messageTemplate?: number;
    useCustomBackground?: boolean;
    customBackgroundImage?: string;
    qrcodeUrl?: string;
    mailingLists?: number[];
    recipients?: Record<string, unknown>[];
    radiusSearch?: Record<string, unknown>;
    handwritingStyle?: number;
    handwritingColor?: string;
    handwritingRealism?: boolean;
    subAccount?: number;
    emailAdditional?: string;
    sendStandardMail?: boolean;
    returnName?: string;
    returnAddress?: string;
    returnAddress2?: string;
    returnCity?: string;
    returnState?: string;
    returnPostalCode?: string;
    preview?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.frontImageUrl !== undefined) body.front_image_url = params.frontImageUrl;
    if (params.imageTemplate !== undefined) body.image_template = params.imageTemplate;
    if (params.message !== undefined) body.message = params.message;
    if (params.messageTemplate !== undefined) body.message_template = params.messageTemplate;
    if (params.useCustomBackground !== undefined)
      body.use_custom_background = params.useCustomBackground;
    if (params.customBackgroundImage !== undefined)
      body.custom_background_image = params.customBackgroundImage;
    if (params.qrcodeUrl !== undefined) body.qrcode_url = params.qrcodeUrl;
    if (params.mailingLists !== undefined) body.mailing_lists = params.mailingLists;
    if (params.recipients !== undefined) body.recipients = params.recipients;
    if (params.radiusSearch !== undefined) body.radius_search = params.radiusSearch;
    if (params.handwritingStyle !== undefined)
      body.handwriting_style = params.handwritingStyle;
    if (params.handwritingColor !== undefined)
      body.handwriting_color = params.handwritingColor;
    if (params.handwritingRealism !== undefined)
      body.handwriting_realism = params.handwritingRealism;
    if (params.subAccount !== undefined) body.sub_account = params.subAccount;
    if (params.emailAdditional !== undefined) body.email_additional = params.emailAdditional;
    if (params.sendStandardMail !== undefined)
      body.send_standard_mail = params.sendStandardMail;
    if (params.returnName !== undefined) body.return_name = params.returnName;
    if (params.returnAddress !== undefined) body.return_address = params.returnAddress;
    if (params.returnAddress2 !== undefined) body.return_address2 = params.returnAddress2;
    if (params.returnCity !== undefined) body.return_city = params.returnCity;
    if (params.returnState !== undefined) body.return_state = params.returnState;
    if (params.returnPostalCode !== undefined)
      body.return_postal_code = params.returnPostalCode;
    if (params.preview !== undefined) body.preview = params.preview;

    let response = await this.axios.post('/send/notecard', body);
    return response.data;
  }

  async sendLetter(params: {
    letterType: 'windowed' | 'windowless';
    frontImageUrl?: string;
    imageTemplate?: number;
    message?: string;
    messageTemplate?: number;
    qrcodeUrl?: string;
    additionalPagesUrl?: string;
    pdfOnlyUrl?: string;
    mailingLists?: number[];
    recipients?: Record<string, unknown>[];
    radiusSearch?: Record<string, unknown>;
    handwritingStyle?: number;
    handwritingColor?: string;
    handwritingRealism?: boolean;
    subAccount?: number;
    emailAdditional?: string;
    sendStandardMail?: boolean;
    returnName?: string;
    returnAddress?: string;
    returnAddress2?: string;
    returnCity?: string;
    returnState?: string;
    returnPostalCode?: string;
    preview?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.frontImageUrl !== undefined) body.front_image_url = params.frontImageUrl;
    if (params.imageTemplate !== undefined) body.image_template = params.imageTemplate;
    if (params.message !== undefined) body.message = params.message;
    if (params.messageTemplate !== undefined) body.message_template = params.messageTemplate;
    if (params.qrcodeUrl !== undefined) body.qrcode_url = params.qrcodeUrl;
    if (params.additionalPagesUrl !== undefined)
      body.additional_pages_url = params.additionalPagesUrl;
    if (params.pdfOnlyUrl !== undefined) body.pdf_only_url = params.pdfOnlyUrl;
    if (params.mailingLists !== undefined) body.mailing_lists = params.mailingLists;
    if (params.recipients !== undefined) body.recipients = params.recipients;
    if (params.radiusSearch !== undefined) body.radius_search = params.radiusSearch;
    if (params.handwritingStyle !== undefined)
      body.handwriting_style = params.handwritingStyle;
    if (params.handwritingColor !== undefined)
      body.handwriting_color = params.handwritingColor;
    if (params.handwritingRealism !== undefined)
      body.handwriting_realism = params.handwritingRealism;
    if (params.subAccount !== undefined) body.sub_account = params.subAccount;
    if (params.emailAdditional !== undefined) body.email_additional = params.emailAdditional;
    if (params.sendStandardMail !== undefined)
      body.send_standard_mail = params.sendStandardMail;
    if (params.returnName !== undefined) body.return_name = params.returnName;
    if (params.returnAddress !== undefined) body.return_address = params.returnAddress;
    if (params.returnAddress2 !== undefined) body.return_address2 = params.returnAddress2;
    if (params.returnCity !== undefined) body.return_city = params.returnCity;
    if (params.returnState !== undefined) body.return_state = params.returnState;
    if (params.returnPostalCode !== undefined)
      body.return_postal_code = params.returnPostalCode;
    if (params.preview !== undefined) body.preview = params.preview;

    let endpoint =
      params.letterType === 'windowed' ? '/send/letter/windowed' : '/send/letter/windowless';
    let response = await this.axios.post(endpoint, body);
    return response.data;
  }

  async sendGiftcard(params: {
    frontImageUrl?: string;
    imageTemplate?: number;
    message?: string;
    messageTemplate?: number;
    giftcardBrand?: string;
    giftcardAmountInCents?: number;
    mailingLists?: number[];
    recipients?: Record<string, unknown>[];
    radiusSearch?: Record<string, unknown>;
    handwritingStyle?: number;
    handwritingColor?: string;
    handwritingRealism?: boolean;
    subAccount?: number;
    emailAdditional?: string;
    sendStandardMail?: boolean;
    returnName?: string;
    returnAddress?: string;
    returnAddress2?: string;
    returnCity?: string;
    returnState?: string;
    returnPostalCode?: string;
    preview?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.frontImageUrl !== undefined) body.front_image_url = params.frontImageUrl;
    if (params.imageTemplate !== undefined) body.image_template = params.imageTemplate;
    if (params.message !== undefined) body.message = params.message;
    if (params.messageTemplate !== undefined) body.message_template = params.messageTemplate;
    if (params.giftcardBrand !== undefined) body.giftcard_brand = params.giftcardBrand;
    if (params.giftcardAmountInCents !== undefined)
      body.giftcard_amount_in_cents = params.giftcardAmountInCents;
    if (params.mailingLists !== undefined) body.mailing_lists = params.mailingLists;
    if (params.recipients !== undefined) body.recipients = params.recipients;
    if (params.radiusSearch !== undefined) body.radius_search = params.radiusSearch;
    if (params.handwritingStyle !== undefined)
      body.handwriting_style = params.handwritingStyle;
    if (params.handwritingColor !== undefined)
      body.handwriting_color = params.handwritingColor;
    if (params.handwritingRealism !== undefined)
      body.handwriting_realism = params.handwritingRealism;
    if (params.subAccount !== undefined) body.sub_account = params.subAccount;
    if (params.emailAdditional !== undefined) body.email_additional = params.emailAdditional;
    if (params.sendStandardMail !== undefined)
      body.send_standard_mail = params.sendStandardMail;
    if (params.returnName !== undefined) body.return_name = params.returnName;
    if (params.returnAddress !== undefined) body.return_address = params.returnAddress;
    if (params.returnAddress2 !== undefined) body.return_address2 = params.returnAddress2;
    if (params.returnCity !== undefined) body.return_city = params.returnCity;
    if (params.returnState !== undefined) body.return_state = params.returnState;
    if (params.returnPostalCode !== undefined)
      body.return_postal_code = params.returnPostalCode;
    if (params.preview !== undefined) body.preview = params.preview;

    let response = await this.axios.post('/send/giftcard', body);
    return response.data;
  }

  // ---- Recipients ----

  async createRecipient(params: {
    mailingListId: number;
    name?: string;
    company?: string;
    address?: string;
    address2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    email?: string;
    phone?: string;
    dob?: string;
    custom1?: string;
    custom2?: string;
    custom3?: string;
    custom4?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      mailing_list_id: params.mailingListId
    };
    if (params.name !== undefined) body.name = params.name;
    if (params.company !== undefined) body.company = params.company;
    if (params.address !== undefined) body.address = params.address;
    if (params.address2 !== undefined) body.address2 = params.address2;
    if (params.city !== undefined) body.city = params.city;
    if (params.province !== undefined) body.province = params.province;
    if (params.postalCode !== undefined) body.postal_code = params.postalCode;
    if (params.country !== undefined) body.country = params.country;
    if (params.email !== undefined) body.email = params.email;
    if (params.phone !== undefined) body.phone = params.phone;
    if (params.dob !== undefined) body.dob = params.dob;
    if (params.custom1 !== undefined) body.custom1 = params.custom1;
    if (params.custom2 !== undefined) body.custom2 = params.custom2;
    if (params.custom3 !== undefined) body.custom3 = params.custom3;
    if (params.custom4 !== undefined) body.custom4 = params.custom4;

    let response = await this.axios.post('/recipients', body);
    return response.data;
  }

  async createMultipleRecipients(
    recipients: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/recipients-utils/create-multiple', recipients);
    return response.data;
  }

  async getRecipient(recipientId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/recipients/${recipientId}`);
    return response.data;
  }

  async updateRecipient(
    recipientId: number,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.company !== undefined) body.company = params.company;
    if (params.address !== undefined) body.address = params.address;
    if (params.address2 !== undefined) body.address2 = params.address2;
    if (params.city !== undefined) body.city = params.city;
    if (params.province !== undefined) body.province = params.province;
    if (params.postalCode !== undefined) body.postal_code = params.postalCode;
    if (params.country !== undefined) body.country = params.country;
    if (params.email !== undefined) body.email = params.email;
    if (params.phone !== undefined) body.phone = params.phone;
    if (params.dob !== undefined) body.dob = params.dob;
    if (params.custom1 !== undefined) body.custom1 = params.custom1;
    if (params.custom2 !== undefined) body.custom2 = params.custom2;
    if (params.custom3 !== undefined) body.custom3 = params.custom3;
    if (params.custom4 !== undefined) body.custom4 = params.custom4;

    let response = await this.axios.put(`/recipients/${recipientId}`, body);
    return response.data;
  }

  async deleteRecipient(recipientId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/recipients/${recipientId}`);
    return response.data;
  }

  async deleteRecipientByAddress(params: {
    mailingListId: number;
    address?: string;
    address2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    email?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      mailing_list_id: params.mailingListId
    };
    if (params.address !== undefined) body.address = params.address;
    if (params.address2 !== undefined) body.address2 = params.address2;
    if (params.city !== undefined) body.city = params.city;
    if (params.province !== undefined) body.province = params.province;
    if (params.postalCode !== undefined) body.postal_code = params.postalCode;
    if (params.country !== undefined) body.country = params.country;
    if (params.email !== undefined) body.email = params.email;

    let response = await this.axios.post('/recipients-utils/delete-by-address', body);
    return response.data;
  }

  // ---- Mailing Lists ----

  async listMailingLists(params?: {
    itemsPerPage?: number;
  }): Promise<Record<string, unknown>> {
    let query: Record<string, string> = {};
    if (params?.itemsPerPage !== undefined) query.items_per_page = String(params.itemsPerPage);

    let response = await this.axios.get('/mailing-lists/', { params: query });
    return response.data;
  }

  async createMailingList(params: {
    description: string;
    subAccountId?: number;
    qrcodeUrl?: string;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      description: params.description
    };
    if (params.subAccountId !== undefined) body.sub_account_id = params.subAccountId;
    if (params.qrcodeUrl !== undefined) body.qrcode_url = params.qrcodeUrl;

    let response = await this.axios.post('/mailing-lists/', body);
    return response.data;
  }

  async getMailingList(mailingListId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/mailing-lists/${mailingListId}`);
    return response.data;
  }

  async deleteMailingList(mailingListId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/mailing-lists/${mailingListId}`);
    return response.data;
  }

  async listMailingListRecipients(
    mailingListId: number,
    params?: {
      limit?: number;
      updatedSince?: string;
    }
  ): Promise<Record<string, unknown>> {
    let query: Record<string, string> = {};
    if (params?.limit !== undefined) query.limit = String(params.limit);
    if (params?.updatedSince !== undefined) query.updated_since = params.updatedSince;

    let response = await this.axios.get(`/mailing-lists-utils/recipients/${mailingListId}`, {
      params: query
    });
    return response.data;
  }

  async buyRadiusSearch(params: {
    address: string;
    postalCode: string;
    recordCount: number;
    mailingListId?: number;
    recordTypes?: string;
    includeCondos?: boolean;
    appendData?: boolean;
    usePropertyOwner?: boolean;
    includeSearchAddress?: boolean;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      address: params.address,
      postal_code: params.postalCode,
      record_count: params.recordCount
    };
    if (params.mailingListId !== undefined) body.mailing_list_id = params.mailingListId;
    if (params.recordTypes !== undefined) body.record_types = params.recordTypes;
    if (params.includeCondos !== undefined) body.include_condos = params.includeCondos;
    if (params.appendData !== undefined) body.append_data = params.appendData;
    if (params.usePropertyOwner !== undefined)
      body.use_property_owner = params.usePropertyOwner;
    if (params.includeSearchAddress !== undefined)
      body.include_search_address = params.includeSearchAddress;

    let response = await this.axios.post('/mailing-lists-utils/buy-radius-search', body);
    return response.data;
  }

  // ---- Orders ----

  async listOrders(params?: {
    itemsPerPage?: number;
    subAccountId?: number;
  }): Promise<Record<string, unknown>> {
    let query: Record<string, string> = {};
    if (params?.itemsPerPage !== undefined) query.items_per_page = String(params.itemsPerPage);
    if (params?.subAccountId !== undefined) query.sub_account_id = String(params.subAccountId);

    let response = await this.axios.get('/orders/list', { params: query });
    return response.data;
  }

  async trackOrder(orderId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/orders/${orderId}/track`);
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.put(`/orders/${orderId}/cancel`);
    return response.data;
  }

  // ---- Templates ----

  async listImageTemplates(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/image-templates');
    return response.data;
  }

  async listMessageTemplates(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/message-templates');
    return response.data;
  }

  // ---- Handwriting Styles ----

  async listHandwritingStyles(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/handwriting-styles');
    return response.data;
  }

  // ---- Gift Card Brands ----

  async listGiftcardBrands(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/giftcard-brands');
    return response.data;
  }

  async listGiftcardBrandsFlat(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/giftcard-brands/flat');
    return response.data;
  }

  // ---- Sub-Accounts ----

  async listSubAccounts(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/sub-accounts');
    return response.data;
  }

  async createSubAccount(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.returnName !== undefined) body.return_name = params.returnName;
    if (params.returnAddress !== undefined) body.return_address = params.returnAddress;
    if (params.returnAddress2 !== undefined) body.return_address2 = params.returnAddress2;
    if (params.returnCity !== undefined) body.return_city = params.returnCity;
    if (params.returnState !== undefined) body.return_state = params.returnState;
    if (params.returnPostalCode !== undefined)
      body.return_postal_code = params.returnPostalCode;

    let response = await this.axios.post('/sub-accounts', body);
    return response.data;
  }

  async getSubAccount(subAccountId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.get(`/sub-accounts/${subAccountId}`);
    return response.data;
  }

  async updateSubAccount(
    subAccountId: number,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.returnName !== undefined) body.return_name = params.returnName;
    if (params.returnAddress !== undefined) body.return_address = params.returnAddress;
    if (params.returnAddress2 !== undefined) body.return_address2 = params.returnAddress2;
    if (params.returnCity !== undefined) body.return_city = params.returnCity;
    if (params.returnState !== undefined) body.return_state = params.returnState;
    if (params.returnPostalCode !== undefined)
      body.return_postal_code = params.returnPostalCode;

    let response = await this.axios.put(`/sub-accounts/${subAccountId}`, body);
    return response.data;
  }

  async deleteSubAccount(subAccountId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/sub-accounts/${subAccountId}`);
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks(params?: { itemsPerPage?: number }): Promise<Record<string, unknown>> {
    let query: Record<string, string> = {};
    if (params?.itemsPerPage !== undefined) query.items_per_page = String(params.itemsPerPage);

    let response = await this.axios.get('/webhooks', { params: query });
    return response.data;
  }

  async createWebhook(params: {
    url: string;
    type: string;
    verb: string;
    description?: string;
    mailingListId?: number;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      url: params.url,
      type: params.type,
      verb: params.verb
    };
    if (params.description !== undefined) body.description = params.description;
    if (params.mailingListId !== undefined) body.mailing_list_id = params.mailingListId;

    let response = await this.axios.post('/webhooks', body);
    return response.data;
  }

  async updateWebhook(
    webhookId: number,
    params: {
      url: string;
      type: string;
      verb: string;
      description?: string;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      url: params.url,
      type: params.type,
      verb: params.verb
    };
    if (params.description !== undefined) body.description = params.description;

    let response = await this.axios.put(`/webhooks/${webhookId}`, body);
    return response.data;
  }

  async deleteWebhook(webhookId: number): Promise<Record<string, unknown>> {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
