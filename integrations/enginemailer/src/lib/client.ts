import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let apiAxios = createAxios({
  baseURL: 'https://api.enginemailer.com'
});

let connectorAxios = createAxios({
  baseURL: 'https://connect.enginemailer.com/api/N8N/v1'
});

for (let axios of [apiAxios, connectorAxios]) {
  axios.interceptors.response.use(
    response => {
      let data: unknown = response.data;
      let result = isApiErrorRecord(data) ? data.Result : undefined;
      if (isApiErrorRecord(result)) {
        let statusCode = String(result.StatusCode ?? '');
        let status = String(result.Status ?? '');
        if ((statusCode && statusCode !== '200') || (status && status !== 'OK')) {
          let message = String(result.ErrorMessage ?? result.Message ?? status);
          let missingSubscriber =
            response.config.url?.endsWith('/getSubscriber') &&
            /subscriber (?:was )?not (?:found|exist)|subscriber does not exist/i.test(message);
          throw createApiServiceError(`Enginemailer API request failed: ${message}`, {
            reason: missingSubscriber
              ? 'enginemailer_subscriber_not_found'
              : 'enginemailer_api_error',
            upstreamStatus: statusCode,
            upstreamCode: status
          });
        }
        if (result.StatusCode !== undefined) result.StatusCode = statusCode;
      }
      return response;
    },
    error =>
      Promise.reject(
        buildApiServiceError(error, {
          providerLabel: 'Enginemailer',
          reason: 'enginemailer_api_error',
          detailKeys: ['ErrorMessage', 'Message', 'message'],
          nestedKeys: ['Result']
        })
      )
  );
}

export interface CustomField {
  customfield_key: string;
  customfield_value: string;
}

export interface SubstitutionTag {
  Key: string;
  Value: string;
}

export interface Attachment {
  Filename: string;
  Content: string;
}

