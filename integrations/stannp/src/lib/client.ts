import { createAxios } from 'slates';

export type Region = 'us' | 'uk';

let getBaseUrl = (region: Region): string => {
  if (region === 'uk') {
    return 'https://dash.stannp.com/api/v1/';
  }
  return 'https://api-us1.stannp.com/v1/';
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region: Region }) {
    this.axios = createAxios({
      baseURL: getBaseUrl(config.region),
      auth: {
        username: config.token,
        password: ''
      }
    });
  }

  // ---- Account ----

  async getAccountInfo(): Promise<any> {
    let response = await this.axios.get('/user/info');
    return response.data?.data;
  }

  async getAccountBalance(): Promise<any> {
    let response = await this.axios.get('/accounts/balance');
    return response.data?.data;
  }

  // ---- Recipients ----

  async listRecipients(params?: {
    groupId?: number;
    offset?: number;
    limit?: number;
  }): Promise<any> {
    let response = await this.axios.get('/recipients/list', {
      params: {
        group_id: params?.groupId,
        offset: params?.offset,
        limit: params?.limit
      }
    });
    return response.data?.data;
  }

  async getRecipient(recipientId: number): Promise<any> {
    let response = await this.axios.get(`/recipients/get/${recipientId}`);
    return response.data?.data;
  }

  async createRecipient(data: {
    groupId: number;
    firstname?: string;
    lastname?: string;
    address1: string;
    address2?: string;
    address3?: string;
    city?: string;
    postcode?: string;
    country?: string;
    company?: string;
    email?: string;
    phoneNumber?: string;
    refId?: string;
    onDuplicate?: string;
    customFields?: Record<string, string>;
  }): Promise<any> {
    let payload: Record<string, any> = {
      group_id: data.groupId,
      firstname: data.firstname,
      lastname: data.lastname,
      address1: data.address1,
      address2: data.address2,
      address3: data.address3,
      city: data.city,
      postcode: data.postcode,
      country: data.country,
      company: data.company,
      email: data.email,
      phone_number: data.phoneNumber,
      ref_id: data.refId,
      on_duplicate: data.onDuplicate
    };

    if (data.customFields) {
      for (let [key, value] of Object.entries(data.customFields)) {
        payload[key] = value;
      }
    }

    let response = await this.axios.post('/recipients/new', payload);
    return response.data?.data;
  }

  async deleteRecipient(recipientId: number): Promise<any> {
    let response = await this.axios.post('/recipients/delete', { id: recipientId });
    return response.data;
  }

  // ---- Groups ----

  async listGroups(params?: { offset?: number; limit?: number }): Promise<any> {
    let response = await this.axios.get('/groups/list', {
      params: {
        offset: params?.offset,
        limit: params?.limit
      }
    });
    return response.data?.data;
  }

  async createGroup(name: string): Promise<any> {
    let response = await this.axios.post('/groups/new', { name });
    return response.data?.data;
  }

  async deleteGroup(groupId: number, deleteRecipients?: boolean): Promise<any> {
    let response = await this.axios.post('/groups/delete', {
      id: groupId,
      delete_recipients: deleteRecipients
    });
    return response.data;
  }

  async addRecipientsToGroup(groupId: number, recipientIds: number[]): Promise<any> {
    let response = await this.axios.post(`/groups/add/${groupId}`, {
      recipients: recipientIds.join(',')
    });
    return response.data?.data;
  }

  async removeRecipientsFromGroup(groupId: number, recipientIds: number[]): Promise<any> {
    let response = await this.axios.post(`/groups/remove/${groupId}`, {
      recipients: recipientIds.join(',')
    });
    return response.data?.data;
  }

  async purgeGroup(groupId: number, deleteRecipients?: boolean): Promise<any> {
    let response = await this.axios.post('/groups/purge', {
      id: groupId,
      delete_recipients: deleteRecipients
    });
    return response.data;
  }

  // ---- Postcards ----

  async createPostcard(data: {
    size: string;
    front?: string;
    back?: string;
    message?: string;
    template?: number;
    recipient: number | Record<string, any>;
    tags?: string;
    addons?: string;
    test?: boolean;
    postUnverified?: boolean;
    padding?: number;
  }): Promise<any> {
    let payload: Record<string, any> = {
      size: data.size,
      front: data.front,
      back: data.back,
      message: data.message,
      template: data.template,
      tags: data.tags,
      addons: data.addons,
      test: data.test,
      post_unverified: data.postUnverified,
      padding: data.padding
    };

    if (typeof data.recipient === 'number') {
      payload.recipient = data.recipient;
    } else {
      for (let [key, value] of Object.entries(data.recipient)) {
        payload[`recipient[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/postcards/create', payload);
    return response.data?.data;
  }

  async getPostcard(postcardId: number): Promise<any> {
    let response = await this.axios.get(`/postcards/get/${postcardId}`);
    return response.data?.data;
  }

  async cancelPostcard(postcardId: number): Promise<any> {
    let response = await this.axios.post('/postcards/cancel', { id: postcardId });
    return response.data;
  }

  // ---- Letters ----

  async createLetter(data: {
    template?: number;
    file?: string;
    recipient: number | Record<string, any>;
    duplex?: boolean;
    tags?: string;
    addons?: string;
    test?: boolean;
    postUnverified?: boolean;
  }): Promise<any> {
    let payload: Record<string, any> = {
      template: data.template,
      file: data.file,
      duplex: data.duplex,
      tags: data.tags,
      addons: data.addons,
      test: data.test,
      post_unverified: data.postUnverified
    };

    if (typeof data.recipient === 'number') {
      payload.recipient = data.recipient;
    } else {
      for (let [key, value] of Object.entries(data.recipient)) {
        payload[`recipient[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/letters/create', payload);
    return response.data?.data;
  }

  async postLetter(data: {
    file: string;
    recipient: number | Record<string, any>;
    duplex?: boolean;
    tags?: string;
    addons?: string;
    test?: boolean;
    postUnverified?: boolean;
  }): Promise<any> {
    let payload: Record<string, any> = {
      file: data.file,
      duplex: data.duplex,
      tags: data.tags,
      addons: data.addons,
      test: data.test,
      post_unverified: data.postUnverified
    };

    if (typeof data.recipient === 'number') {
      payload.recipient = data.recipient;
    } else {
      for (let [key, value] of Object.entries(data.recipient)) {
        payload[`recipient[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/letters/post', payload);
    return response.data?.data;
  }

  async getLetter(letterId: number): Promise<any> {
    let response = await this.axios.get(`/letters/get/${letterId}`);
    return response.data?.data;
  }

  async cancelLetter(letterId: number): Promise<any> {
    let response = await this.axios.post('/letters/cancel', { id: letterId });
    return response.data;
  }

  // ---- Campaigns ----

  async listCampaigns(): Promise<any> {
    let response = await this.axios.get('/campaigns/list');
    return response.data?.data;
  }

  async getCampaign(campaignId: number): Promise<any> {
    let response = await this.axios.get(`/campaigns/get/${campaignId}`);
    return response.data?.data;
  }

  async createCampaign(data: {
    name: string;
    type: string;
    groupId: number;
    templateId?: number;
    file?: string;
    front?: string;
    back?: string;
    size?: string;
    addons?: string;
  }): Promise<any> {
    let response = await this.axios.post('/campaigns/create', {
      name: data.name,
      type: data.type,
      group_id: data.groupId,
      template_id: data.templateId,
      file: data.file,
      front: data.front,
      back: data.back,
      size: data.size,
      addons: data.addons
    });
    return response.data?.data;
  }

  async approveCampaign(campaignId: number): Promise<any> {
    let response = await this.axios.post('/campaigns/approve', { id: campaignId });
    return response.data?.data;
  }

  async getCampaignCost(campaignId: number): Promise<any> {
    let response = await this.axios.post('/campaigns/cost', { id: campaignId });
    return response.data?.data;
  }

  async bookCampaign(
    campaignId: number,
    sendDate: string,
    options?: { nextAvailableDate?: boolean; useBalance?: boolean }
  ): Promise<any> {
    let response = await this.axios.post('/campaigns/book', {
      id: campaignId,
      send_date: sendDate,
      next_available_date: options?.nextAvailableDate,
      use_balance: options?.useBalance
    });
    return response.data?.data;
  }

  async getAvailableBookingDates(start?: string, end?: string): Promise<any> {
    let response = await this.axios.post('/campaigns/availableDates', {
      start,
      end
    });
    return response.data?.data;
  }

  async getCampaignSample(campaignId: number): Promise<any> {
    let response = await this.axios.post('/campaigns/sample', { id: campaignId });
    return response.data?.data;
  }

  async deleteCampaign(campaignId: number): Promise<any> {
    let response = await this.axios.post('/campaigns/delete', { id: campaignId });
    return response.data;
  }

  // ---- Reporting ----

  async getReportingSummary(startDate: string, endDate: string): Promise<any> {
    let response = await this.axios.get(`/reporting/summary/${startDate}/${endDate}`);
    return response.data?.data;
  }

  async getReportingList(
    startDate: string,
    endDate: string,
    status?: string,
    tag?: string
  ): Promise<any> {
    let path = `/reporting/list/${startDate}/${endDate}`;
    if (status) {
      path += `/${status}`;
    }
    if (tag) {
      path += `/${tag}`;
    }
    let response = await this.axios.get(path);
    return response.data?.data;
  }

  // ---- Address Validation ----

  async validateAddress(data: {
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
  }): Promise<any> {
    let response = await this.axios.post('/addresses/validate', data);
    return response.data?.data;
  }

  // ---- SMS ----

  async sendSms(data: {
    message: string;
    phoneNumber?: string;
    recipientId?: number;
    country?: string;
    test?: boolean;
  }): Promise<any> {
    let response = await this.axios.post('/sms/create', {
      message: data.message,
      phone_number: data.phoneNumber,
      recipient_id: data.recipientId,
      country: data.country,
      test: data.test
    });
    return response.data?.data;
  }

  // ---- Templates ----

  async listTemplates(): Promise<any> {
    let response = await this.axios.get('/templates/list');
    return response.data?.data;
  }

  // ---- Files ----

  async uploadFile(fileUrl: string, folderId?: number): Promise<any> {
    let response = await this.axios.post('/files/upload', {
      file: fileUrl,
      folder: folderId
    });
    return response.data?.data;
  }

  async listFolders(): Promise<any> {
    let response = await this.axios.get('/files/folders');
    return response.data?.data;
  }

  async createFolder(name: string): Promise<any> {
    let response = await this.axios.post('/files/createFolder', { name });
    return response.data?.data;
  }

  // ---- Recipient Events ----

  async createRecipientEvent(data: {
    recipientId: string;
    name: string;
    value?: string;
    conversion?: boolean;
    eventData?: string;
    ref?: string;
  }): Promise<any> {
    let response = await this.axios.post('/recipientEvents/create', {
      recipient_id: data.recipientId,
      name: data.name,
      value: data.value,
      conversion: data.conversion,
      data: data.eventData,
      ref: data.ref
    });
    return response.data?.data;
  }
}
