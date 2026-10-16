import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let legacyBaseUrl = 'https://api.handwrytten.com/v1';

let numericId = (value: string | undefined, field: string): number | undefined => {
  if (value === undefined) return undefined;
  let id = Number(value);
  if (!value.trim() || !Number.isSafeInteger(id) || id < 0) {
    throw createApiServiceError(`${field} must be a nonnegative integer ID.`, {
      reason: 'invalid_handwrytten_id'
    });
  }
  return id;
};

let splitName = (name?: string) => {
  let [firstName, ...lastName] = name?.trim().split(/\s+/) ?? [];
  return { firstName, lastName: lastName.join(' ') || undefined };
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Provide a Handwrytten API key.', {
        reason: 'missing_handwrytten_api_key'
      });
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.handwrytten.com/v2',
      authHeader: { value: config.token },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Handwrytten',
          reason: 'handwrytten_api_error'
        }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (
        isApiErrorRecord(data) &&
        (String(data.status).toLowerCase() === 'error' || Number(data.httpCode) >= 400)
      ) {
        throw buildApiServiceError(
          { response: { status: data.httpCode ?? response.status, data } },
          { providerLabel: 'Handwrytten', reason: 'handwrytten_api_error' }
        );
      }
      return response;
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
    withImages?: boolean;
  }): Promise<any> {
    let response = await this.axios.get('/cards/list', {
      params: {
        category_id: numericId(params?.categoryId, 'categoryId'),
        page: params?.page,
        with_images: params?.withImages ?? true
      }
    });
    return response.data;
  }

  async getCardDetails(cardId: string): Promise<any> {
    let response = await this.axios.get('/cards/view', {
      params: { card_id: numericId(cardId, 'cardId') }
    });
    return response.data;
  }

  async listCategories(): Promise<any> {
    let response = await this.axios.get('/categories/list');
    return response.data;
  }

  // ── Templates ─────────────────────────────────────────────────

  async listTemplates(categoryId?: string): Promise<any> {
    let response = await this.axios.get(`${legacyBaseUrl}/templates/list`, {
      params: categoryId ? { category_id: categoryId } : undefined
    });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`${legacyBaseUrl}/templates/view`, {
      params: { template_id: templateId }
    });
    return response.data;
  }

  async createTemplate(name: string, message: string): Promise<any> {
    let response = await this.axios.post(`${legacyBaseUrl}/templates/create`, {
      name,
      message
    });
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    data: { name?: string; message?: string }
  ): Promise<any> {
    let response = await this.axios.post(`${legacyBaseUrl}/templates/update`, {
      template_id: templateId,
      ...data
    });
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<any> {
    let response = await this.axios.post(`${legacyBaseUrl}/templates/delete`, {
      template_id: templateId
    });
    return response.data;
  }

  async listTemplateCategories(): Promise<any> {
    let response = await this.axios.get(`${legacyBaseUrl}/templateCategories/list`);
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
    state?: string;
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
      country_id: data.countryId === undefined ? undefined : String(data.countryId),
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
    let response = await this.axios.put('/profile/updateRecipient', {
      address_id: String(numericId(recipientId, 'recipientId')),
      first_name: data.firstName,
      last_name: data.lastName,
      business_name: data.businessName,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country_id: data.countryId === undefined ? undefined : String(data.countryId),
      birthday: data.birthday
    });
    return response.data;
  }

  async deleteRecipient(recipientId: string): Promise<any> {
    let response = await this.axios.post('/profile/deleteRecipient', {
      address_id: numericId(recipientId, 'recipientId')
    });
    return response.data;
  }

  async searchRecipients(query: string): Promise<any> {
    let allRecipients = await this.listRecipients();
    let recipients =
      allRecipients.addresses ?? allRecipients.recipients ?? allRecipients.data ?? [];
    let lowerQuery = query.toLowerCase();
    return recipients.filter((r: any) => {
      let searchable = [
        r.name,
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
    state?: string;
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
      country_id: data.countryId === undefined ? undefined : String(data.countryId),
      default: data.setDefault
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
    let sender = splitName(data.senderName);
    let recipient = splitName(data.recipientName);
    let response = await this.axios.post('/orders/singleStepOrder', {
      card_id: numericId(data.cardId, 'cardId'),
      message: data.message,
      font_label: data.fontLabel,
      sender_first_name: sender.firstName,
      sender_last_name: sender.lastName,
      sender_address1: data.senderAddress1,
      sender_address2: data.senderAddress2,
      sender_city: data.senderCity,
      sender_state: data.senderState,
      sender_zip: data.senderZip,
      sender_country_id: data.senderCountryId,
      recipient_first_name: recipient.firstName,
      recipient_last_name: recipient.lastName,
      recipient_business_name: data.recipientBusinessName,
      recipient_address1: data.recipientAddress1,
      recipient_address2: data.recipientAddress2,
      recipient_city: data.recipientCity,
      recipient_state: data.recipientState,
      recipient_zip: data.recipientZip,
      recipient_country_id: data.recipientCountryId,
      denomination_id: numericId(data.denominationId, 'giftCardDenominationId'),
      insert_id: numericId(data.insertId, 'insertId'),
      credit_card_id: numericId(data.creditCardId, 'creditCardId'),
      date_send: data.dateSend,
      validate_address: data.validateAddress
    });
    return response.data;
  }

  async listOrders(): Promise<any> {
    let response = await this.axios.get(`${legacyBaseUrl}/orders/listGrouped`);
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
      card_id: numericId(data.cardId, 'cardId'),
      font: data.font,
      font_size: data.fontSize,
      auto_font_size: data.autoFontSize,
      return_address_id: numericId(data.returnAddressId, 'returnAddressId'),
      denomination_id: numericId(data.denominationId, 'giftCardDenominationId'),
      insert_id: numericId(data.insertId, 'insertId')
    };

    let addresses = data.addresses;
    if (data.addressId) {
      numericId(data.addressId, 'addressId');
      let result = await this.listRecipients();
      let recipient = (result.addresses ?? []).find(
        (address: { id: string | number }) => String(address.id) === data.addressId
      );
      if (!recipient) {
        throw createApiServiceError(
          'Recipient address not found. Choose addressId from manage_address_book.',
          {
            reason: 'invalid_handwrytten_address'
          }
        );
      }
      let name = splitName(recipient.name);
      addresses = [
        {
          toFirstName: recipient.first_name ?? name.firstName,
          toLastName: recipient.last_name ?? name.lastName,
          toBusinessName: recipient.business_name,
          toAddress1: recipient.address1,
          toAddress2: recipient.address2,
          toCity: recipient.city,
          toState: recipient.state,
          toZip: String(recipient.zip),
          toCountryId: recipient.country_id != null ? Number(recipient.country_id) : undefined
        }
      ];
    }
    if (addresses && addresses.length > 0) {
      let countries = await this.listCountries();
      let countryNames = new Map<number, string>(
        (countries.countries ?? []).map((country: { id: string | number; name: string }) => [
          Number(country.id),
          country.name
        ])
      );
      for (let address of addresses) {
        if (!countryNames.has(address.toCountryId ?? 1)) {
          throw createApiServiceError('Choose a recipient country ID from list_countries.', {
            reason: 'invalid_handwrytten_country'
          });
        }
      }
      body.addresses = addresses.map(a => ({
        to_first_name: a.toFirstName,
        to_last_name: a.toLastName,
        to_business_name: a.toBusinessName,
        to_address1: a.toAddress1,
        to_address2: a.toAddress2,
        to_city: a.toCity,
        to_state: a.toState,
        to_zip: a.toZip,
        to_country: countryNames.get(a.toCountryId ?? 1),
        message: data.message,
        date_send: data.dateSend,
        signature_id: numericId(data.signatureId, 'signatureId')
      }));
    }

    if (!addresses?.length) {
      throw createApiServiceError('Provide an addressId or a nonempty recipients array.');
    }
    let response = await this.axios.post('/orders/placeBasket', body);
    return response.data;
  }

  async sendBasket(creditCardId?: string): Promise<any> {
    let response = await this.axios.post('/basket/send', {
      credit_card_id: numericId(creditCardId, 'creditCardId')
    });
    return response.data;
  }

  async getBasket(): Promise<any> {
    let response = await this.axios.get(`${legacyBaseUrl}/basket/listGrouped`);
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
    let response = await this.axios.get(`${legacyBaseUrl}/creditCards/list`);
    return response.data;
  }

  // ── Inserts ───────────────────────────────────────────────────

  async listInserts(includeHistorical?: boolean): Promise<any> {
    let response = await this.axios.get('/inserts/list', {
      params: { include_historical: includeHistorical }
    });
    return response.data;
  }

  async getOrder(orderId: string): Promise<any> {
    let response = await this.axios.get('/orders/details', {
      params: { id: numericId(orderId, 'orderId') }
    });
    return response.data;
  }

  async cancelOrder(orderId: string): Promise<any> {
    let response = await this.axios.post('/orders/cancel', {
      order_id: numericId(orderId, 'orderId')
    });
    return response.data;
  }

  async deleteReturnAddress(addressId: string): Promise<any> {
    let response = await this.axios.post('/profile/deleteAddress', {
      id: numericId(addressId, 'addressId')
    });
    return response.data;
  }

  async setDefaultReturnAddress(addressId: string): Promise<any> {
    let response = await this.axios.post('/profile/setDefaultAddress', {
      id: numericId(addressId, 'addressId')
    });
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
