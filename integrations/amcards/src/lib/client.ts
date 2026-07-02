import { createAxios } from 'slates';

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
}

export interface ScheduleDripCampaignParams {
  campaignId: string;
  initiator: string;
  sendDate?: string;
  thirdPartyContactId?: string;
  recipientSalutation?: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientOrganization?: string;
  recipientAddressLine1: string;
  recipientAddressLine2?: string;
  recipientCity: string;
  recipientState: string;
  recipientPostalCode: string;
  recipientCountry?: string;
  recipientBirthDate?: string;
  recipientPhoneNumber?: string;
  recipientAnniversaryDate?: string;
  fromFirstName?: string;
  fromLastName?: string;
  fromAddressLine1?: string;
  fromAddressLine2?: string;
  fromCity?: string;
  fromState?: string;
  fromPostalCode?: string;
  fromCountry?: string;
}

export interface GetContactsParams {
  skip?: number;
  limit?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://amcards.com/.api/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getUser(): Promise<any> {
    let response = await this.axios.get('/user/');
    return response.data;
  }

  async getCards(): Promise<any[]> {
    let response = await this.axios.get('/cards/');
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.results ?? [response.data]);
  }

  async getContacts(params: GetContactsParams = {}): Promise<any[]> {
    let queryParams: Record<string, string> = {};

    if (params.skip !== undefined) queryParams.skip = String(params.skip);
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.firstName) queryParams.first_name = params.firstName;
    if (params.lastName) queryParams.last_name = params.lastName;
    if (params.email) queryParams.email = params.email;

    let response = await this.axios.get('/contacts/', { params: queryParams });
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.results ?? [response.data]);
  }

  async sendCard(params: SendCardParams): Promise<any> {
    let body: Record<string, any> = {
      quicksend_template_id: params.quicksendTemplateId,
      initiator: params.initiator,
      to_first_name: params.recipientFirstName,
      to_last_name: params.recipientLastName,
      to_address_line_1: params.recipientAddressLine1,
      to_city: params.recipientCity,
      to_state: params.recipientState,
      to_postal_code: params.recipientPostalCode,
      from_first_name: params.fromFirstName
    };

    if (params.message) body.message = params.message;
    if (params.sendDate) body.send_date = params.sendDate;
    if (params.thirdPartyContactId) body.third_party_contact_id = params.thirdPartyContactId;
    if (params.recipientOrganization) body.to_organization = params.recipientOrganization;
    if (params.recipientAddressLine2) body.to_address_line_2 = params.recipientAddressLine2;
    if (params.recipientCountry) body.to_country = params.recipientCountry;
    if (params.fromLastName) body.from_last_name = params.fromLastName;

    let response = await this.axios.post('/cards/', body);
    return response.data;
  }

  async scheduleDripCampaign(params: ScheduleDripCampaignParams): Promise<any> {
    let body: Record<string, any> = {
      campaign_id: params.campaignId,
      initiator: params.initiator,
      to_first_name: params.recipientFirstName,
      to_last_name: params.recipientLastName,
      to_address_line_1: params.recipientAddressLine1,
      to_city: params.recipientCity,
      to_state: params.recipientState,
      to_postal_code: params.recipientPostalCode
    };

    if (params.sendDate) body.send_date = params.sendDate;
    if (params.thirdPartyContactId) body.third_party_contact_id = params.thirdPartyContactId;
    if (params.recipientSalutation) body.to_salutation = params.recipientSalutation;
    if (params.recipientOrganization) body.to_organization = params.recipientOrganization;
    if (params.recipientAddressLine2) body.to_address_line_2 = params.recipientAddressLine2;
    if (params.recipientCountry) body.to_country = params.recipientCountry;
    if (params.recipientBirthDate) body.to_birth_date = params.recipientBirthDate;
    if (params.recipientPhoneNumber) body.to_phone_number = params.recipientPhoneNumber;
    if (params.recipientAnniversaryDate)
      body.to_anniversary_date = params.recipientAnniversaryDate;
    if (params.fromFirstName) body.from_first_name = params.fromFirstName;
    if (params.fromLastName) body.from_last_name = params.fromLastName;
    if (params.fromAddressLine1) body.from_address_line_1 = params.fromAddressLine1;
    if (params.fromAddressLine2) body.from_address_line_2 = params.fromAddressLine2;
    if (params.fromCity) body.from_city = params.fromCity;
    if (params.fromState) body.from_state = params.fromState;
    if (params.fromPostalCode) body.from_postal_code = params.fromPostalCode;
    if (params.fromCountry) body.from_country = params.fromCountry;

    let response = await this.axios.post('/campaigns/', body);
    return response.data;
  }

  async cancelCardsByContact(thirdPartyContactId: string): Promise<any> {
    let response = await this.axios.post('/cards/cancel/', {
      third_party_contact_id: thirdPartyContactId
    });
    return response.data;
  }

  async listCategories(params?: {
    parentId?: number;
    titleContains?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};

    if (params?.parentId !== undefined) queryParams.parent__id = String(params.parentId);
    if (params?.titleContains) queryParams.title__icontains = params.titleContains;

    let response = await this.axios.get('/categories/', { params: queryParams });
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.results ?? [response.data]);
  }

  async getCategory(categoryId: number): Promise<any> {
    let response = await this.axios.get(`/categories/${categoryId}/`);
    return response.data;
  }

  async listPublicTemplates(params?: {
    categoryId?: number;
    nameContains?: string;
  }): Promise<any[]> {
    let queryParams: Record<string, string> = {};

    if (params?.categoryId !== undefined) queryParams.category__id = String(params.categoryId);
    if (params?.nameContains) queryParams.name__icontains = params.nameContains;

    let response = await this.axios.get('/templates/', { params: queryParams });
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.results ?? [response.data]);
  }

  async getPublicTemplate(templateId: number): Promise<any> {
    let response = await this.axios.get(`/templates/${templateId}/`);
    return response.data;
  }

  async listGifts(): Promise<any[]> {
    let response = await this.axios.get('/gifts/');
    return Array.isArray(response.data)
      ? response.data
      : (response.data?.results ?? [response.data]);
  }

  async getGift(giftId: number): Promise<any> {
    let response = await this.axios.get(`/gifts/${giftId}/`);
    return response.data;
  }
}
