import { createAxios } from 'slates';

export interface SendloopClientConfig {
  token: string;
  subdomain: string;
}

export class SendloopClient {
  private token: string;
  private baseUrl: string;

  constructor(config: SendloopClientConfig) {
    this.token = config.token;
    this.baseUrl = `https://${config.subdomain}.sendloop.com/api/v3`;
  }

  private async request(command: string, params: Record<string, string> = {}): Promise<any> {
    let axios = createAxios();

    let formParams = new URLSearchParams({
      APIKey: this.token,
      ...params
    });

    let response = await axios.post(`${this.baseUrl}/${command}/json`, formParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    let data = response.data;

    if (data && data.Success === false) {
      let errorMessage =
        data.ErrorMessage || data.ErrorText || data.Error || 'Unknown Sendloop API error';
      throw new Error(`Sendloop API error: ${errorMessage}`);
    }

    return data;
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
      ListName: params.name
    };
    if (params.optInMode) requestParams.OptInMode = params.optInMode;
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
    if (params.name) requestParams.ListName = params.name;
    if (params.optInMode) requestParams.OptInMode = params.optInMode;
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
      SubscriberListID: params.listId,
      EmailAddress: params.emailAddress,
      SubscriptionIP: params.subscriptionIp || '127.0.0.1'
    };

    if (params.fields) {
      for (let [fieldId, value] of Object.entries(params.fields)) {
        requestParams[`Fields[${fieldId}]`] = value;
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
        requestParams[`Fields[${fieldId}]`] = value;
      }
    }

    return this.request('Subscriber.Update', requestParams);
  }

  // ---- Suppression List ----

  async getSuppressionList(): Promise<any> {
    return this.request('SuppressionList.GetList');
  }

  async addToSuppressionList(emailAddress: string): Promise<any> {
    return this.request('SuppressionList.Add', { EmailAddress: emailAddress });
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
    let requestParams: Record<string, string> = {
      CampaignName: params.campaignName,
      FromName: params.fromName,
      FromEmail: params.fromEmail,
      Subject: params.subject
    };
    if (params.replyToName) requestParams.ReplyToName = params.replyToName;
    if (params.replyToEmail) requestParams.ReplyToEmail = params.replyToEmail;
    if (params.htmlContent) requestParams.HTMLContent = params.htmlContent;
    if (params.plainTextContent) requestParams.PlainTextContent = params.plainTextContent;
    if (params.targetListIds) requestParams.TargetListIDs = params.targetListIds;
    if (params.scheduleType) requestParams.ScheduleType = params.scheduleType;
    if (params.scheduleDateTime) requestParams.ScheduleDateTime = params.scheduleDateTime;

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
    if (params.campaignName) requestParams.CampaignName = params.campaignName;
    if (params.fromName) requestParams.FromName = params.fromName;
    if (params.fromEmail) requestParams.FromEmail = params.fromEmail;
    if (params.replyToName) requestParams.ReplyToName = params.replyToName;
    if (params.replyToEmail) requestParams.ReplyToEmail = params.replyToEmail;
    if (params.subject) requestParams.Subject = params.subject;
    if (params.htmlContent) requestParams.HTMLContent = params.htmlContent;
    if (params.plainTextContent) requestParams.PlainTextContent = params.plainTextContent;
    if (params.targetListIds) requestParams.TargetListIDs = params.targetListIds;

    return this.request('Campaign.Update', requestParams);
  }

  async deleteCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.Delete', { CampaignID: campaignId });
  }

  async sendCampaign(campaignId: string): Promise<any> {
    return this.request('Campaign.Send', { CampaignID: campaignId });
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

  async getCampaignEmailOpens(campaignId: string): Promise<any> {
    return this.request('Data.Campaign.EmailOpens', { CampaignID: campaignId });
  }

  async getCampaignLinkClicks(campaignId: string): Promise<any> {
    return this.request('Data.Campaign.LinkClicks', { CampaignID: campaignId });
  }

  async getCampaignUnsubscriptions(campaignId: string): Promise<any> {
    return this.request('Data.Campaign.Unsubscriptions', { CampaignID: campaignId });
  }

  async getCampaignOpenLocations(campaignId: string): Promise<any> {
    return this.request('Data.Campaign.OpenLocations', { CampaignID: campaignId });
  }

  async getCampaignForwards(campaignId: string): Promise<any> {
    return this.request('Data.Campaign.Forwards', { CampaignID: campaignId });
  }

  async getCampaignBounceDetails(campaignId: string): Promise<any> {
    return this.request('Data.Campaign.Bounces', { CampaignID: campaignId });
  }

  async getListOverallReport(listId: string): Promise<any> {
    return this.request('Report.List.Overall', { ListID: listId });
  }
}
