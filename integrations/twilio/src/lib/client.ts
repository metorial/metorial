import { createAxios } from '@slates/provider';
import { twilioApiError } from './errors';

let coreApi = createAxios({
  baseURL: 'https://api.twilio.com/2010-04-01'
});

let verifyApi = createAxios({
  baseURL: 'https://verify.twilio.com/v2'
});

let lookupsApi = createAxios({
  baseURL: 'https://lookups.twilio.com/v2'
});

let conversationsApi = createAxios({
  baseURL: 'https://conversations.twilio.com/v1'
});

let messagingServicesApi = createAxios({
  baseURL: 'https://messaging.twilio.com/v1'
});

export interface TwilioClientConfig {
  accountSid: string;
  token: string;
  apiKeySid?: string;
}

let buildAuthHeader = (config: TwilioClientConfig): string => {
  let username = config.apiKeySid || config.accountSid;
  let password = config.token;
  return `Basic ${btoa(`${username}:${password}`)}`;
};

type FormValue = string | string[] | undefined | null;
type FormParams = Record<string, FormValue>;
type ApiResponse<T> = { data: T };

let encodeFormData = (params: FormParams): string => {
  let parts: string[] = [];
  for (let key of Object.keys(params)) {
    let value = params[key];
    if (value === undefined || value === null) continue;

    let values = Array.isArray(value) ? value : [value];
    for (let item of values) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
    }
  }
  return parts.join('&');
};

let twilioRequest = async <T>(
  operation: string,
  request: () => Promise<ApiResponse<T>>
): Promise<T> => {
  try {
    let response = await request();
    return response.data;
  } catch (error) {
    throw twilioApiError(error, operation);
  }
};

let twilioRequestNoData = async (
  operation: string,
  request: () => Promise<unknown>
): Promise<void> => {
  try {
    await request();
  } catch (error) {
    throw twilioApiError(error, operation);
  }
};

export class TwilioClient {
  private authHeader: string;
  private accountSid: string;

  constructor(config: TwilioClientConfig) {
    this.authHeader = buildAuthHeader(config);
    this.accountSid = config.accountSid;
  }

  // ==================== Messages ====================