export interface EngineMailerResult {
  Result: {
    Status: string;
    StatusCode: string;
    Message?: string;
    ErrorMessage?: string;
    Data?: any;
    CampaignID?: string;
    TransactionID?: string;
  };
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('An Enginemailer API key is required.');
    }
    this.token = config.token;
  }

  private get headers() {
    return {
      APIKEY: this.token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  private numericId(value: string, label: string): number {
    let id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
      throw createApiServiceError(`${label} must be a positive integer ID.`);
    }
    return id;
  }

  // ============ Subscriber Management ============

  async getSubscriber(email: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/subscriber/emsubscriber/getSubscriber', {
      params: { email },
      headers: this.headers
    });
    return response.data;
  }

  async insertSubscriber(params: {
    email: string;
    subcategories?: string[];
    customfields?: CustomField[];
    sourcetype?: string;
  }): Promise<EngineMailerResult> {
    let response = await apiAxios.post(
      '/restapi/subscriber/emsubscriber/insertSubscriber',
      {
        ...params,
        subcategories: params.subcategories?.map(id => this.numericId(id, 'Subcategory'))
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateSubscriber(params: {
    email: string;
    subcategories?: string[];
    subcategories_type?: number;
    customfields?: CustomField[];
    customfield_type?: number;
  }): Promise<EngineMailerResult> {
    let response = await apiAxios.post(
      '/restapi/subscriber/emsubscriber/updateSubscriber',
      {
        ...params,
        subcategories: params.subcategories?.map(id => this.numericId(id, 'Subcategory'))
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async unsubscribeSubscriber(email: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/subscriber/emsubscriber/unSubSubscriber', {
      params: { email },
      headers: this.headers
    });
    return response.data;
  }

  async activateSubscriber(email: string): Promise<EngineMailerResult> {
    let response = await apiAxios.post(
      '/restapi/subscriber/emsubscriber/activateSubscriber',
      {},
      {
        params: { email },
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteSubscriber(email: string): Promise<EngineMailerResult> {
    let response = await connectorAxios.post(
      '/deletesubscriber',
      { email },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async tagSubscriber(email: string, subcategories: string[]): Promise<EngineMailerResult> {
    let response = await connectorAxios.post(
      '/tagtosubcategory',
      {
        email,
        subcategories
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async untagSubscriber(email: string, subcategories: string[]): Promise<EngineMailerResult> {
    let response = await connectorAxios.post(
      '/untagtosubcategory',
      {
        email,
        subcategories
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getCustomFields(): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/subscriber/emsubscriber/getCustomField', {
      headers: this.headers
    });
    return response.data;
  }

  async getSubcategories(): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/subscriber/emsubscriber/getSubcategory', {
      headers: this.headers
    });
    return response.data;
  }

  // ============ Transactional Email ============

  async sendTransactionalEmail(params: {
    toEmail: string;
    senderEmail: string;
    senderName?: string;
    subject?: string;
    submittedContent?: string;
    templateId?: string;
    substitutionTags?: SubstitutionTag[];
    ccEmails?: string;
    bccEmails?: string;
    attachments?: Attachment[];
  }): Promise<EngineMailerResult> {
    let body: Record<string, any> = {
      ToEmail: params.toEmail,
      SenderEmail: params.senderEmail,
      ...pickDefined({ SenderName: params.senderName, Subject: params.subject })
    };

    if (params.submittedContent) {
      body.SubmittedContent = params.submittedContent;
    }
    if (params.templateId) {
      body.TemplateId = params.templateId;
    }
    if (params.substitutionTags && params.substitutionTags.length > 0) {
      body.SubstitutionTags = params.substitutionTags;
    }
    if (params.ccEmails) {
      body.CCEmails = params.ccEmails
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);
    }
    if (params.bccEmails) {
      body.BCCEmails = params.bccEmails
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);
    }
    if (params.attachments && params.attachments.length > 0) {
      body.Attachments = params.attachments;
    }

    let response = await apiAxios.post('/RESTAPI/V2/Submission/SendEmail', body, {
      headers: this.headers
    });
    return response.data;
  }

  // ============ Campaign Management ============

  async createCampaign(params: {
    campaignName: string;
    senderName: string;
    senderEmail: string;
    subject: string;
    content: string;
    replyTo?: string;
  }): Promise<EngineMailerResult> {
    let response = await apiAxios.post(
      '/restapi/Campaign/EMCampaign/CreateCampaign',
      {
        CampaignName: params.campaignName,
        SenderName: params.senderName,
        SenderEmail: params.senderEmail,
        Subject: params.subject,
        Content: params.content,
        ...pickDefined({ ReplyTo: params.replyTo })
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateCampaign(params: {
    campaignId: string;
    campaignName?: string;
    senderName?: string;
    senderEmail?: string;
    subject?: string;
    content?: string;
    replyTo?: string;
  }): Promise<EngineMailerResult> {
    let body: Record<string, any> = {
      CampaignID: params.campaignId
    };
    if (params.campaignName !== undefined) body.CampaignName = params.campaignName;
    if (params.senderName !== undefined) body.SenderName = params.senderName;
    if (params.senderEmail !== undefined) body.SenderEmail = params.senderEmail;
    if (params.subject !== undefined) body.Subject = params.subject;
    if (params.content !== undefined) body.Content = params.content;
    if (params.replyTo !== undefined) body.ReplyTo = params.replyTo;

    let response = await apiAxios.post('/restapi/Campaign/EMCampaign/UpdateCampaign', body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/deletecampaign', {
      params: { campaignid: campaignId },
      headers: this.headers
    });
    return response.data;
  }

  async assignRecipientList(params: {
    campaignId: string;
    filterBy: string;
    categoryList: string[];
    filterType?: string;
  }): Promise<EngineMailerResult> {
    let filterBy = Number(params.filterBy);
    if (filterBy !== 1 && filterBy !== 2) {
      throw createApiServiceError(
        'recipientFilterBy must be "1" (all subscribers) or "2" (categories).'
      );
    }
    let body = {
      CampaignID: this.numericId(params.campaignId, 'Campaign'),
      FilterBy: filterBy,
      ...(filterBy === 2
        ? {
            Data: {
              CategoryList: params.categoryList.map(id => this.numericId(id, 'Subcategory')),
              FilterType: params.filterType ?? 'OR'
            }
          }
        : {})
    };

    let response = await apiAxios.post(
      '/restapi/campaign/emcampaign/AssignRecipientList',
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteRecipientList(campaignId: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/deleteRecipientList', {
      params: { campaignid: campaignId },
      headers: this.headers
    });
    return response.data;
  }

  async sendCampaign(campaignId: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/SendCampaign', {
      params: { campaignid: campaignId },
      headers: this.headers
    });
    return response.data;
  }

  async scheduleCampaign(
    campaignId: string,
    scheduleTime: string
  ): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/ScheduleCampaign', {
      params: { campaignid: campaignId, scheduletime: scheduleTime },
      headers: this.headers
    });
    return response.data;
  }

  async pauseCampaign(campaignId: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/PauseCampaign', {
      params: { campaignid: campaignId },
      headers: this.headers
    });
    return response.data;
  }

  async listCampaigns(page?: number, pageSize?: number): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/ListCampaign', {
      headers: this.headers
    });
    let result: EngineMailerResult = response.data;
    if (pageSize !== undefined && Array.isArray(result.Result.Data)) {
      let offset = ((page ?? 1) - 1) * pageSize;
      result.Result.Data = result.Result.Data.slice(offset, offset + pageSize);
    }
    return result;
  }

  async getCampaignDeliveryStatus(campaignId: string): Promise<EngineMailerResult> {
    let response = await apiAxios.get(
      '/restapi/campaign/emcampaign/getcampaigndeliverystatus',
      {
        params: { campaignid: this.numericId(campaignId, 'Campaign') },
        headers: this.headers
      }
    );
    return response.data;
  }

  // ============ Reference Data ============

  async getCategoryList(): Promise<EngineMailerResult> {
    let response = await apiAxios.get('/restapi/campaign/emcampaign/GetCategoryList', {
      headers: this.headers
    });
    return response.data;
  }

  async listSubcategories(): Promise<any> {
    let response = await connectorAxios.get('/listsubcategories', {
      headers: this.headers
    });
    return response.data;
  }

  async listTemplates(): Promise<any> {
    let response = await connectorAxios.get('/listtemplates', {
      headers: this.headers
    });
    return response.data;
  }

  async listDomains(): Promise<any> {
    let response = await connectorAxios.get('/listdomains', {
      headers: this.headers
    });
    return response.data;
  }

  // ============ Polling Triggers ============

  async getNewSubscribers(params: {
    lastPollingDate?: string;
    limit?: number;
    source?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.lastPollingDate) queryParams.lastpollingdate = params.lastPollingDate;
    if (params.limit) queryParams.limit = params.limit;
    if (params.source) queryParams.source = params.source;

    let response = await connectorAxios.get('/newsubscribers', {
      params: queryParams,
      headers: this.headers
    });
    return response.data;
  }

  async getUnsubscribes(params: { lastPollingDate?: string; limit?: number }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.lastPollingDate) queryParams.lastpollingdate = params.lastPollingDate;
    if (params.limit) queryParams.limit = params.limit;

    let response = await connectorAxios.get('/unsubscribe', {
      params: queryParams,
      headers: this.headers
    });
    return response.data;
  }

  async getModifiedSubscribers(params: {
    lastPollingDate?: string;
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.lastPollingDate) queryParams.lastpollingdate = params.lastPollingDate;
    if (params.limit) queryParams.limit = params.limit;

    let response = await connectorAxios.get('/subscribersmodified', {
      params: queryParams,
      headers: this.headers
    });
    return response.data;
  }

  async getDeletedSubscribers(params: {
    lastPollingDate?: string;
    limit?: number;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.lastPollingDate) queryParams.lastpollingdate = params.lastPollingDate;
    if (params.limit) queryParams.limit = params.limit;

    let response = await connectorAxios.get('/subscribersdeleted', {
      params: queryParams,
      headers: this.headers
    });
    return response.data;
  }

  async getTaggedSubscribers(params: {
    lastPollingDate?: string;
    limit?: number;
    filterSubcategory?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.lastPollingDate) queryParams.lastpollingdate = params.lastPollingDate;
    if (params.limit) queryParams.limit = params.limit;
    if (params.filterSubcategory) queryParams.filter_subcategory = params.filterSubcategory;

    let response = await connectorAxios.get('/subscriberstagged', {
      params: queryParams,
      headers: this.headers
    });
    return response.data;
  }

  async getUntaggedSubscribers(params: {
    lastPollingDate?: string;
    limit?: number;
    filterSubcategory?: string;
  }): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.lastPollingDate) queryParams.lastpollingdate = params.lastPollingDate;
    if (params.limit) queryParams.limit = params.limit;
    if (params.filterSubcategory) queryParams.filter_subcategory = params.filterSubcategory;

    let response = await connectorAxios.get('/subscribersuntagged', {
      params: queryParams,
      headers: this.headers
    });
    return response.data;
  }
}
