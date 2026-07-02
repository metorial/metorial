import { createAxios } from 'slates';

export class TelTelClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.teltel.io/v2',
      headers: {
        'X-API-KEY': token
      }
    });
  }

  // ─── Users ───

  async listUsers(): Promise<any[]> {
    let response = await this.axios.get('/users');
    return response.data;
  }

  async getUserCallerIdGroups(userId: string): Promise<any[]> {
    let response = await this.axios.get(`/public/users/${userId}/cidgroups`);
    return response.data;
  }

  // ─── Click2Call / Callback ───

  async initiateCallback(params: {
    called: string;
    calling: string;
    callerId?: string;
    callerIdB?: string;
  }): Promise<any> {
    let response = await this.axios.get('/callback', {
      params: {
        called: params.called,
        calling: params.calling,
        callerid: params.callerId,
        callerid_b: params.callerIdB
      }
    });
    return response.data;
  }

  // ─── SMS ───

  async sendSms(params: { to: string; text: string; from?: string }): Promise<any> {
    let response = await this.axios.post('/sms/send', {
      to: params.to,
      text: params.text,
      from: params.from
    });
    return response.data;
  }

  async sendBulkSms(params: { to: string[]; text: string; from?: string }): Promise<any> {
    let response = await this.axios.post('/sms/send', {
      to: params.to,
      text: params.text,
      from: params.from
    });
    return response.data;
  }

  async listSms(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let response = await this.axios.get('/sms', {
      params
    });
    return response.data;
  }

  // ─── HLR / Number Verification ───

  async hlrLookup(phoneNumber: string): Promise<any> {
    let response = await this.axios.get('/hlr', {
      params: {
        phone: phoneNumber
      }
    });
    return response.data;
  }

  // ─── Calls / CDR ───

  async listCalls(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.dateFrom) queryParams.date_from = params.dateFrom;
    if (params?.dateTo) queryParams.date_to = params.dateTo;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.userId) queryParams.user_id = params.userId;

    let response = await this.axios.get('/calls', {
      params: queryParams
    });
    return response.data;
  }

  // ─── Auto Dialer Campaigns ───

  async listCampaigns(params?: { fields?: string }): Promise<any> {
    let response = await this.axios.get('/autodialers', {
      params: {
        fields: params?.fields
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<any> {
    let response = await this.axios.get(`/autodialers/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: {
    name: string;
    campaignType?: string;
    callflowId?: string;
    callerIdGroupId?: string;
    settings?: Record<string, any>;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: data.name
    };
    if (data.campaignType) body.campaign_type = data.campaignType;
    if (data.callflowId) body.callflow_id = data.callflowId;
    if (data.callerIdGroupId) body.callerid_group_id = data.callerIdGroupId;
    if (data.settings) body.settings = data.settings;

    let response = await this.axios.post('/autodialers', body);
    return response.data;
  }

  async updateCampaign(
    campaignId: string,
    data: {
      name?: string;
      status?: string;
      settings?: Record<string, any>;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.name) body.name = data.name;
    if (data.status) body.status = data.status;
    if (data.settings) body.settings = data.settings;

    let response = await this.axios.put(`/autodialers/${campaignId}`, body);
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<any> {
    let response = await this.axios.delete(`/autodialers/${campaignId}`);
    return response.data;
  }

  // ─── Auto Dialer Contacts ───

  async listCampaignContacts(
    campaignId: string,
    params?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/autodialers/${campaignId}/contacts`, {
      params
    });
    return response.data;
  }

  async addCampaignContact(
    campaignId: string,
    data: {
      phone: string;
      name?: string;
      param1?: string;
      param2?: string;
      param3?: string;
      param4?: string;
      param5?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/autodialers/${campaignId}/contacts`, data);
    return response.data;
  }

  async addCampaignContactsBulk(
    campaignId: string,
    contacts: Array<{
      phone: string;
      name?: string;
      param1?: string;
      param2?: string;
      param3?: string;
      param4?: string;
      param5?: string;
    }>
  ): Promise<any> {
    let response = await this.axios.post(`/autodialers/${campaignId}/contacts`, contacts);
    return response.data;
  }

  async deleteCampaignContact(campaignId: string, contactId: string): Promise<any> {
    let response = await this.axios.delete(`/autodialers/${campaignId}/contacts/${contactId}`);
    return response.data;
  }
}