  async sendMessage(params: {
    to: string;
    from?: string;
    body?: string;
    messagingServiceSid?: string;
    mediaUrl?: string[];
    statusCallback?: string;
    scheduleType?: string;
    sendAt?: string;
    contentSid?: string;
    contentVariables?: string;
    shortenUrls?: boolean;
    sendAsMms?: boolean;
  }) {
    let formParams: FormParams = {
      To: params.to,
      From: params.from,
      Body: params.body,
      MessagingServiceSid: params.messagingServiceSid,
      StatusCallback: params.statusCallback,
      ScheduleType: params.scheduleType,
      SendAt: params.sendAt,
      ContentSid: params.contentSid,
      ContentVariables: params.contentVariables,
      MediaUrl: params.mediaUrl
    };
    if (params.shortenUrls !== undefined) formParams.ShortenUrls = String(params.shortenUrls);
    if (params.sendAsMms !== undefined) formParams.SendAsMms = String(params.sendAsMms);

    return await twilioRequest('send message', () =>
      coreApi.post(`/Accounts/${this.accountSid}/Messages.json`, encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async getMessage(messageSid: string) {
    return await twilioRequest('fetch message', () =>
      coreApi.get(`/Accounts/${this.accountSid}/Messages/${messageSid}.json`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async listMessages(params?: {
    to?: string;
    from?: string;
    dateSent?: string;
    dateSentBefore?: string;
    dateSentAfter?: string;
    pageSize?: number;
    pageToken?: string;
    page?: number;
  }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      queryParams.To = params.to;
      queryParams.From = params.from;
      queryParams.DateSent = params.dateSent;
      queryParams['DateSent<'] = params.dateSentBefore;
      queryParams['DateSent>'] = params.dateSentAfter;
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
      if (params.pageToken) queryParams.PageToken = params.pageToken;
      if (params.page !== undefined) queryParams.Page = String(params.page);
    }

    let query = encodeFormData(queryParams);
    let url = `/Accounts/${this.accountSid}/Messages.json${query ? `?${query}` : ''}`;

    return await twilioRequest('list messages', () =>
      coreApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async deleteMessage(messageSid: string) {
    await twilioRequestNoData('delete message', () =>
      coreApi.delete(`/Accounts/${this.accountSid}/Messages/${messageSid}.json`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async cancelScheduledMessage(messageSid: string) {
    return await twilioRequest('cancel scheduled message', () =>
      coreApi.post(
        `/Accounts/${this.accountSid}/Messages/${messageSid}.json`,
        encodeFormData({ Status: 'canceled' }),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  async redactMessage(messageSid: string) {
    return await twilioRequest('redact message', () =>
      coreApi.post(
        `/Accounts/${this.accountSid}/Messages/${messageSid}.json`,
        encodeFormData({ Body: '' }),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  // ==================== Calls ====================

  async makeCall(params: {
    to: string;
    from: string;
    url?: string;
    twiml?: string;
    applicationSid?: string;
    method?: string;
    statusCallback?: string;
    statusCallbackMethod?: string;
    statusCallbackEvent?: string[];
    timeout?: number;
    record?: boolean;
    recordingChannels?: string;
    recordingStatusCallback?: string;
    machineDetection?: string;
    callerId?: string;
  }) {
    let formParams: FormParams = {
      To: params.to,
      From: params.from,
      Url: params.url,
      Twiml: params.twiml,
      ApplicationSid: params.applicationSid,
      Method: params.method,
      StatusCallback: params.statusCallback,
      StatusCallbackMethod: params.statusCallbackMethod,
      MachineDetection: params.machineDetection,
      CallerId: params.callerId,
      StatusCallbackEvent: params.statusCallbackEvent
    };

    if (params.timeout !== undefined) formParams.Timeout = String(params.timeout);
    if (params.record !== undefined) formParams.Record = String(params.record);
    if (params.recordingChannels) formParams.RecordingChannels = params.recordingChannels;
    if (params.recordingStatusCallback)
      formParams.RecordingStatusCallback = params.recordingStatusCallback;

    return await twilioRequest('make call', () =>
      coreApi.post(`/Accounts/${this.accountSid}/Calls.json`, encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async getCall(callSid: string) {
    return await twilioRequest('fetch call', () =>
      coreApi.get(`/Accounts/${this.accountSid}/Calls/${callSid}.json`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async listCalls(params?: {
    to?: string;
    from?: string;
    status?: string;
    startTimeBefore?: string;
    startTimeAfter?: string;
    parentCallSid?: string;
    pageSize?: number;
    page?: number;
  }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      queryParams.To = params.to;
      queryParams.From = params.from;
      queryParams.Status = params.status;
      queryParams['StartTime<'] = params.startTimeBefore;
      queryParams['StartTime>'] = params.startTimeAfter;
      queryParams.ParentCallSid = params.parentCallSid;
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
      if (params.page !== undefined) queryParams.Page = String(params.page);
    }

    let query = encodeFormData(queryParams);
    let url = `/Accounts/${this.accountSid}/Calls.json${query ? `?${query}` : ''}`;

    return await twilioRequest('list calls', () =>
      coreApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async updateCall(
    callSid: string,
    params: {
      url?: string;
      method?: string;
      status?: string;
      twiml?: string;
      statusCallback?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      Url: params.url,
      Method: params.method,
      Status: params.status,
      Twiml: params.twiml,
      StatusCallback: params.statusCallback
    };

    return await twilioRequest('update call', () =>
      coreApi.post(
        `/Accounts/${this.accountSid}/Calls/${callSid}.json`,
        encodeFormData(formParams),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  // ==================== Verify ====================

  async createVerification(
    serviceSid: string,
    params: {
      to: string;
      channel: string;
      locale?: string;
      customCode?: string;
      amount?: string;
      payee?: string;
      templateSid?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      To: params.to,
      Channel: params.channel,
      Locale: params.locale,
      CustomCode: params.customCode,
      Amount: params.amount,
      Payee: params.payee,
      TemplateSid: params.templateSid
    };

    return await twilioRequest('create verification', () =>
      verifyApi.post(`/Services/${serviceSid}/Verifications`, encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async checkVerification(
    serviceSid: string,
    params: {
      code: string;
      to?: string;
      verificationSid?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      Code: params.code,
      To: params.to,
      VerificationSid: params.verificationSid
    };

    return await twilioRequest('check verification', () =>
      verifyApi.post(`/Services/${serviceSid}/VerificationCheck`, encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async listVerifyServices(params?: { pageSize?: number; page?: number; pageToken?: string }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params?.pageSize) queryParams.PageSize = String(params.pageSize);
    if (params?.page !== undefined) queryParams.Page = String(params.page);
    if (params?.pageToken) queryParams.PageToken = params.pageToken;

    let query = encodeFormData(queryParams);
    let url = `/Services${query ? `?${query}` : ''}`;

    return await twilioRequest('list verify services', () =>
      verifyApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  // ==================== Lookup ====================

  async lookupPhoneNumber(
    phoneNumber: string,
    params?: {
      fields?: string[];
      countryCode?: string;
      firstName?: string;
      lastName?: string;
      addressLine1?: string;
    }
  ) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      if (params.fields && params.fields.length > 0)
        queryParams.Fields = params.fields.join(',');
      queryParams.CountryCode = params.countryCode;
      queryParams.FirstName = params.firstName;
      queryParams.LastName = params.lastName;
      queryParams.AddressLine1 = params.addressLine1;
    }

    let query = encodeFormData(queryParams);
    let encodedNumber = encodeURIComponent(phoneNumber);
    let url = `/PhoneNumbers/${encodedNumber}${query ? `?${query}` : ''}`;

    return await twilioRequest('lookup phone number', () =>
      lookupsApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  // ==================== Phone Numbers ====================

  async searchAvailablePhoneNumbers(
    countryCode: string,
    type: 'Local' | 'TollFree' | 'Mobile',
    params?: {
      areaCode?: string;
      contains?: string;
      inRegion?: string;
      inPostalCode?: string;
      smsEnabled?: boolean;
      voiceEnabled?: boolean;
      mmsEnabled?: boolean;
      pageSize?: number;
    }
  ) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      queryParams.AreaCode = params.areaCode;
      queryParams.Contains = params.contains;
      queryParams.InRegion = params.inRegion;
      queryParams.InPostalCode = params.inPostalCode;
      if (params.smsEnabled !== undefined) queryParams.SmsEnabled = String(params.smsEnabled);
      if (params.voiceEnabled !== undefined)
        queryParams.VoiceEnabled = String(params.voiceEnabled);
      if (params.mmsEnabled !== undefined) queryParams.MmsEnabled = String(params.mmsEnabled);
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
    }

    let query = encodeFormData(queryParams);
    let url = `/Accounts/${this.accountSid}/AvailablePhoneNumbers/${countryCode}/${type}.json${query ? `?${query}` : ''}`;

    return await twilioRequest('search available phone numbers', () =>
      coreApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async purchasePhoneNumber(params: {
    phoneNumber: string;
    friendlyName?: string;
    voiceUrl?: string;
    voiceMethod?: string;
    smsUrl?: string;
    smsMethod?: string;
    statusCallback?: string;
  }) {
    let formParams: Record<string, string | undefined> = {
      PhoneNumber: params.phoneNumber,
      FriendlyName: params.friendlyName,
      VoiceUrl: params.voiceUrl,
      VoiceMethod: params.voiceMethod,
      SmsUrl: params.smsUrl,
      SmsMethod: params.smsMethod,
      StatusCallback: params.statusCallback
    };

    return await twilioRequest('purchase phone number', () =>
      coreApi.post(
        `/Accounts/${this.accountSid}/IncomingPhoneNumbers.json`,
        encodeFormData(formParams),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  async getIncomingPhoneNumber(phoneNumberSid: string) {
    return await twilioRequest('fetch incoming phone number', () =>
      coreApi.get(`/Accounts/${this.accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async listIncomingPhoneNumbers(params?: {
    friendlyName?: string;
    phoneNumber?: string;
    pageSize?: number;
    page?: number;
  }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      queryParams.FriendlyName = params.friendlyName;
      queryParams.PhoneNumber = params.phoneNumber;
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
      if (params.page !== undefined) queryParams.Page = String(params.page);
    }

    let query = encodeFormData(queryParams);
    let url = `/Accounts/${this.accountSid}/IncomingPhoneNumbers.json${query ? `?${query}` : ''}`;

    return await twilioRequest('list incoming phone numbers', () =>
      coreApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async updateIncomingPhoneNumber(
    phoneNumberSid: string,
    params: {
      friendlyName?: string;
      voiceUrl?: string;
      voiceMethod?: string;
      voiceFallbackUrl?: string;
      smsUrl?: string;
      smsMethod?: string;
      smsFallbackUrl?: string;
      statusCallback?: string;
      statusCallbackMethod?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      FriendlyName: params.friendlyName,
      VoiceUrl: params.voiceUrl,
      VoiceMethod: params.voiceMethod,
      VoiceFallbackUrl: params.voiceFallbackUrl,
      SmsUrl: params.smsUrl,
      SmsMethod: params.smsMethod,
      SmsFallbackUrl: params.smsFallbackUrl,
      StatusCallback: params.statusCallback,
      StatusCallbackMethod: params.statusCallbackMethod
    };

    return await twilioRequest('update incoming phone number', () =>
      coreApi.post(
        `/Accounts/${this.accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
        encodeFormData(formParams),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  async releasePhoneNumber(phoneNumberSid: string) {
    await twilioRequestNoData('release phone number', () =>
      coreApi.delete(
        `/Accounts/${this.accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
        { headers: { Authorization: this.authHeader } }
      )
    );
  }

  // ==================== Conversations ====================

  async createConversation(params: {
    friendlyName?: string;
    uniqueName?: string;
    attributes?: string;
    state?: string;
    messagingServiceSid?: string;
  }) {
    let formParams: Record<string, string | undefined> = {
      FriendlyName: params.friendlyName,
      UniqueName: params.uniqueName,
      Attributes: params.attributes,
      State: params.state,
      MessagingServiceSid: params.messagingServiceSid
    };

    return await twilioRequest('create conversation', () =>
      conversationsApi.post('/Conversations', encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async getConversation(conversationSid: string) {
    return await twilioRequest('fetch conversation', () =>
      conversationsApi.get(`/Conversations/${conversationSid}`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async listConversations(params?: { pageSize?: number; state?: string }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
      queryParams.State = params.state;
    }

    let query = encodeFormData(queryParams);
    let url = `/Conversations${query ? `?${query}` : ''}`;

    return await twilioRequest('list conversations', () =>
      conversationsApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async updateConversation(
    conversationSid: string,
    params: {
      friendlyName?: string;
      uniqueName?: string;
      attributes?: string;
      state?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      FriendlyName: params.friendlyName,
      UniqueName: params.uniqueName,
      Attributes: params.attributes,
      State: params.state
    };

    return await twilioRequest('update conversation', () =>
      conversationsApi.post(`/Conversations/${conversationSid}`, encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async deleteConversation(conversationSid: string) {
    await twilioRequestNoData('delete conversation', () =>
      conversationsApi.delete(`/Conversations/${conversationSid}`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async addConversationParticipant(
    conversationSid: string,
    params: {
      identity?: string;
      messagingBindingAddress?: string;
      messagingBindingProxyAddress?: string;
      attributes?: string;
      roleSid?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      Identity: params.identity,
      'MessagingBinding.Address': params.messagingBindingAddress,
      'MessagingBinding.ProxyAddress': params.messagingBindingProxyAddress,
      Attributes: params.attributes,
      RoleSid: params.roleSid
    };

    return await twilioRequest('add conversation participant', () =>
      conversationsApi.post(
        `/Conversations/${conversationSid}/Participants`,
        encodeFormData(formParams),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  async listConversationParticipants(conversationSid: string, params?: { pageSize?: number }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params?.pageSize) queryParams.PageSize = String(params.pageSize);

    let query = encodeFormData(queryParams);
    let url = `/Conversations/${conversationSid}/Participants${query ? `?${query}` : ''}`;

    return await twilioRequest('list conversation participants', () =>
      conversationsApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async removeConversationParticipant(conversationSid: string, participantSid: string) {
    await twilioRequestNoData('remove conversation participant', () =>
      conversationsApi.delete(
        `/Conversations/${conversationSid}/Participants/${participantSid}`,
        { headers: { Authorization: this.authHeader } }
      )
    );
  }

  async sendConversationMessage(
    conversationSid: string,
    params: {
      author?: string;
      body: string;
      attributes?: string;
      mediaSid?: string;
    }
  ) {
    let formParams: Record<string, string | undefined> = {
      Author: params.author,
      Body: params.body,
      Attributes: params.attributes,
      MediaSid: params.mediaSid
    };

    return await twilioRequest('send conversation message', () =>
      conversationsApi.post(
        `/Conversations/${conversationSid}/Messages`,
        encodeFormData(formParams),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    );
  }

  async listConversationMessages(
    conversationSid: string,
    params?: { pageSize?: number; order?: string }
  ) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
      queryParams.Order = params.order;
    }

    let query = encodeFormData(queryParams);
    let url = `/Conversations/${conversationSid}/Messages${query ? `?${query}` : ''}`;

    return await twilioRequest('list conversation messages', () =>
      conversationsApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  // ==================== Messaging Services ====================

  async createMessagingService(params: {
    friendlyName: string;
    inboundRequestUrl?: string;
    inboundMethod?: string;
    fallbackUrl?: string;
    fallbackMethod?: string;
    statusCallback?: string;
    stickySender?: boolean;
    mmsConverter?: boolean;
    smartEncoding?: boolean;
    areaCodeGeomatch?: boolean;
    validityPeriod?: number;
    scanMessageContent?: string;
    usecase?: string;
    useInboundWebhookOnNumber?: boolean;
  }) {
    let formParams: FormParams = {
      FriendlyName: params.friendlyName,
      InboundRequestUrl: params.inboundRequestUrl,
      InboundMethod: params.inboundMethod,
      FallbackUrl: params.fallbackUrl,
      FallbackMethod: params.fallbackMethod,
      StatusCallback: params.statusCallback,
      ScanMessageContent: params.scanMessageContent,
      Usecase: params.usecase
    };
    if (params.stickySender !== undefined)
      formParams.StickySender = String(params.stickySender);
    if (params.mmsConverter !== undefined)
      formParams.MmsConverter = String(params.mmsConverter);
    if (params.smartEncoding !== undefined)
      formParams.SmartEncoding = String(params.smartEncoding);
    if (params.areaCodeGeomatch !== undefined)
      formParams.AreaCodeGeomatch = String(params.areaCodeGeomatch);
    if (params.validityPeriod !== undefined)
      formParams.ValidityPeriod = String(params.validityPeriod);
    if (params.useInboundWebhookOnNumber !== undefined)
      formParams.UseInboundWebhookOnNumber = String(params.useInboundWebhookOnNumber);

    return await twilioRequest('create messaging service', () =>
      messagingServicesApi.post('/Services', encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async getMessagingService(serviceSid: string) {
    return await twilioRequest('fetch messaging service', () =>
      messagingServicesApi.get(`/Services/${serviceSid}`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async listMessagingServices(params?: {
    pageSize?: number;
    page?: number;
    pageToken?: string;
  }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params?.pageSize) queryParams.PageSize = String(params.pageSize);
    if (params?.page !== undefined) queryParams.Page = String(params.page);
    if (params?.pageToken) queryParams.PageToken = params.pageToken;

    let query = encodeFormData(queryParams);
    let url = `/Services${query ? `?${query}` : ''}`;

    return await twilioRequest('list messaging services', () =>
      messagingServicesApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async updateMessagingService(
    serviceSid: string,
    params: {
      friendlyName?: string;
      inboundRequestUrl?: string;
      inboundMethod?: string;
      fallbackUrl?: string;
      fallbackMethod?: string;
      statusCallback?: string;
      stickySender?: boolean;
      mmsConverter?: boolean;
      smartEncoding?: boolean;
      areaCodeGeomatch?: boolean;
      validityPeriod?: number;
      scanMessageContent?: string;
      usecase?: string;
      useInboundWebhookOnNumber?: boolean;
    }
  ) {
    let formParams: FormParams = {
      FriendlyName: params.friendlyName,
      InboundRequestUrl: params.inboundRequestUrl,
      InboundMethod: params.inboundMethod,
      FallbackUrl: params.fallbackUrl,
      FallbackMethod: params.fallbackMethod,
      StatusCallback: params.statusCallback,
      ScanMessageContent: params.scanMessageContent,
      Usecase: params.usecase
    };
    if (params.stickySender !== undefined)
      formParams.StickySender = String(params.stickySender);
    if (params.mmsConverter !== undefined)
      formParams.MmsConverter = String(params.mmsConverter);
    if (params.smartEncoding !== undefined)
      formParams.SmartEncoding = String(params.smartEncoding);
    if (params.areaCodeGeomatch !== undefined)
      formParams.AreaCodeGeomatch = String(params.areaCodeGeomatch);
    if (params.validityPeriod !== undefined)
      formParams.ValidityPeriod = String(params.validityPeriod);
    if (params.useInboundWebhookOnNumber !== undefined)
      formParams.UseInboundWebhookOnNumber = String(params.useInboundWebhookOnNumber);

    return await twilioRequest('update messaging service', () =>
      messagingServicesApi.post(`/Services/${serviceSid}`, encodeFormData(formParams), {
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    );
  }

  async deleteMessagingService(serviceSid: string) {
    await twilioRequestNoData('delete messaging service', () =>
      messagingServicesApi.delete(`/Services/${serviceSid}`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  // ==================== Recordings ====================

  async listCallRecordings(callSid: string, params?: { pageSize?: number }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params?.pageSize) queryParams.PageSize = String(params.pageSize);

    let query = encodeFormData(queryParams);
    let url = `/Accounts/${this.accountSid}/Calls/${callSid}/Recordings.json${query ? `?${query}` : ''}`;

    return await twilioRequest('list call recordings', () =>
      coreApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async listRecordings(params?: {
    callSid?: string;
    dateCreated?: string;
    dateCreatedBefore?: string;
    dateCreatedAfter?: string;
    pageSize?: number;
    page?: number;
    pageToken?: string;
  }) {
    let queryParams: Record<string, string | undefined> = {};
    if (params) {
      queryParams.CallSid = params.callSid;
      queryParams.DateCreated = params.dateCreated;
      queryParams['DateCreated<'] = params.dateCreatedBefore;
      queryParams['DateCreated>'] = params.dateCreatedAfter;
      if (params.pageSize) queryParams.PageSize = String(params.pageSize);
      if (params.page !== undefined) queryParams.Page = String(params.page);
      if (params.pageToken) queryParams.PageToken = params.pageToken;
    }

    let query = encodeFormData(queryParams);
    let url = `/Accounts/${this.accountSid}/Recordings.json${query ? `?${query}` : ''}`;

    return await twilioRequest('list recordings', () =>
      coreApi.get(url, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  async getRecording(recordingSid: string) {
    return await twilioRequest('fetch recording', () =>
      coreApi.get(`/Accounts/${this.accountSid}/Recordings/${recordingSid}.json`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }

  // ==================== Account ====================

  async getAccount() {
    return await twilioRequest('fetch account', () =>
      coreApi.get(`/Accounts/${this.accountSid}.json`, {
        headers: { Authorization: this.authHeader }
      })
    );
  }
}
