import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

export interface SendloopClientConfig {
  token: string;
  subdomain?: string;
}

export class SendloopClient {
  private token: string;
  private baseUrl: string;
  private axios = createAxios();

  constructor(config: SendloopClientConfig) {
    let subdomain = config.subdomain || 'app';
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(subdomain)) {
      throw createApiServiceError(
        'Enter a Sendloop account subdomain without a URL or domain suffix.'
      );
    }
    this.token = config.token;
    this.baseUrl = `https://${subdomain}.sendloop.com/api/v3`;
  }

  private async request(command: string, params: Record<string, string> = {}): Promise<any> {
    let formParams = new URLSearchParams({ APIKey: this.token, ...params });

    try {
      let response = await this.axios.post(
        `${this.baseUrl}/${command}/json`,
        formParams.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      let data = response.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw createApiServiceError('Sendloop returned an invalid API response.', {
          reason: 'invalid_response'
        });
      }
      if (
        data.Success === false ||
        data.Success === 0 ||
        data.Success === 'false' ||
        data.Success === '0'
      ) {
        throw createApiServiceError(
          `Sendloop API error: ${data.ErrorMessage || data.ErrorText || data.Error || 'Request failed'}`,
          {
            reason: 'upstream_error',
            upstreamCode: data.ErrorCode === undefined ? undefined : String(data.ErrorCode)
          }
        );
      }
      if (
        data.Success !== true &&
        data.Success !== 1 &&
        data.Success !== 'true' &&
        data.Success !== '1'
      ) {
        throw createApiServiceError(
          'Sendloop returned a response without confirmed success.',
          { reason: 'invalid_response' }
        );
      }
      return data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Sendloop',
        reason: 'upstream_error',
        operation: command,
        detailKeys: ['ErrorMessage', 'ErrorText', 'Error', 'message']
      });
    }
  }

  // ---- Account ----

  async getAccountInfo(): Promise<any> {
    return this.request('Account.Info.Get');
  }

  // ---- Lists ----

  async getLists(): Promise<any> {
    return this.request('List.GetList');
  }

  async getList(listId: string): Promise<any> {
    return this.request('List.Get', { ListID: listId });
  }

  async createList(params: {
    name: string;
    optInMode?: string;
    notifyOnSubscribe?: string;
    notifyOnUnsubscribe?: string;
    notifyEmail?: string;
  }): Promise<any> {
    let requestParams: Record<string, string> = {
      Name: params.name
    };
    if (params.optInMode)
      requestParams.OptInMode =
        params.optInMode.toLowerCase() === 'double' ? 'Double' : 'Single';
    if (params.notifyOnSubscribe) requestParams.NotifyOnSubscribe = params.notifyOnSubscribe;
    if (params.notifyOnUnsubscribe)
      requestParams.NotifyOnUnsubscribe = params.notifyOnUnsubscribe;
    if (params.notifyEmail) requestParams.NotifyEmailAddress = params.notifyEmail;

    return this.request('List.Create', requestParams);
  }

  async updateList(
    listId: string,
    params: {
      name?: string;
      optInMode?: string;
      notifyOnSubscribe?: string;
      notifyOnUnsubscribe?: string;
      notifyEmail?: string;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: listId
    };
    if (params.name !== undefined) requestParams.Name = params.name;
    if (params.optInMode)
      requestParams.OptInMode =
        params.optInMode.toLowerCase() === 'double' ? 'Double' : 'Single';
    if (params.notifyOnSubscribe) requestParams.NotifyOnSubscribe = params.notifyOnSubscribe;
    if (params.notifyOnUnsubscribe)
      requestParams.NotifyOnUnsubscribe = params.notifyOnUnsubscribe;
    if (params.notifyEmail) requestParams.NotifyEmailAddress = params.notifyEmail;

    return this.request('List.Update', requestParams);
  }

  async deleteList(listId: string): Promise<any> {
    return this.request('List.Delete', { ListID: listId });
  }

  // ---- Custom Fields ----

  async getCustomFields(listId: string): Promise<any> {
    return this.request('CustomField.GetList', { ListID: listId });
  }

  async createCustomField(
    listId: string,
    params: {
      fieldName: string;
      fieldType?: string;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: listId,
      FieldName: params.fieldName
    };
    if (params.fieldType) requestParams.FieldType = params.fieldType;

    return this.request('CustomField.Create', requestParams);
  }

  async deleteCustomField(listId: string, customFieldId: string): Promise<any> {
    return this.request('CustomField.Delete', {
      ListID: listId,
      CustomFieldID: customFieldId
    });
  }

  // ---- Subscribers ----

  async getSubscriber(
    listId: string,
    params: {
      subscriberId?: string;
      emailAddress?: string;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: listId
    };
    if (params.subscriberId) requestParams.SubscriberID = params.subscriberId;
    if (params.emailAddress) requestParams.EmailAddress = params.emailAddress;

    return this.request('Subscriber.Get', requestParams);
  }

  async searchSubscribers(emailAddress: string): Promise<any> {
    return this.request('Subscriber.Search', { EmailAddress: emailAddress });
  }

  async browseSubscribers(
    listId: string,
    params?: {
      segmentId?: string;
      startIndex?: string;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: listId
    };
    if (params?.segmentId) requestParams.SegmentID = params.segmentId;
    if (params?.startIndex) requestParams.StartIndex = params.startIndex;

    return this.request('Subscriber.Browse', requestParams);
  }

  async subscribe(params: {
    listId: string;
    emailAddress: string;
    subscriptionIp?: string;
    fields?: Record<string, string>;
  }): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: params.listId,
      EmailAddress: params.emailAddress,
      SubscriptionIP: params.subscriptionIp || '127.0.0.1'
    };

    if (params.fields) {
      for (let [fieldId, value] of Object.entries(params.fields)) {
        requestParams[
          `Fields[${fieldId.startsWith('CustomField') ? fieldId : `CustomField${fieldId}`}]`
        ] = value;
      }
    }

    return this.request('Subscriber.Subscribe', requestParams);
  }

  async unsubscribe(params: {
    listId: string;
    emailAddress: string;
    unsubscriptionIp?: string;
  }): Promise<any> {
    return this.request('Subscriber.Unsubscribe', {
      ListID: params.listId,
      EmailAddress: params.emailAddress,
      UnsubscriptionIP: params.unsubscriptionIp || '127.0.0.1'
    });
  }

  async updateSubscriber(
    listId: string,
    params: {
      subscriberId?: string;
      emailAddress?: string;
      fields?: Record<string, string>;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: listId
    };
    if (params.subscriberId) requestParams.SubscriberID = params.subscriberId;
    if (params.emailAddress) requestParams.EmailAddress = params.emailAddress;

    if (params.fields) {
      for (let [fieldId, value] of Object.entries(params.fields)) {
        requestParams[
          `Fields[${fieldId.startsWith('CustomField') ? fieldId : `CustomField${fieldId}`}]`
        ] = value;
      }
    }

    return this.request('Subscriber.Update', requestParams);
  }

  async importSubscribers(
    listId: string,
    subscribers: { emailAddress: string; fields?: Record<string, string> }[]
  ): Promise<any> {
    let params: Record<string, string> = { ListID: listId };
    for (let [index, subscriber] of subscribers.entries()) {
      params[`Subscribers[${index}][EmailAddress]`] = subscriber.emailAddress;
      for (let [fieldId, value] of Object.entries(subscriber.fields ?? {})) {
        let field = fieldId.startsWith('CustomField') ? fieldId : `CustomField${fieldId}`;
        params[`Subscribers[${index}][${field}]`] = value;
      }
    }
    return this.request('Subscriber.Import', params);
  }

  // ---- Suppression List ----

  async getSuppressionList(): Promise<any> {
    return this.request('Suppression.List.GetList', { ListID: '0' });
  }

  async addToSuppressionList(emailAddress: string): Promise<any> {
    return this.request('Suppression.List.Add', { ListID: '0', EmailAddress: emailAddress });
  }

  // ---- Segments ----

  async getSegments(listId: string): Promise<any> {
    return this.request('Segment.GetList', { ListID: listId });
  }

  async getSegment(listId: string, segmentId: string): Promise<any> {
    return this.request('Segment.Get', { ListID: listId, SegmentID: segmentId });
  }

  async createSegment(
    listId: string,
    params: {
      segmentName: string;
      rules?: string;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      ListID: listId,
      SegmentName: params.segmentName
    };
    if (params.rules) requestParams.Rules = params.rules;

    return this.request('Segment.Create', requestParams);
  }

  async deleteSegment(listId: string, segmentId: string): Promise<any> {
    return this.request('Segment.Delete', { ListID: listId, SegmentID: segmentId });
  }

  // ---- Campaigns ----

  async getCampaigns(filters?: {
    ignoreDrafts?: boolean;
    ignoreSending?: boolean;
    ignorePaused?: boolean;
    ignoreSent?: boolean;
    ignoreFailed?: boolean;
    ignoreApproval?: boolean;
  }): Promise<any> {
    let requestParams: Record<string, string> = {};
    if (filters?.ignoreDrafts) requestParams.IgnoreDrafts = '1';
    if (filters?.ignoreSending) requestParams.IgnoreSending = '1';
    if (filters?.ignorePaused) requestParams.IgnorePaused = '1';
    if (filters?.ignoreSent) requestParams.IgnoreSent = '1';
    if (filters?.ignoreFailed) requestParams.IgnoreFailed = '1';
    if (filters?.ignoreApproval) requestParams.IgnoreApproval = '1';

    return this.request('Campaign.GetList', requestParams);
  }

  async getCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.Get', { CampaignID: campaignId });
  }

  async createCampaign(params: {
    campaignName: string;
    fromName: string;
    fromEmail: string;
    replyToName?: string;
    replyToEmail?: string;
    subject: string;
    htmlContent?: string;
    plainTextContent?: string;
    targetListIds?: string;
    scheduleType?: string;
    scheduleDateTime?: string;
  }): Promise<any> {
    if (params.scheduleType !== undefined || params.scheduleDateTime !== undefined) {
      throw createApiServiceError(
        'Create the campaign first, then use send_campaign with sendDate to schedule delivery.'
      );
    }
    let requestParams: Record<string, string> = {
      Version: '2',
      Name: params.campaignName,
      FromName: params.fromName,
      FromEmail: params.fromEmail,
      Subject: params.subject
    };
    if (params.replyToName !== undefined) requestParams.ReplyToName = params.replyToName;
    if (params.replyToEmail !== undefined) requestParams.ReplyToEmail = params.replyToEmail;
    if (params.htmlContent !== undefined) requestParams.HTMLContent = params.htmlContent;
    if (params.plainTextContent !== undefined)
      requestParams.PlainContent = params.plainTextContent;
    if (params.targetListIds) {
      for (let [index, listId] of params.targetListIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .entries()) {
        requestParams[`Recipients[${index}]`] = listId;
      }
    }

    return this.request('Campaign.Create', requestParams);
  }

  async updateCampaign(
    campaignId: string,
    params: {
      campaignName?: string;
      fromName?: string;
      fromEmail?: string;
      replyToName?: string;
      replyToEmail?: string;
      subject?: string;
      htmlContent?: string;
      plainTextContent?: string;
      targetListIds?: string;
    }
  ): Promise<any> {
    let requestParams: Record<string, string> = {
      CampaignID: campaignId
    };
    if (params.campaignName !== undefined) requestParams.CampaignName = params.campaignName;
    if (params.fromName !== undefined) requestParams.FromName = params.fromName;
    if (params.fromEmail !== undefined) requestParams.FromEmail = params.fromEmail;
    if (params.replyToName !== undefined) requestParams.ReplyToName = params.replyToName;
    if (params.replyToEmail !== undefined) requestParams.ReplyToEmail = params.replyToEmail;
    if (params.subject !== undefined) requestParams.Subject = params.subject;
    if (params.htmlContent !== undefined) requestParams.HTMLContent = params.htmlContent;
    if (params.plainTextContent !== undefined)
      requestParams.PlainContent = params.plainTextContent;
    if (params.targetListIds) {
      for (let [index, listId] of params.targetListIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
        .entries()) {
        requestParams[`TargetListIDs[${index}]`] = listId;
      }
    }

    return this.request('Campaign.Update', requestParams);
  }

  async deleteCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.Delete', { CampaignID: campaignId });
  }

  async sendCampaign(campaignId: string, sendDate = 'NOW'): Promise<any> {
    return this.request('Campaign.Send', { CampaignID: campaignId, SendDate: sendDate });
  }

  async pauseCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.Pause', { CampaignID: campaignId });
  }

  async resumeCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.Resume', { CampaignID: campaignId });
  }

  async cancelScheduledCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.CancelSchedule', { CampaignID: campaignId });
  }

  // ---- Reports ----

  async getCampaignOpens(campaignId: string): Promise<any> {
    return this.request('Report.Campaign.Opens', { CampaignID: campaignId });
  }

  async getCampaignBounces(campaignId: string): Promise<any> {
    return this.request('Report.Campaign.Bounces', { CampaignID: campaignId });
  }

  async getCampaignLinkClicks(
    campaignId: string,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<any> {
    return this.request('Data.Campaign.LinkClicks', {
      CampaignID: campaignId,
      Page: String(pagination.page ?? 1),
      Limit: String(pagination.limit ?? 10)
    });
  }

  async getCampaignUnsubscriptions(
    campaignId: string,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<any> {
    return this.request('Data.Campaign.Unsubscriptions', {
      CampaignID: campaignId,
      Page: String(pagination.page ?? 1),
      Limit: String(pagination.limit ?? 10)
    });
  }

  async getCampaignOpenLocations(
    campaignId: string,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<any> {
    return this.request('Data.Campaign.OpenLocations', {
      CampaignID: campaignId,
      Page: String(pagination.page ?? 1),
      Limit: String(pagination.limit ?? 10)
    });
  }

  async getCampaignForwards(
    campaignId: string,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<any> {
    return this.request('Data.Campaign.Forwards', {
      CampaignID: campaignId,
      Page: String(pagination.page ?? 1),
      Limit: String(pagination.limit ?? 10)
    });
  }

  async getCampaignBounceDetails(
    campaignId: string,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<any> {
    return this.request('Data.Campaign.Bounces', {
      CampaignID: campaignId,
      Page: String(pagination.page ?? 1),
      Limit: String(pagination.limit ?? 10)
    });
  }

  async getListOverallReport(listId: string): Promise<any> {
    return this.request('Report.List.Overall', { ListID: listId });
  }
}
