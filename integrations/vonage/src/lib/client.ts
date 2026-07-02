import { createAxios } from 'slates';
import { generateVonageJwt } from './jwt';

// Vonage has two primary base URLs:
// - rest.nexmo.com: Legacy APIs (SMS, Numbers, Number Insight, Account)
// - api.nexmo.com: Newer APIs (Messages, Voice, Verify v2, Applications, Subaccounts)

export interface VonageAuth {
  apiKey: string;
  apiSecret: string;
  applicationId?: string;
  privateKey?: string;
}

export class VonageRestClient {
  private auth: VonageAuth;
  private restApi: ReturnType<typeof createAxios>;
  private mainApi: ReturnType<typeof createAxios>;

  constructor(auth: VonageAuth) {
    this.auth = auth;
    this.restApi = createAxios({ baseURL: 'https://rest.nexmo.com' });
    this.mainApi = createAxios({ baseURL: 'https://api.nexmo.com' });
  }

  private async getJwtToken(): Promise<string> {
    if (!this.auth.applicationId || !this.auth.privateKey) {
      throw new Error(
        'Application ID and Private Key are required for JWT authentication. Use the "API Key, Secret & Application JWT" auth method.'
      );
    }
    return generateVonageJwt(this.auth.applicationId, this.auth.privateKey);
  }

  private getBasicAuthHeader(): string {
    return `Basic ${btoa(`${this.auth.apiKey}:${this.auth.apiSecret}`)}`;
  }

  // ========== Messages API (JWT auth, api.nexmo.com) ==========

  async sendMessage(body: {
    messageType: string;
    channel: string;
    to: string;
    from: string;
    text?: string;
    imageUrl?: string;
    imageCaption?: string;
    audioUrl?: string;
    videoUrl?: string;
    fileUrl?: string;
    fileCaption?: string;
    templateName?: string;
    templateParameters?: string[];
    whatsappPolicy?: string;
    whatsappLocale?: string;
    clientRef?: string;
    webhookUrl?: string;
  }): Promise<{ messageUuid: string }> {
    let token = await this.getJwtToken();

    let requestBody: Record<string, unknown> = {
      message_type: body.messageType,
      channel: body.channel,
      to: body.to,
      from: body.from
    };

    if (body.clientRef) requestBody.client_ref = body.clientRef;
    if (body.webhookUrl) requestBody.webhook_url = body.webhookUrl;

    switch (body.messageType) {
      case 'text':
        requestBody.text = body.text;
        break;
      case 'image':
        requestBody.image = { url: body.imageUrl, caption: body.imageCaption };
        break;
      case 'audio':
        requestBody.audio = { url: body.audioUrl };
        break;
      case 'video':
        requestBody.video = { url: body.videoUrl };
        break;
      case 'file':
        requestBody.file = { url: body.fileUrl, caption: body.fileCaption };
        break;
      case 'template':
        requestBody.whatsapp = {
          policy: body.whatsappPolicy || 'deterministic',
          locale: body.whatsappLocale || 'en'
        };
        requestBody.template = {
          name: body.templateName,
          parameters: body.templateParameters
        };
        break;
    }

    let res = await this.mainApi.post('/v1/messages', requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    return { messageUuid: res.data.message_uuid };
  }

  // ========== SMS API (api key/secret, rest.nexmo.com) ==========

  async sendSms(body: {
    to: string;
    from: string;
    text: string;
    type?: string;
    statusReportReq?: boolean;
    clientRef?: string;
    callbackUrl?: string;
  }): Promise<{
    messageCount: string;
    messages: Array<{
      messageId: string;
      to: string;
      status: string;
      remainingBalance: string;
      messagePrice: string;
      network: string;
      errorText?: string;
    }>;
  }> {
    let requestBody: Record<string, unknown> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret,
      to: body.to,
      from: body.from,
      text: body.text
    };

    if (body.type) requestBody.type = body.type;
    if (body.statusReportReq !== undefined)
      requestBody.status_report_req = body.statusReportReq ? 1 : 0;
    if (body.clientRef) requestBody.client_ref = body.clientRef;
    if (body.callbackUrl) requestBody.callback = body.callbackUrl;

    let res = await this.restApi.post('/sms/json', requestBody, {
      headers: { 'Content-Type': 'application/json' }
    });

    return {
      messageCount: res.data['message-count'],
      messages: (res.data.messages || []).map((m: Record<string, unknown>) => ({
        messageId: m['message-id'],
        to: m.to,
        status: m.status,
        remainingBalance: m['remaining-balance'],
        messagePrice: m['message-price'],
        network: m.network,
        errorText: m['error-text']
      }))
    };
  }

