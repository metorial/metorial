import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export interface AmcardsObject {
  id?: string | number;
  resource_uri?: string;
  [key: string]: unknown;
}

export interface AmcardsUser extends AmcardsObject {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface AmcardsContact extends AmcardsObject {
  first_name?: string;
  last_name?: string;
  email_address?: string;
  email?: string;
  added?: string;
  updated?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AmcardsCard extends AmcardsObject {
  status?: string | number;
  shipping_first_name?: string;
  shipping_last_name?: string;
  to_first_name?: string;
  to_last_name?: string;
  recipient_first_name?: string;
  recipient_last_name?: string;
  send_date?: string;
  created?: string;
  created_at?: string;
}

export interface AmcardsTemplate extends AmcardsObject {
  name?: string;
  title?: string;
  category?: { title?: string } | string;
  category_name?: string;
}

export interface AmcardsSendResponse extends AmcardsObject {
  card?: string | number;
  status?: string | number;
  send_date?: string;
  total_cost?: number;
  mailing?: string | number;
  cards?: (string | number)[];
}

export interface PageParams {
  limit?: number;
  skip?: number;
}

export interface AmcardsPage<T> {
  items: T[];
  providerTotalCount?: number;
  nextSkip?: number;
  rawResponse: unknown;
}

export interface SendCardParams {
  quicksendTemplateId: string;
  initiator: string;
  message?: string;
  sendDate?: string;
  thirdPartyContactId?: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientOrganization?: string;
  recipientAddressLine1: string;
  recipientAddressLine2?: string;
  recipientCity: string;
  recipientState: string;
  recipientPostalCode: string;
  recipientCountry?: string;
  fromFirstName: string;
  fromLastName?: string;
  fromAddressLine1?: string;
  fromAddressLine2?: string;
  fromCity?: string;
  fromState?: string;
  fromPostalCode?: string;
  fromCountry?: string;
  extraData?: Record<string, string>;
}

export interface ScheduleDripCampaignParams
  extends Omit<SendCardParams, 'quicksendTemplateId' | 'message' | 'fromFirstName'> {
  campaignId: string;
  fromFirstName?: string;
  recipientSalutation?: string;
  recipientBirthDate?: string;
  recipientPhoneNumber?: string;
  recipientAnniversaryDate?: string;
}

export interface GetContactsParams extends PageParams {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CreateContactParams {
  firstName: string;
  lastName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  notes?: string;
  email?: string;
  organization?: string;
  phone?: string;
  birthYear?: string;
  birthMonth?: string;
  birthDay?: string;
  anniversaryYear?: string;
  anniversaryMonth?: string;
  anniversaryDay?: string;
}

export let resourceId = (record: AmcardsObject): string | undefined => {
  if (record.id != null) return String(record.id);
  return record.resource_uri?.match(/\/([^/]+)\/$/)?.[1];
};

let paginationParams = (params: PageParams) => {
  if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
    throw createApiServiceError('limit must be a positive integer.');
  }
  if (params.skip !== undefined && (!Number.isInteger(params.skip) || params.skip < 0)) {
    throw createApiServiceError('skip must be a non-negative integer.');
  }
  return { limit: params.limit ?? 25, offset: params.skip ?? 0 };
};

let parsePage = <T extends AmcardsObject>(raw: unknown): AmcardsPage<T> => {
  let record = isApiErrorRecord(raw) ? raw : undefined;
  let items = Array.isArray(raw) ? raw : (record?.objects ?? record?.results);
  if (!Array.isArray(items) || !items.every(isApiErrorRecord)) {
    throw createApiServiceError('AMcards returned an unexpected list response.');
  }
  let meta = isApiErrorRecord(record?.meta) ? record.meta : undefined;
  let next = typeof meta?.next === 'string' ? meta.next : undefined;
  let offsetMatch = next?.match(/[?&]offset=(\d+)/);
  return {
    items: items as T[],
    providerTotalCount: typeof meta?.total_count === 'number' ? meta.total_count : undefined,
    nextSkip: offsetMatch ? Number(offsetMatch[1]) : undefined,
    rawResponse: raw
  };
};

let validateDate = (value: string | undefined, name: string) => {
  if (value === undefined) return;
  let parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw createApiServiceError(`${name} must be a valid date in YYYY-MM-DD format.`);
  }
};

let shippingAddress = (
  params: Omit<SendCardParams, 'quicksendTemplateId' | 'fromFirstName'>
) =>
  pickDefined({
    first_name: params.recipientFirstName,
    last_name: params.recipientLastName,
    organization: params.recipientOrganization,
    address_line_1: params.recipientAddressLine1,
    address_line_2: params.recipientAddressLine2,
    city: params.recipientCity,
    state: params.recipientState,
    postal_code: params.recipientPostalCode,
    country: params.recipientCountry,
    third_party_contact_id: params.thirdPartyContactId
  });

let returnAddress = (params: Partial<SendCardParams>) =>
  pickDefined({
    return_first_name: params.fromFirstName,
    return_last_name: params.fromLastName,
    return_address_line_1: params.fromAddressLine1,
    return_address_line_2: params.fromAddressLine2,
    return_city: params.fromCity,
    return_state: params.fromState,
    return_postal_code: params.fromPostalCode,
    return_country: params.fromCountry
  });

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://amcards.com',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'AMcards', reason: 'amcards_api_error' })
    });
  }

  async getUser(): Promise<{ user: AmcardsUser; rawResponse: unknown }> {
    let response = await this.axios.get('/.api/v1/user/');
    let user = parsePage<AmcardsUser>(response.data).items[0];
    if (!user || !resourceId(user)) {
      throw createApiServiceError(
        'AMcards did not return an authenticated user account. Check your access token.'
      );
    }
    return { user, rawResponse: response.data };
  }

  async getCards(params: PageParams & { thirdPartyContactId?: string } = {}) {
    let response = await this.axios.get('/.api/v1/card/', {
      params: pickDefined({
        ...paginationParams(params),
        third_party_contact_id: params.thirdPartyContactId
      })
    });
    return parsePage<AmcardsCard>(response.data);
  }

  async getCard(cardId: string): Promise<AmcardsCard> {
    let response = await this.axios.get(`/.api/v1/card/${encodeURIComponent(cardId)}/`);
    return response.data;
  }

  async getContacts(params: GetContactsParams = {}) {
    let response = await this.axios.get('/.api/v1/contact/', {
      params: pickDefined({
        ...paginationParams(params),
        first_name: params.firstName,
        last_name: params.lastName,
        email_address: params.email
      })
    });
    return parsePage<AmcardsContact>(response.data);
  }

  async getContact(contactId: string): Promise<AmcardsContact> {
    let response = await this.axios.get(`/.api/v1/contact/${encodeURIComponent(contactId)}/`);
    return response.data;
  }

  async createContact(params: CreateContactParams) {
    let { user } = await this.getUser();
    let response = await this.axios.post(
      '/.api/v1/contact/',
      pickDefined({
        owner: `/.api/v1/user/${encodeURIComponent(resourceId(user)!)}/`,
        first_name: params.firstName,
        last_name: params.lastName,
        address_line_1: params.addressLine1,
        city: params.city,
        state: params.state,
        postal_code: params.postalCode,
        country: params.country,
        notes: params.notes ?? '',
        groups: '',
        email_address: params.email,
        organization: params.organization,
        phone_number: params.phone,
        birth_year: params.birthYear,
        birth_month: params.birthMonth,
        birth_day: params.birthDay,
        anniversary_year: params.anniversaryYear,
        anniversary_month: params.anniversaryMonth,
        anniversary_day: params.anniversaryDay
      })
    );
    let created = isApiErrorRecord(response.data) ? response.data : undefined;
    let resourceUri =
      getResponseHeaderValue(response.headers, 'location') ??
      (typeof created?.resource_uri === 'string' ? created.resource_uri : undefined);
    let id = created?.id;
    return {
      contactId:
        typeof id === 'string' || typeof id === 'number'
          ? String(id)
          : resourceUri?.match(/\/([^/]+)\/$/)?.[1],
      rawResponse: response.data,
      resourceUri
    };
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(
      `/.api/v1/contact/${encodeURIComponent(contactId)}/`
    );
    return response.data;
  }

  async sendCard(params: SendCardParams): Promise<AmcardsSendResponse> {
    validateDate(params.sendDate, 'sendDate');
    let response = await this.axios.post(
      '/cards/open-card-form-oa/',
      pickDefined({
        template_id: params.quicksendTemplateId,
        initiator: params.initiator,
        ...shippingAddress(params),
        ...returnAddress(params),
        message: params.message,
        send_date: params.sendDate,
        extra_data: params.extraData
      })
    );
    return response.data;
  }

  async scheduleDripCampaign(
    params: ScheduleDripCampaignParams
  ): Promise<AmcardsSendResponse> {
    validateDate(params.sendDate, 'sendDate');
    validateDate(params.recipientAnniversaryDate, 'recipientAnniversaryDate');
    if (params.recipientBirthDate) {
      validateDate(
        /^\d{2}-\d{2}$/.test(params.recipientBirthDate)
          ? `2000-${params.recipientBirthDate}`
          : params.recipientBirthDate,
        'recipientBirthDate'
      );
    }
    let response = await this.axios.post(
      '/campaigns/open-campaign-form/',
      pickDefined({
        campaign_id: params.campaignId,
        initiator: params.initiator,
        ...shippingAddress(params),
        ...returnAddress(params),
        salutation: params.recipientSalutation,
        birth_date: params.recipientBirthDate,
        phone_number: params.recipientPhoneNumber,
        anniversary_date: params.recipientAnniversaryDate,
        send_date: params.sendDate,
        extra_data: params.extraData
      })
    );
    return response.data;
  }

  async cancelCardsByContact(thirdPartyContactId: string): Promise<unknown> {
    let response = await this.axios.post('/.api/v1/cards/cancel/', {
      third_party_contact_id: thirdPartyContactId
    });
    return response.data;
  }

  async listPublicTemplates(
    params: PageParams & { categoryId?: number; nameContains?: string } = {}
  ) {
    let response = await this.axios.get('/.api/v1/templates/', {
      params: pickDefined({
        ...paginationParams(params),
        category__id: params.categoryId,
        name__icontains: params.nameContains
      })
    });
    return parsePage<AmcardsTemplate>(response.data);
  }

  async listQuicksendTemplates(params: PageParams = {}) {
    let response = await this.axios.get('/.api/v1/quicksendtemplate/', {
      params: paginationParams(params)
    });
    return parsePage<AmcardsTemplate>(response.data);
  }

  async listCampaigns(params: PageParams = {}) {
    let response = await this.axios.get('/.api/v1/campaign/', {
      params: paginationParams(params)
    });
    return parsePage<AmcardsObject>(response.data);
  }
}
