import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.handwrytten.com/v1',
      headers: {
        Authorization: config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Auth / User ───────────────────────────────────────────────

  async getUser(): Promise<any> {
    let response = await this.axios.get('/auth/getUser');
    return response.data;
  }

  // ── Fonts (Handwriting Styles) ────────────────────────────────

  async listFonts(): Promise<any> {
    let response = await this.axios.get('/fonts/list');
    return response.data;
  }

  // ── Cards & Categories ────────────────────────────────────────

  async listCards(params?: {
    categoryId?: string;
    page?: number;
    withImages?: number;
  }): Promise<any> {
    let response = await this.axios.get('/cards/list', {
      params: {
        category_id: params?.categoryId,
        page: params?.page,
        with_images: params?.withImages ?? 1
      }
    });
    return response.data;
  }

  async getCardDetails(cardId: string): Promise<any> {
    let response = await this.axios.get('/cards/view', {
      params: { card_id: cardId }
    });
    return response.data;
  }

  async listCategories(): Promise<any> {
    let response = await this.axios.get('/categories/list');
    return response.data;
  }

  // ── Templates ─────────────────────────────────────────────────

  async listTemplates(categoryId?: string): Promise<any> {
    let response = await this.axios.get('/templates/list', {
      params: categoryId ? { category_id: categoryId } : undefined
    });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get('/templates/view', {
      params: { template_id: templateId }
    });
    return response.data;
  }

  async createTemplate(name: string, message: string): Promise<any> {
    let response = await this.axios.post('/templates/create', { name, message });
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    data: { name?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post('/templates/update', {
      template_id: templateId,
      ...data
    });
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<any> {
    let response = await this.axios.post('/templates/delete', { template_id: templateId });
    return response.data;
  }

  async listTemplateCategories(): Promise<any> {
    let response = await this.axios.get('/templateCategories/list');
    return response.data;
  }

  // ── Address Book (Recipients) ─────────────────────────────────

  async listRecipients(): Promise<any> {
    let response = await this.axios.get('/profile/recipientsList');
    return response.data;
  }

  async addRecipient(data: {
    firstName?: string;
    lastName?: string;
    businessName?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    countryId?: number;
    birthday?: string;
  }): Promise<any> {
    let response = await this.axios.post('/profile/addRecipient', {
      first_name: data.firstName,
      last_name: data.lastName,
      business_name: data.businessName,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country_id: data.countryId,
      birthday: data.birthday
    });
    return response.data;
  }

  async updateRecipient(
    recipientId: string,
    data: {
      firstName?: string;
      lastName?: string;
      businessName?: string;
      address1?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      countryId?: number;
      birthday?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post('/profile/updateRecipient', {
      id: recipientId,
      first_name: data.firstName,
      last_name: data.lastName,
      business_name: data.businessName,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country_id: data.countryId,
      birthday: data.birthday
    });
    return response.data;
  }

  async deleteRecipient(recipientId: string): Promise<any> {
    let response = await this.axios.post('/profile/deleteRecipient', {
      id: recipientId
    });
    return response.data;
  }

  async searchRecipients(query: string): Promise<any> {
    let allRecipients = await this.listRecipients();
    let recipients = allRecipients.recipients ?? allRecipients.data ?? [];
    let lowerQuery = query.toLowerCase();
    return recipients.filter((r: any) => {
      let searchable = [
        r.first_name,
        r.last_name,
        r.business_name,
        r.address1,
        r.city,
        r.state,
        r.zip,
        r.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(lowerQuery);
    });
  }

  // ── Return Addresses ──────────────────────────────────────────

  async listReturnAddresses(): Promise<any> {
    let response = await this.axios.get('/profile/listAddresses');
    return response.data;
  }

  async createReturnAddress(data: {
    firstName?: string;
    lastName?: string;
    businessName?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    countryId?: number;
    setDefault?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/profile/createAddress', {
      first_name: data.firstName,
      last_name: data.lastName,
      business_name: data.businessName,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country_id: data.countryId,
      default: data.setDefault ? 1 : 0
    });
    return response.data;
  }

  // ── Orders ────────────────────────────────────────────────────

  async sendCard(data: {
    cardId: string;
    message: string;
    fontLabel: string;
    senderName?: string;
    senderAddress1?: string;
    senderAddress2?: string;
    senderCity?: string;
    senderState?: string;
    senderZip?: string;
    senderCountryId?: number;
    recipientName: string;
    recipientBusinessName?: string;
    recipientAddress1: string;
    recipientAddress2?: string;
    recipientCity: string;
    recipientState: string;
    recipientZip: string;
    recipientCountryId?: number;
    denominationId?: string;
    insertId?: string;
    creditCardId?: string;
    dateSend?: string;
    validateAddress?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/orders/singleStepOrder', {
      card_id: data.cardId,
      message: data.message,
      font_label: data.fontLabel,
      sender_name: data.senderName,
      sender_address1: data.senderAddress1,
      sender_address2: data.senderAddress2,
      sender_city: data.senderCity,
      sender_state: data.senderState,
      sender_zip: data.senderZip,
      sender_country_id: data.senderCountryId,
      recipient_name: data.recipientName,
      recipient_business_name: data.recipientBusinessName,
      recipient_address1: data.recipientAddress1,
      recipient_address2: data.recipientAddress2,
      recipient_city: data.recipientCity,
      recipient_state: data.recipientState,
      recipient_zip: data.recipientZip,
      recipient_country_id: data.recipientCountryId,
      denomination_id: data.denominationId,
      insert_id: data.insertId,
      credit_card_id: data.creditCardId,
      date_send: data.dateSend,
      validate_address: data.validateAddress ? 1 : 0
    });
    return response.data;
  }

  async listOrders(): Promise<any> {
    let response = await this.axios.get('/orders/listGrouped');
    return response.data;
  }

  // ── Basket ────────────────────────────────────────────────────

  async addToBasket(data: {
    cardId: string;
    message: string;
    font: string;
    fontSize?: number;
    autoFontSize?: boolean;
    returnAddressId?: string;
    addressId?: string;
    addresses?: Array<{
      toFirstName?: string;
      toLastName?: string;
      toBusinessName?: string;
      toAddress1: string;
      toAddress2?: string;
      toCity: string;
      toState: string;
      toZip: string;
      toCountryId?: number;
    }>;
    denominationId?: string;
    insertId?: string;
    dateSend?: string;
    signatureId?: string;
  }): Promise<any> {
    let body: any = {
      card_id: data.cardId,
      message: data.message,
      font: data.font,
      font_size: data.fontSize,
      auto_font_size: data.autoFontSize ? 1 : 0,
      return_address_id: data.returnAddressId,
      denomination_id: data.denominationId,
      insert_id: data.insertId,
      date_send: data.dateSend,
      signature_id: data.signatureId
    };

    if (data.addressId) {
      body.address_id = data.addressId;
    } else if (data.addresses && data.addresses.length > 0) {
      body.addresses = data.addresses.map(a => ({
        to_first_name: a.toFirstName,
        to_last_name: a.toLastName,
        to_business_name: a.toBusinessName,
        to_address1: a.toAddress1,
        to_address2: a.toAddress2,
        to_city: a.toCity,
        to_state: a.toState,
        to_zip: a.toZip,
        to_country_id: a.toCountryId
      }));
    }

    let response = await this.axios.post('/orders/placeBasket', body);
    return response.data;
  }

  async sendBasket(creditCardId?: string): Promise<any> {
    let response = await this.axios.post('/basket/send', {
      credit_card_id: creditCardId
    });
    return response.data;
  }

  async getBasket(): Promise<any> {
    let response = await this.axios.get('/basket/listGrouped');
    return response.data;
  }

  async getBasketCount(): Promise<any> {
    let response = await this.axios.get('/basket/count');
    return response.data;
  }

  async clearBasket(): Promise<any> {
    let response = await this.axios.post('/basket/clear');
    return response.data;
  }

  // ── Gift Cards ────────────────────────────────────────────────

  async listGiftCards(): Promise<any> {
    let response = await this.axios.get('/giftCards/list');
    return response.data;
  }

  // ── Credit Cards ──────────────────────────────────────────────

  async listCreditCards(): Promise<any> {
    let response = await this.axios.get('/creditCards/list');
    return response.data;
  }

  // ── Inserts ───────────────────────────────────────────────────

  async listInserts(): Promise<any> {
    let response = await this.axios.get('/inserts/list');
    return response.data;
  }

  // ── Countries & States ────────────────────────────────────────

  async listCountries(): Promise<any> {
    let response = await this.axios.get('/countries/list');
    return response.data;
  }

  async listStates(countryId: number): Promise<any> {
    let response = await this.axios.get('/countries/listStates', {
      params: { country_id: countryId }
    });
    return response.data;
  }
}