  // ========== Voice API (JWT auth, api.nexmo.com) ==========

  async createCall(body: {
    to: Array<{ type: string; number?: string; uri?: string }>;
    from: { type: string; number: string };
    ncco?: Record<string, unknown>[];
    answerUrl?: string[];
    answerMethod?: string;
    eventUrl?: string[];
    eventMethod?: string;
    machineDetection?: string;
    lengthTimer?: number;
    ringingTimer?: number;
  }): Promise<{
    callUuid: string;
    status: string;
    direction: string;
    conversationUuid: string;
  }> {
    let token = await this.getJwtToken();

    let requestBody: Record<string, unknown> = {
      to: body.to,
      from: body.from
    };

    if (body.ncco) {
      requestBody.ncco = body.ncco;
    } else if (body.answerUrl) {
      requestBody.answer_url = body.answerUrl;
      if (body.answerMethod) requestBody.answer_method = body.answerMethod;
    }

    if (body.eventUrl) requestBody.event_url = body.eventUrl;
    if (body.eventMethod) requestBody.event_method = body.eventMethod;
    if (body.machineDetection) requestBody.machine_detection = body.machineDetection;
    if (body.lengthTimer) requestBody.length_timer = body.lengthTimer;
    if (body.ringingTimer) requestBody.ringing_timer = body.ringingTimer;

    let res = await this.mainApi.post('/v1/calls', requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      callUuid: res.data.uuid,
      status: res.data.status,
      direction: res.data.direction,
      conversationUuid: res.data.conversation_uuid
    };
  }

