import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface MailerParams {
  size?: string;
  creativeId?: number;
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
  additionalPagesUrl?: string;
  pdfOnlyUrl?: string;
  giftcardBrand?: string;
  giftcardAmountInCents?: number;
  metadata?: Record<string, unknown>;
}

export interface RadiusSearchParams {
  address: string;
  postalCode: string;
  recordCount: number;
  mailingListId?: number;
  recordTypes?: string;
  includeCondos?: boolean;
  appendData?: boolean;
  usePropertyOwner?: boolean;
  includeSearchAddress?: boolean;
}

export interface ListParams {
  page?: number;
  itemsPerPage?: number;
  subAccountId?: number;
  type?: string;
  creativeId?: number;
  campaignId?: number;
}

export class ThanksIoClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.thanks.io/api/v2',
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Thanks.io',
          reason: 'thanks_io_api_failed'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.failure === true || response.data?.success === false) {
        throw createApiServiceError(
          response.data.message || 'Thanks.io could not complete the request.'
        );
      }
      return response;
    });
  }

  private mailerBody(params: MailerParams) {
    let body = pickDefined({
      size: params.size,
      creative_id: params.creativeId,
      front_image_url: params.frontImageUrl,
      image_template_id: params.imageTemplate,
      message: params.message,
      message_template_id: params.messageTemplate,
      use_custom_background: params.useCustomBackground,
      custom_background_image: params.customBackgroundImage,
      qrcode_url: params.qrcodeUrl,
      mailing_list_ids: params.mailingLists,
      recipients: params.recipients,
      radius_search: params.radiusSearch,
      handwriting_style_id: params.handwritingStyle,
      handwriting_color: params.handwritingColor,
      handwriting_realism: params.handwritingRealism,
      sub_account: params.subAccount,
      notification_emails: params.emailAdditional,
      send_standard_mail: params.sendStandardMail,
      return_name: params.returnName,
      return_address: params.returnAddress,
      return_address2: params.returnAddress2,
      return_city: params.returnCity,
      return_state: params.returnState,
      return_postal_code: params.returnPostalCode,
      preview: params.preview,
      additional_pages_url: params.additionalPagesUrl,
      pdf_only_url: params.pdfOnlyUrl,
      giftcard_brand: params.giftcardBrand,
      giftcard_amount_in_cents: params.giftcardAmountInCents,
      metadata: params.metadata
    });
    if (!params.recipients?.length && !params.mailingLists?.length && !params.radiusSearch) {
      throw createApiServiceError('Provide recipients, mailingListIds, or radiusSearch.');
    }
    if (params.recipients?.some(recipient => !recipient.address && !recipient.email)) {
      throw createApiServiceError(
        'Every recipient requires an address or email. Email address lookup may incur a fee.'
      );
    }
    if (params.creativeId !== undefined) {
      let conflicting = [
        params.frontImageUrl,
        params.imageTemplate,
        params.message,
        params.messageTemplate,
        params.handwritingStyle,
        params.handwritingColor,
        params.handwritingRealism,
        params.useCustomBackground,
        params.customBackgroundImage,
        params.pdfOnlyUrl,
        params.giftcardBrand,
        params.giftcardAmountInCents
      ];
      if (conflicting.some(value => value !== undefined)) {
        throw createApiServiceError(
          'creativeId cannot be combined with design, message, handwriting, background, PDF-only, or gift card settings. Use the saved creative settings.'
        );
      }
    }
    if (
      params.metadata &&
      new TextEncoder().encode(JSON.stringify(params.metadata)).length > 8192
    ) {
      throw createApiServiceError('metadata must be at most 8192 bytes when encoded as JSON.');
    }
    return body;
  }

  async sendPostcard(params: MailerParams): Promise<Record<string, unknown>> {
    return (await this.axios.post('/send/postcard', this.mailerBody(params))).data;
  }

  async sendNotecard(params: MailerParams): Promise<Record<string, unknown>> {
    return (await this.axios.post('/send/notecard', this.mailerBody(params))).data;
  }

  async sendLetter(
    params: MailerParams & { letterType: 'windowed' | 'windowless' }
  ): Promise<Record<string, unknown>> {
    let endpoint = params.letterType === 'windowed' ? 'windowedletter' : 'windowlessletter';
    return (await this.axios.post(`/send/${endpoint}`, this.mailerBody(params))).data;
  }

  async sendGiftcard(params: MailerParams): Promise<Record<string, unknown>> {
    if (
      params.giftcardAmountInCents !== undefined &&
      (!Number.isInteger(params.giftcardAmountInCents) || params.giftcardAmountInCents <= 0)
    ) {
      throw createApiServiceError(
        'giftcardAmountInCents must be a positive whole number of cents from the gift card catalog.'
      );
    }
    if (
      params.creativeId === undefined &&
      (!params.giftcardBrand || !params.giftcardAmountInCents)
    ) {
      throw createApiServiceError(
        'Provide giftcardBrand and giftcardAmountInCents, or use a saved creativeId.'
      );
    }
    return (await this.axios.post('/send/giftcard', this.mailerBody(params))).data;
  }

  async estimateMailer(
    mailerType: string,
    params: MailerParams
  ): Promise<Record<string, unknown>> {
    return (await this.axios.post(`/estimate/${mailerType}`, this.mailerBody(params))).data;
  }

  private recipientBody(params: Record<string, unknown>) {
    return pickDefined({
      mailing_list_id: params.mailingListId,
      name: params.name,
      company: params.company,
      address: params.address,
      address2: params.address2,
      city: params.city,
      province: params.province,
      postal_code: params.postalCode,
      country: params.country,
      email: params.email,
      phone: params.phone,
      dob: params.dob,
      anniversary: params.anniversary,
      custom1: params.custom1,
      custom2: params.custom2,
      custom3: params.custom3,
      custom4: params.custom4,
      custom5: params.custom5,
      custom6: params.custom6,
      custom7: params.custom7,
      custom8: params.custom8,
      custom9: params.custom9,
      custom10: params.custom10
    });
  }

  async createRecipient(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!params.address && !params.email)
      throw createApiServiceError(
        'Provide a recipient address or email. Email address lookup may incur a fee.'
      );
    return (await this.axios.post('/recipients', this.recipientBody(params))).data;
  }

  async createMultipleRecipients(
    recipients: Record<string, unknown>[]
  ): Promise<Record<string, unknown>> {
    return (
      await this.axios.post(
        '/recipients-utils/create-multiple',
        recipients.map(recipient => {
          if (!recipient.mailingListId || (!recipient.address && !recipient.email)) {
            throw createApiServiceError(
              'Every recipient requires mailingListId and an address or email.'
            );
          }
          return this.recipientBody(recipient);
        })
      )
    ).data;
  }

  async getRecipient(recipientId: number): Promise<Record<string, unknown>> {
    return (await this.axios.get(`/recipients/${recipientId}`)).data;
  }

  async updateRecipient(
    recipientId: number,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return (await this.axios.put(`/recipients/${recipientId}`, this.recipientBody(params)))
      .data;
  }

  async deleteRecipient(recipientId: number): Promise<Record<string, unknown>> {
    return (await this.axios.delete(`/recipients/${recipientId}`)).data;
  }

  async deleteRecipientByAddress(
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!params.email && (!params.address || !params.postalCode)) {
      throw createApiServiceError(
        'Provide email, or both address and postalCode, to delete a recipient.'
      );
    }
    return (
      await this.axios.post('/recipients-utils/delete-by-address', this.recipientBody(params))
    ).data;
  }

  private listQuery(params: ListParams = {}) {
    return pickDefined({
      page: params.page,
      items_per_page: params.itemsPerPage,
      sub_account_id: params.subAccountId,
      type: params.type,
      creative_id: params.creativeId,
      campaign: params.campaignId
    });
  }

  async listMailingLists(params?: ListParams): Promise<Record<string, unknown>> {
    return (await this.axios.get('/mailing-lists/', { params: this.listQuery(params) })).data;
  }

  async createMailingList(params: {
    description: string;
    subAccountId?: number;
    qrcodeUrl?: string;
  }): Promise<Record<string, unknown>> {
    return (
      await this.axios.post(
        '/mailing-lists/',
        pickDefined({
          description: params.description,
          sub_account_id: params.subAccountId,
          qrcode_url: params.qrcodeUrl
        })
      )
    ).data;
  }

  async getMailingList(id: number): Promise<Record<string, unknown>> {
    return (await this.axios.get(`/mailing-lists/${id}`)).data;
  }

  async deleteMailingList(id: number): Promise<Record<string, unknown>> {
    return (await this.axios.delete(`/mailing-lists/${id}`)).data;
  }

  async listMailingListRecipients(
    id: number,
    params?: { limit?: number; updatedSince?: string; page?: number }
  ): Promise<Record<string, unknown>> {
    return (
      await this.axios.get(`/mailing-lists-utils/recipients/${id}`, {
        params: pickDefined({
          limit: params?.limit,
          updated_since: params?.updatedSince,
          page: params?.page
        })
      })
    ).data;
  }

  private radiusBody(params: RadiusSearchParams) {
    return pickDefined({
      address: params.address,
      postal_code: params.postalCode,
      record_count: params.recordCount,
      mailing_list_id: params.mailingListId,
      record_types: params.recordTypes,
      include_condos: params.includeCondos,
      append_data: params.appendData,
      use_property_owner: params.usePropertyOwner,
      include_search_address: params.includeSearchAddress
    });
  }

  async buyRadiusSearch(params: RadiusSearchParams): Promise<Record<string, unknown>> {
    if (
      !Number.isInteger(params.recordCount) ||
      params.recordCount < 1 ||
      params.recordCount > 2500
    ) {
      throw createApiServiceError(
        'A radius purchase requires recordCount from 1 to 2500; API Test Mode limits purchases to 5 records.'
      );
    }
    return (
      await this.axios.post('/mailing-lists-utils/buy-radius-search', this.radiusBody(params))
    ).data;
  }

  async countRadiusSearch(params: RadiusSearchParams): Promise<Record<string, unknown>> {
    return (
      await this.axios.post(
        '/mailing-lists-utils/count-radius-search',
        this.radiusBody(params)
      )
    ).data;
  }

  async listOrders(params?: ListParams): Promise<Record<string, unknown>> {
    return (await this.axios.get('/orders/list', { params: this.listQuery(params) })).data;
  }

  async listOrderItems(
    orderId: string,
    params: { page?: number; perPage?: number }
  ): Promise<Record<string, unknown>> {
    return (
      await this.axios.get(`/orders/${encodeURIComponent(orderId)}/items`, {
        params: pickDefined({ page: params.page, per_page: params.perPage })
      })
    ).data;
  }

  async trackOrder(orderId: string): Promise<Record<string, unknown>> {
    return (await this.axios.get(`/orders/${encodeURIComponent(orderId)}/track`)).data;
  }

  async cancelOrder(orderId: string): Promise<Record<string, unknown>> {
    return (await this.axios.put(`/orders/${encodeURIComponent(orderId)}/cancel`)).data;
  }

  async listImageTemplates(params?: ListParams): Promise<Record<string, unknown>> {
    return (await this.axios.get('/image-templates/', { params: this.listQuery(params) }))
      .data;
  }

  async listMessageTemplates(params?: ListParams): Promise<Record<string, unknown>> {
    return (await this.axios.get('/message-templates/', { params: this.listQuery(params) }))
      .data;
  }

  async listCreatives(params: {
    page?: number;
    subAccountId?: number;
    mailerType?: string;
    completeOnly?: boolean;
    search?: string;
    includeHidden?: boolean;
  }): Promise<Record<string, unknown>> {
    return (
      await this.axios.get('/creatives/', {
        params: pickDefined({
          page: params.page,
          sub_account_id: params.subAccountId,
          mailer_type: params.mailerType,
          complete_only:
            params.completeOnly === undefined ? undefined : Number(params.completeOnly),
          search: params.search,
          include_hidden:
            params.includeHidden === undefined ? undefined : Number(params.includeHidden)
        })
      })
    ).data;
  }

  async getCreative(id: number): Promise<Record<string, unknown>> {
    return (await this.axios.get(`/creatives/${id}`)).data;
  }

  async listHandwritingStyles(): Promise<Record<string, unknown>> {
    return (await this.axios.get('/handwriting-styles')).data;
  }

  async listGiftcardBrands(): Promise<Record<string, unknown>> {
    return (await this.axios.get('/giftcard-brands')).data;
  }

  async listGiftcardBrandsFlat(): Promise<Record<string, unknown>> {
    return (await this.axios.get('/giftcard-brands-list')).data;
  }

  async listSubAccounts(): Promise<Record<string, unknown>> {
    return (await this.axios.get('/sub-accounts/')).data;
  }

  private subAccountBody(params: Record<string, unknown>) {
    return pickDefined({
      title: params.name,
      return_name: params.returnName,
      return_address: params.returnAddress,
      return_address2: params.returnAddress2,
      return_city: params.returnCity,
      return_state: params.returnState,
      return_postal_code: params.returnPostalCode
    });
  }

  async createSubAccount(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!params.name) throw createApiServiceError('name is required to create a sub-account.');
    return (await this.axios.post('/sub-accounts/', this.subAccountBody(params))).data;
  }

  async getSubAccount(id: number): Promise<Record<string, unknown>> {
    return (await this.axios.get(`/sub-accounts/${id}`)).data;
  }

  async updateSubAccount(
    id: number,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!params.name) {
      let existing = await this.getSubAccount(id);
      params = { ...params, name: existing.title };
    }
    return (await this.axios.put(`/sub-accounts/${id}`, this.subAccountBody(params))).data;
  }

  async deleteSubAccount(id: number): Promise<Record<string, unknown>> {
    return (await this.axios.delete(`/sub-accounts/${id}`)).data;
  }
}