  async listCalls(params?: {
    status?: string;
    dateStart?: string;
    dateEnd?: string;
    pageSize?: number;
    recordIndex?: number;
    order?: string;
    conversationUuid?: string;
  }): Promise<{
    count: number;
    pageSize: number;
    recordIndex: number;
    calls: Record<string, unknown>[];
  }> {
    let token = await this.getJwtToken();

    let queryParams: Record<string, unknown> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.dateStart) queryParams.date_start = params.dateStart;
    if (params?.dateEnd) queryParams.date_end = params.dateEnd;
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.recordIndex) queryParams.record_index = params.recordIndex;
    if (params?.order) queryParams.order = params.order;
    if (params?.conversationUuid) queryParams.conversation_uuid = params.conversationUuid;

    let res = await this.mainApi.get('/v1/calls', {
      params: queryParams,
      headers: { Authorization: `Bearer ${token}` }
    });

    let embedded = res.data._embedded || {};
    let calls = (embedded.calls || []).map((c: Record<string, unknown>) => ({
      callUuid: c.uuid,
      conversationUuid: c.conversation_uuid,
      status: c.status,
      direction: c.direction,
      to: c.to,
      from: c.from,
      startTime: c.start_time,
      endTime: c.end_time,
      duration: c.duration,
      rate: c.rate,
      price: c.price,
      network: c.network
    }));

    return {
      count: res.data.count,
      pageSize: res.data.page_size,
      recordIndex: res.data.record_index,
      calls
    };
  }

  async getCall(callUuid: string): Promise<Record<string, unknown>> {
    let token = await this.getJwtToken();
    let res = await this.mainApi.get(`/v1/calls/${callUuid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    let c = res.data;
    return {
      callUuid: c.uuid,
      conversationUuid: c.conversation_uuid,
      status: c.status,
      direction: c.direction,
      to: c.to,
      from: c.from,
      startTime: c.start_time,
      endTime: c.end_time,
      duration: c.duration,
      rate: c.rate,
      price: c.price,
      network: c.network
    };
  }

  async modifyCall(
    callUuid: string,
    action: {
      action: string;
      destination?: { type: string; url: string[] };
    }
  ): Promise<void> {
    let token = await this.getJwtToken();
    await this.mainApi.put(`/v1/calls/${callUuid}`, action, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async playTts(
    callUuid: string,
    text: string,
    options?: {
      voiceName?: string;
      language?: string;
      style?: number;
      premium?: boolean;
      loop?: number;
      level?: number;
    }
  ): Promise<{ message: string; uuid: string }> {
    let token = await this.getJwtToken();
    let body: Record<string, unknown> = { text };
    if (options?.voiceName) body.voice_name = options.voiceName;
    if (options?.language) body.language = options.language;
    if (options?.style !== undefined) body.style = options.style;
    if (options?.premium !== undefined) body.premium = options.premium;
    if (options?.loop !== undefined) body.loop = options.loop;
    if (options?.level !== undefined) body.level = options.level;

    let res = await this.mainApi.put(`/v1/calls/${callUuid}/talk`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { message: res.data.message, uuid: res.data.uuid };
  }

  async stopTts(callUuid: string): Promise<void> {
    let token = await this.getJwtToken();
    await this.mainApi.delete(`/v1/calls/${callUuid}/talk`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async playStream(
    callUuid: string,
    streamUrl: string[],
    options?: {
      loop?: number;
      level?: number;
    }
  ): Promise<{ message: string; uuid: string }> {
    let token = await this.getJwtToken();
    let body: Record<string, unknown> = { stream_url: streamUrl };
    if (options?.loop !== undefined) body.loop = options.loop;
    if (options?.level !== undefined) body.level = options.level;

    let res = await this.mainApi.put(`/v1/calls/${callUuid}/stream`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { message: res.data.message, uuid: res.data.uuid };
  }

  async stopStream(callUuid: string): Promise<void> {
    let token = await this.getJwtToken();
    await this.mainApi.delete(`/v1/calls/${callUuid}/stream`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async sendDtmf(
    callUuid: string,
    digits: string
  ): Promise<{ message: string; uuid: string }> {
    let token = await this.getJwtToken();
    let res = await this.mainApi.put(
      `/v1/calls/${callUuid}/dtmf`,
      { digits },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { message: res.data.message, uuid: res.data.uuid };
  }

  // ========== Verify v2 API (JWT auth, api.nexmo.com) ==========

  async startVerification(body: {
    brand: string;
    to: string;
    channelTimeout?: number;
    codeLength?: number;
    locale?: string;
    workflows: Array<{
      channel: string;
      to?: string;
      from?: string;
      appHash?: string;
    }>;
  }): Promise<{ requestId: string; checkUrl?: string }> {
    let token = await this.getJwtToken();

    let workflows = body.workflows.map(w => {
      let wf: Record<string, unknown> = { channel: w.channel };
      if (w.to) wf.to = w.to;
      if (w.from) wf.from = w.from;
      if (w.appHash) wf.app_hash = w.appHash;
      return wf;
    });

    let requestBody: Record<string, unknown> = {
      brand: body.brand,
      workflow: workflows
    };

    // For channels that need a 'to' at the top level
    if (body.to) requestBody.to = body.to;
    if (body.channelTimeout) requestBody.channel_timeout = body.channelTimeout;
    if (body.codeLength) requestBody.code_length = body.codeLength;
    if (body.locale) requestBody.locale = body.locale;

    let res = await this.mainApi.post('/v2/verify', requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      requestId: res.data.request_id,
      checkUrl: res.data.check_url
    };
  }

  async checkVerificationCode(
    requestId: string,
    code: string
  ): Promise<{ requestId: string; status: string }> {
    let token = await this.getJwtToken();
    let res = await this.mainApi.post(
      `/v2/verify/${requestId}`,
      { code },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return {
      requestId: res.data.request_id || requestId,
      status: res.data.status || 'completed'
    };
  }

  async cancelVerification(requestId: string): Promise<void> {
    let token = await this.getJwtToken();
    await this.mainApi.delete(`/v2/verify/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // ========== Number Insight API (api key/secret, api.nexmo.com) ==========

  async numberInsight(
    level: 'basic' | 'standard' | 'advanced',
    number: string,
    country?: string
  ): Promise<Record<string, unknown>> {
    let path = `/ni/${level}/json`;

    let params: Record<string, string> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret,
      number
    };
    if (country) params.country = country;

    let res = await this.mainApi.get(path, { params });
    return res.data;
  }

  // ========== Number Management API (api key/secret, rest.nexmo.com) ==========

  async searchNumbers(params: {
    country: string;
    type?: string;
    pattern?: string;
    searchPattern?: number;
    features?: string;
    size?: number;
    index?: number;
  }): Promise<{
    count: number;
    numbers: Array<{
      country: string;
      msisdn: string;
      type: string;
      cost: string;
      features: string[];
    }>;
  }> {
    let queryParams: Record<string, unknown> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret,
      country: params.country
    };
    if (params.type) queryParams.type = params.type;
    if (params.pattern) queryParams.pattern = params.pattern;
    if (params.searchPattern !== undefined) queryParams.search_pattern = params.searchPattern;
    if (params.features) queryParams.features = params.features;
    if (params.size) queryParams.size = params.size;
    if (params.index) queryParams.index = params.index;

    let res = await this.restApi.get('/number/search', { params: queryParams });
    return {
      count: res.data.count,
      numbers: (res.data.numbers || []).map((n: Record<string, unknown>) => ({
        country: n.country,
        msisdn: n.msisdn,
        type: n.type,
        cost: n.cost,
        features: n.features
      }))
    };
  }

  async listOwnedNumbers(params?: {
    applicationId?: string;
    hasApplication?: boolean;
    country?: string;
    pattern?: string;
    searchPattern?: number;
    size?: number;
    index?: number;
  }): Promise<{
    count: number;
    numbers: Array<{
      country: string;
      msisdn: string;
      type: string;
      features: string[];
      moHttpUrl?: string;
      voiceCallbackType?: string;
      voiceCallbackValue?: string;
      applicationId?: string;
    }>;
  }> {
    let queryParams: Record<string, unknown> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret
    };
    if (params?.applicationId) queryParams.application_id = params.applicationId;
    if (params?.hasApplication !== undefined)
      queryParams.has_application = params.hasApplication;
    if (params?.country) queryParams.country = params.country;
    if (params?.pattern) queryParams.pattern = params.pattern;
    if (params?.searchPattern !== undefined) queryParams.search_pattern = params.searchPattern;
    if (params?.size) queryParams.size = params.size;
    if (params?.index) queryParams.index = params.index;

    let res = await this.restApi.get('/account/numbers', { params: queryParams });
    return {
      count: res.data.count,
      numbers: (res.data.numbers || []).map((n: Record<string, unknown>) => ({
        country: n.country,
        msisdn: n.msisdn,
        type: n.type,
        features: n.features,
        moHttpUrl: n.moHttpUrl,
        voiceCallbackType: n.voiceCallbackType,
        voiceCallbackValue: n.voiceCallbackValue,
        applicationId: n.app_id
      }))
    };
  }

  async buyNumber(country: string, msisdn: string, targetApiKey?: string): Promise<void> {
    let body: Record<string, string> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret,
      country,
      msisdn
    };
    if (targetApiKey) body.target_api_key = targetApiKey;

    await this.restApi.post('/number/buy', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async cancelNumber(country: string, msisdn: string, targetApiKey?: string): Promise<void> {
    let body: Record<string, string> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret,
      country,
      msisdn
    };
    if (targetApiKey) body.target_api_key = targetApiKey;

    await this.restApi.post('/number/cancel', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  async updateNumber(body: {
    country: string;
    msisdn: string;
    applicationId?: string;
    moHttpUrl?: string;
    moSmppSysType?: string;
    voiceCallbackType?: string;
    voiceCallbackValue?: string;
    voiceStatusCallback?: string;
  }): Promise<void> {
    let formData: Record<string, string> = {
      api_key: this.auth.apiKey,
      api_secret: this.auth.apiSecret,
      country: body.country,
      msisdn: body.msisdn
    };
    if (body.applicationId) formData.app_id = body.applicationId;
    if (body.moHttpUrl) formData.moHttpUrl = body.moHttpUrl;
    if (body.moSmppSysType) formData.moSmppSysType = body.moSmppSysType;
    if (body.voiceCallbackType) formData.voiceCallbackType = body.voiceCallbackType;
    if (body.voiceCallbackValue) formData.voiceCallbackValue = body.voiceCallbackValue;
    if (body.voiceStatusCallback) formData.voiceStatusCallback = body.voiceStatusCallback;

    await this.restApi.post('/number/update', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  }

  // ========== Application API (JWT auth, api.nexmo.com) ==========

  async listApplications(params?: { pageSize?: number; page?: number }): Promise<{
    totalItems: number;
    totalPages: number;
    page: number;
    pageSize: number;
    applications: Record<string, unknown>[];
  }> {
    let token = await this.getJwtToken();
    let queryParams: Record<string, unknown> = {};
    if (params?.pageSize) queryParams.page_size = params.pageSize;
    if (params?.page) queryParams.page = params.page;

    let res = await this.mainApi.get('/v2/applications', {
      params: queryParams,
      headers: { Authorization: `Bearer ${token}` }
    });

    let embedded = res.data._embedded || {};
    return {
      totalItems: res.data.total_items,
      totalPages: res.data.total_pages,
      page: res.data.page,
      pageSize: res.data.page_size,
      applications: (embedded.applications || []).map((a: Record<string, unknown>) =>
        this.mapApplication(a)
      )
    };
  }

  async getApplication(applicationId: string): Promise<Record<string, unknown>> {
    let token = await this.getJwtToken();
    let res = await this.mainApi.get(`/v2/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return this.mapApplication(res.data);
  }

  async createApplication(body: {
    name: string;
    capabilities?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    let token = await this.getJwtToken();
    let res = await this.mainApi.post('/v2/applications', body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return this.mapApplication(res.data);
  }

  async updateApplication(
    applicationId: string,
    body: {
      name?: string;
      capabilities?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let token = await this.getJwtToken();
    let res = await this.mainApi.put(`/v2/applications/${applicationId}`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return this.mapApplication(res.data);
  }

  async deleteApplication(applicationId: string): Promise<void> {
    let token = await this.getJwtToken();
    await this.mainApi.delete(`/v2/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private mapApplication(a: Record<string, unknown>): Record<string, unknown> {
    return {
      applicationId: a.id,
      name: a.name,
      capabilities: a.capabilities,
      keys: a.keys,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    };
  }

  // ========== Account API (api key/secret, rest.nexmo.com) ==========

  async getBalance(): Promise<{ value: number; autoReload: boolean }> {
    let res = await this.restApi.get('/account/get-balance', {
      params: {
        api_key: this.auth.apiKey,
        api_secret: this.auth.apiSecret
      }
    });
    return {
      value: res.data.value,
      autoReload: res.data.autoReload
    };
  }

  // ========== Subaccounts API (api key/secret Basic auth, api.nexmo.com) ==========

  async listSubaccounts(): Promise<{
    primaryAccount: Record<string, unknown>;
    subaccounts: Record<string, unknown>[];
  }> {
    let res = await this.mainApi.get(`/accounts/${this.auth.apiKey}/subaccounts`, {
      headers: { Authorization: this.getBasicAuthHeader() }
    });
    return {
      primaryAccount: res.data.primary_account
        ? {
            apiKey: res.data.primary_account.api_key,
            name: res.data.primary_account.name,
            createdAt: res.data.primary_account.created_at,
            suspended: res.data.primary_account.suspended,
            balance: res.data.primary_account.balance,
            creditLimit: res.data.primary_account.credit_limit
          }
        : {},
      subaccounts: (res.data._embedded?.subaccounts || []).map(
        (s: Record<string, unknown>) => ({
          apiKey: s.api_key,
          name: s.name,
          primaryAccountApiKey: s.primary_account_api_key,
          usePrimaryAccountBalance: s.use_primary_account_balance,
          createdAt: s.created_at,
          suspended: s.suspended,
          balance: s.balance,
          creditLimit: s.credit_limit
        })
      )
    };
  }

  async createSubaccount(body: {
    name: string;
    secret?: string;
    usePrimaryAccountBalance?: boolean;
  }): Promise<Record<string, unknown>> {
    let requestBody: Record<string, unknown> = { name: body.name };
    if (body.secret) requestBody.secret = body.secret;
    if (body.usePrimaryAccountBalance !== undefined)
      requestBody.use_primary_account_balance = body.usePrimaryAccountBalance;

    let res = await this.mainApi.post(
      `/accounts/${this.auth.apiKey}/subaccounts`,
      requestBody,
      {
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      apiKey: res.data.api_key,
      secret: res.data.secret,
      name: res.data.name,
      primaryAccountApiKey: res.data.primary_account_api_key,
      usePrimaryAccountBalance: res.data.use_primary_account_balance,
      createdAt: res.data.created_at,
      suspended: res.data.suspended,
      balance: res.data.balance,
      creditLimit: res.data.credit_limit
    };
  }

  async transferCredit(body: {
    from: string;
    to: string;
    amount: number;
    reference?: string;
  }): Promise<Record<string, unknown>> {
    let requestBody: Record<string, unknown> = {
      from: body.from,
      to: body.to,
      amount: body.amount
    };
    if (body.reference) requestBody.reference = body.reference;

    let res = await this.mainApi.post(
      `/accounts/${this.auth.apiKey}/credit-transfers`,
      requestBody,
      {
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );
    return {
      creditTransferId: res.data.credit_transfer_id,
      from: res.data.from,
      to: res.data.to,
      amount: res.data.amount,
      reference: res.data.reference,
      createdAt: res.data.created_at
    };
  }

  async transferBalance(body: {
    from: string;
    to: string;
    amount: number;
    reference?: string;
  }): Promise<Record<string, unknown>> {
    let requestBody: Record<string, unknown> = {
      from: body.from,
      to: body.to,
      amount: body.amount
    };
    if (body.reference) requestBody.reference = body.reference;

    let res = await this.mainApi.post(
      `/accounts/${this.auth.apiKey}/balance-transfers`,
      requestBody,
      {
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );
    return {
      balanceTransferId: res.data.balance_transfer_id,
      from: res.data.from,
      to: res.data.to,
      amount: res.data.amount,
      reference: res.data.reference,
      createdAt: res.data.created_at
    };
  }
}
