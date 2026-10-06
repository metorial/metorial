import { ServiceError } from '@lowerdeck/error';
import {
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios
} from 'slates';
import { generateVonageJwt, rsaPublicKey } from './jwt';
import {
  adapt,
  country,
  id,
  incomplete,
  integer,
  invalid,
  phone,
  protect,
  type Row,
  record,
  text,
  upstreamStatus,
  url
} from './validation';
export interface VonageAuth {
  apiKey: string;
  apiSecret: string;
  applicationId?: string;
  privateKey?: string;
}
const array = (value: unknown): Row[] => {
  if (!Array.isArray(value) || value.length > 1000) throw incomplete();
  return value.map(record);
};
const string = (value: unknown): string => {
  if (typeof value !== 'string' || !value.length) throw incomplete();
  return value;
};
const count = (value: unknown, minimum = 0): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
    throw incomplete();
  return value;
};
const decimal = (value: unknown): string => {
  if (typeof value !== 'string' || !/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) throw incomplete();
  return value;
};
const monetaryNumber = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (Number.isInteger(value) && !Number.isSafeInteger(value))
  )
    throw incomplete();
  return value;
};
const unique = (values: string[]) => {
  if (new Set(values).size !== values.length) throw incomplete();
};
export function validateAuth(auth: VonageAuth): VonageAuth {
  if (typeof auth.apiKey !== 'string' || !/^[a-zA-Z0-9]{8}$/.test(auth.apiKey))
    throw invalid('Provide the eight-character Vonage API key.');
  text(auth.apiSecret, 'API secret', 256);
  if (auth.apiSecret !== auth.apiSecret.trim() || auth.apiSecret.includes(':'))
    throw invalid('Provide the exact API secret without whitespace or a colon.');
  if ((auth.applicationId === undefined) !== (auth.privateKey === undefined))
    throw invalid('Provide both application ID and matching private key, or neither.');
  if (auth.applicationId !== undefined) id(auth.applicationId);
  return { ...auth };
}
export class VonageRestClient {
  private readonly auth: VonageAuth;
  private readonly restApi;
  private readonly mainApi;
  private readonly secrets: string[];
  constructor(auth: VonageAuth) {
    this.auth = validateAuth(auth);
    this.secrets = [auth.apiSecret, auth.privateKey ?? ''].filter(Boolean);
    const defaults = {
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 4 * 1024 * 1024,
      errorAdapter: adapt
    };
    this.restApi = createAuthenticatedAxios({
      ...defaults,
      baseURL: 'https://rest.nexmo.com'
    });
    this.mainApi = createAuthenticatedAxios({ ...defaults, baseURL: 'https://api.nexmo.com' });
  }
  private basic(): string {
    return `Basic ${Buffer.from(`${this.auth.apiKey}:${this.auth.apiSecret}`).toString('base64')}`;
  }
  private async authorization(jwt: 'required' | 'optional' | false): Promise<string> {
    if (jwt && this.auth.applicationId && this.auth.privateKey) {
      const token = await generateVonageJwt(this.auth.applicationId, this.auth.privateKey);
      this.secrets.push(token);
      return `Bearer ${token}`;
    }
    if (jwt === 'required')
      throw invalid(
        'Connect with the application ID and matching RSA private key to use the Voice API.'
      );
    return this.basic();
  }
  private async response(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: {
      rest?: boolean;
      jwt?: 'required' | 'optional';
      data?: Row;
      params?: Row;
      form?: boolean;
      statuses?: number[];
      application?: boolean;
      suppliedSecret?: string;
    } = {}
  ) {
    const { data, params } = options;
    protect(
      {
        path,
        data: data && options.suppliedSecret ? { ...data, secret: undefined } : data,
        params
      },
      [...this.secrets, ...(options.suppliedSecret ? [options.suppliedSecret] : [])]
    );
    const authorization = await this.authorization(options.jwt ?? false);
    const payload =
      options.form && data
        ? new URLSearchParams(
            Object.entries(pickDefined(data)).map(
              ([key, value]) => [key, String(value)] as [string, string]
            )
          ).toString()
        : data;
    const response = await requestAxios<unknown>(
      'Vonage request',
      () =>
        (options.rest ? this.restApi : this.mainApi).request({
          method,
          url: path,
          params: pickDefined(params ?? {}),
          data: payload,
          headers: {
            Authorization: authorization,
            Accept: 'application/json',
            'Content-Type': options.form
              ? 'application/x-www-form-urlencoded'
              : 'application/json'
          }
        }),
      adapt
    );
    if (!(options.statuses ?? [200]).includes(response.status)) throw incomplete();
    protect(
      Object.fromEntries(
        Object.keys(response.headers ?? {}).map(key => [
          key,
          getResponseHeaderValue(response.headers, key)
        ])
      ),
      [...this.secrets, ...(options.suppliedSecret ? [options.suppliedSecret] : [])]
    );
    let safe = response.data;
    if (options.application) {
      const app = record(safe);
      safe = {
        ...app,
        keys:
          app.keys === undefined ? undefined : { ...record(app.keys), private_key: undefined }
      };
    }
    if (options.suppliedSecret) {
      const subaccount = record(safe);
      if (subaccount.secret !== undefined && subaccount.secret !== options.suppliedSecret)
        throw incomplete();
      safe = { ...subaccount, secret: undefined };
    }
    protect(safe === undefined ? null : safe, [
      ...this.secrets,
      ...(options.suppliedSecret ? [options.suppliedSecret] : [])
    ]);
    return { status: response.status, data: safe };
  }
  private async data(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: Parameters<VonageRestClient['response']>[2] = {}
  ): Promise<Row> {
    return record((await this.response(method, path, options)).data);
  }
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
  }) {
    const supported: Record<string, string[]> = {
      sms: ['text'],
      mms: ['text', 'image', 'audio', 'video', 'file'],
      whatsapp: ['text', 'image', 'audio', 'video', 'file', 'template'],
      messenger: ['text', 'image', 'audio', 'video', 'file'],
      viber_service: ['text', 'image', 'video', 'file'],
      rcs: ['text', 'image', 'video', 'file']
    };
    if (!supported[body.channel]?.includes(body.messageType))
      throw invalid(
        'Choose a documented outbound message type for the selected channel. Templates in this input shape require WhatsApp; SMS supports text only.'
      );
    const to =
      body.channel === 'messenger'
        ? text(body.to, 'Messenger recipient ID', 50)
        : phone(body.to);
    const from = text(body.from, 'registered sender', 50);
    const native: Row = { channel: body.channel, message_type: body.messageType, to, from };
    if (body.messageType === 'text')
      native.text = text(
        body.text,
        'message text',
        body.channel === 'rcs' ? 3072 : body.channel === 'mms' ? 3000 : 3200,
        true
      );
    else if (body.messageType === 'template') {
      if (body.whatsappPolicy !== undefined && body.whatsappPolicy !== 'deterministic')
        throw invalid('WhatsApp templates require deterministic language policy.');
      const parameters = body.templateParameters ?? [];
      if (parameters.length > 100) throw invalid('Provide at most 100 template parameters.');
      parameters.forEach(value => text(value, 'template parameter'));
      native.template = {
        name: text(body.templateName, 'approved template name', 512),
        parameters
      };
      native.whatsapp = {
        policy: 'deterministic',
        locale: text(body.whatsappLocale ?? 'en', 'template locale', 32)
      };
    } else {
      const media =
        body.messageType === 'image'
          ? body.imageUrl
          : body.messageType === 'audio'
            ? body.audioUrl
            : body.messageType === 'video'
              ? body.videoUrl
              : body.fileUrl;
      const caption =
        body.messageType === 'image'
          ? body.imageCaption
          : body.messageType === 'file'
            ? body.fileCaption
            : undefined;
      native[body.messageType] = pickDefined({
        url: url(media),
        ...(caption === undefined
          ? {}
          : { caption: text(caption, 'media caption', 3000, true) })
      });
    }
    if (body.clientRef !== undefined)
      native.client_ref = text(body.clientRef, 'client reference', 100);
    if (body.webhookUrl !== undefined) native.webhook_url = url(body.webhookUrl);
    const receipt = await this.data('POST', '/v1/messages', {
      jwt: 'optional',
      data: native,
      statuses: [202]
    });
    return { messageUuid: string(receipt.message_uuid) };
  }
  async sendSms(body: {
    to: string;
    from: string;
    text: string;
    type?: string;
    statusReportReq?: boolean;
    clientRef?: string;
    callbackUrl?: string;
  }) {
    const native: Row = {
      to: phone(body.to),
      from: text(body.from, 'sender', 15),
      text: text(body.text, 'SMS text', 3200, true),
      type: body.type ?? 'text'
    };
    if (!['text', 'unicode'].includes(String(native.type)))
      throw invalid('Choose text or unicode SMS encoding.');
    if (body.statusReportReq !== undefined) native['status-report-req'] = body.statusReportReq;
    if (body.clientRef !== undefined)
      native['client-ref'] = text(body.clientRef, 'client reference', 40);
    if (body.callbackUrl !== undefined) native.callback = url(body.callbackUrl);
    const receipt = await this.data('POST', '/sms/json', {
      rest: true,
      form: true,
      data: native
    });
    const parts = array(receipt.messages),
      messageCount = string(receipt['message-count']);
    if (!/^[1-9][0-9]*$/.test(messageCount) || Number(messageCount) !== parts.length)
      throw incomplete();
    const acceptedMessageIds = parts
      .filter(part => part.status === '0' && part.to === body.to)
      .map(part => string(part['message-id']));
    for (const part of parts) {
      const status = string(part.status);
      if (status !== '0') {
        try {
          upstreamStatus(status);
        } catch (error) {
          if (error instanceof ServiceError && acceptedMessageIds.length) {
            error.data.recovery = { acceptedMessageIds };
            error.data.outcomeUncertain = true;
          }
          throw error;
        }
      }
    }
    const messages = parts.map(part => {
      if (part.to !== body.to) throw incomplete();
      return {
        messageId: string(part['message-id']),
        to: string(part.to),
        status: string(part.status),
        remainingBalance: decimal(part['remaining-balance']),
        messagePrice: decimal(part['message-price']),
        network: string(part.network)
      };
    });
    unique(messages.map(part => part.messageId));
    return { messageCount, messages };
  }
  private mapCall(call: Row) {
    return {
      callUuid: string(call.uuid),
      conversationUuid: call.conversation_uuid,
      status: call.status,
      direction: call.direction,
      to: call.to,
      from: call.from,
      startTime: call.start_time,
      endTime: call.end_time,
      duration: call.duration,
      rate: call.rate,
      price: call.price,
      network: call.network
    };
  }
  async createCall(body: {
    to: Array<{ type: string; number?: string; uri?: string }>;
    from: { type: string; number: string };
    ncco?: Row[];
    answerUrl?: string[];
    answerMethod?: string;
    eventUrl?: string[];
    eventMethod?: string;
    machineDetection?: string;
    lengthTimer?: number;
    ringingTimer?: number;
  }) {
    if ((body.ncco === undefined) === (body.answerUrl === undefined))
      throw invalid('Provide exactly one nonempty ncco or answerUrl.');
    if (body.to.length !== 1 || body.to[0]?.type !== 'phone' || body.from.type !== 'phone')
      throw invalid('This tool creates a call to one phone endpoint.');
    const native: Row = {
      to: [{ type: 'phone', number: phone(body.to[0].number) }],
      from: { type: 'phone', number: phone(body.from.number) }
    };
    if (body.ncco !== undefined) {
      if (!body.ncco.length || body.ncco.length > 100)
        throw invalid('Provide 1 to 100 NCCO actions.');
      const actions = [
        'record',
        'conversation',
        'connect',
        'talk',
        'stream',
        'input',
        'notify'
      ];
      for (const value of body.ncco)
        if (!actions.includes(String(record(value).action)))
          throw invalid('Provide documented NCCO actions.');
      native.ncco = body.ncco;
    } else {
      if (body.answerUrl?.length !== 1) throw invalid('Provide one answer URL.');
      native.answer_url = body.answerUrl.map(url);
      if (body.answerMethod !== undefined) native.answer_method = body.answerMethod;
    }
    if (body.eventUrl !== undefined) {
      if (body.eventUrl.length !== 1) throw invalid('Provide one event URL.');
      native.event_url = body.eventUrl.map(url);
      if (body.eventMethod !== undefined) native.event_method = body.eventMethod;
    }
    if (body.machineDetection !== undefined) {
      if (!['continue', 'hangup'].includes(body.machineDetection))
        throw invalid('Choose continue or hangup machine detection.');
      native.machine_detection = body.machineDetection;
    }
    if (body.lengthTimer !== undefined)
      native.length_timer = integer(body.lengthTimer, 'lengthTimer', 1, 86400);
    if (body.ringingTimer !== undefined)
      native.ringing_timer = integer(body.ringingTimer, 'ringingTimer', 1, 120);
    const receipt = await this.data('POST', '/v1/calls', {
      jwt: 'required',
      data: native,
      statuses: [201]
    });
    return {
      callUuid: string(receipt.uuid),
      status: string(receipt.status),
      direction: string(receipt.direction),
      conversationUuid: string(receipt.conversation_uuid)
    };
  }
  async listCalls(
    params: {
      status?: string;
      dateStart?: string;
      dateEnd?: string;
      pageSize?: number;
      recordIndex?: number;
      order?: string;
      conversationUuid?: string;
    } = {}
  ) {
    const size = integer(params.pageSize ?? 10, 'pageSize', 1, 100),
      index = integer(params.recordIndex ?? 0, 'recordIndex', 0);
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
        throw invalid('Provide an ISO 8601 date-time.');
      return value;
    };
    const query = pickDefined({
      status: params.status,
      date_start: params.dateStart === undefined ? undefined : validDate(params.dateStart),
      date_end: params.dateEnd === undefined ? undefined : validDate(params.dateEnd),
      page_size: size,
      record_index: index,
      order: params.order,
      conversation_uuid:
        params.conversationUuid === undefined ? undefined : id(params.conversationUuid)
    });
    if (
      params.dateStart &&
      params.dateEnd &&
      Date.parse(params.dateStart) > Date.parse(params.dateEnd)
    )
      throw invalid('dateStart must not be later than dateEnd.');
    if (params.order !== undefined && !['asc', 'desc'].includes(params.order))
      throw invalid('Choose asc or desc order.');
    const page = await this.data('GET', '/v1/calls', { jwt: 'required', params: query });
    const calls = array(record(page._embedded).calls).map(call => this.mapCall(call));
    const total = count(page.count),
      pageSize = count(page.page_size, 1),
      recordIndex = count(page.record_index);
    if (
      pageSize !== size ||
      recordIndex !== index ||
      calls.length !== Math.min(size, Math.max(total - index, 0))
    )
      throw incomplete();
    unique(calls.map(call => call.callUuid));
    const nextRecordIndex = index + calls.length < total ? index + calls.length : undefined;
    if (nextRecordIndex !== undefined && !calls.length) throw incomplete();
    return { count: total, calls, pageSize, recordIndex, nextRecordIndex };
  }
  async getCall(callUuid: string) {
    const native = await this.data('GET', `/v1/calls/${encodeURIComponent(id(callUuid))}`, {
      jwt: 'required'
    });
    if (native.uuid !== callUuid) throw incomplete();
    return this.mapCall(native);
  }
  async modifyCall(
    callUuid: string,
    action: string,
    destination?: { type: string; url: string[] }
  ) {
    if (!['hangup', 'mute', 'unmute', 'earmuff', 'unearmuff', 'transfer'].includes(action))
      throw invalid('Choose a documented call control action.');
    const native: Row = { action };
    if (action === 'transfer') {
      if (!destination || destination.type !== 'ncco' || destination.url.length !== 1)
        throw invalid('Provide one NCCO transfer URL.');
      native.destination = { type: 'ncco', url: destination.url.map(url) };
    } else if (destination !== undefined)
      throw invalid('destination is only supported for transfer.');
    await this.response('PUT', `/v1/calls/${encodeURIComponent(id(callUuid))}`, {
      jwt: 'required',
      data: native,
      statuses: [204]
    });
  }
  private audioOptions(options: {
    voiceName?: string;
    language?: string;
    style?: number;
    premium?: boolean;
    loop?: number;
    level?: number;
  }) {
    if (
      options.level !== undefined &&
      (!Number.isFinite(options.level) ||
        Math.abs(options.level) > 1 ||
        Math.abs(options.level * 10 - Math.round(options.level * 10)) > 1e-8)
    )
      throw invalid('Provide an audio level from -1 to 1 in 0.1 increments.');
    return pickDefined({
      voice_name: options.voiceName,
      language: options.language,
      style: options.style === undefined ? undefined : integer(options.style, 'style', 0),
      premium: options.premium,
      loop: options.loop === undefined ? undefined : integer(options.loop, 'loop', 0),
      level: options.level === undefined ? undefined : String(options.level)
    });
  }
  private async callReceipt(
    method: 'PUT' | 'DELETE',
    callUuid: string,
    suffix: string,
    body?: Row
  ) {
    const receipt = await this.data(
      method,
      `/v1/calls/${encodeURIComponent(id(callUuid))}/${suffix}`,
      { jwt: 'required', data: body }
    );
    if (receipt.uuid !== callUuid) throw incomplete();
    return { message: string(receipt.message), uuid: callUuid };
  }
  async playTts(
    callUuid: string,
    content: string,
    options: Parameters<VonageRestClient['audioOptions']>[0] = {}
  ) {
    return this.callReceipt('PUT', callUuid, 'talk', {
      text: text(content, 'TTS text', 1500, true),
      ...this.audioOptions(options)
    });
  }
  async stopTts(callUuid: string) {
    return this.callReceipt('DELETE', callUuid, 'talk');
  }
  async playStream(
    callUuid: string,
    streamUrl: string[],
    options: { loop?: number; level?: number } = {}
  ) {
    if (streamUrl.length !== 1) throw invalid('Provide one audio URL.');
    return this.callReceipt('PUT', callUuid, 'stream', {
      stream_url: streamUrl.map(url),
      ...this.audioOptions(options)
    });
  }
  async stopStream(callUuid: string) {
    return this.callReceipt('DELETE', callUuid, 'stream');
  }
  async sendDtmf(callUuid: string, digits: string) {
    if (!/^[0-9*#p]+$/.test(digits) || digits.length > 50)
      throw invalid('Provide up to 50 DTMF digits using 0-9, *, # and p.');
    return this.callReceipt('PUT', callUuid, 'dtmf', { digits });
  }
  async startVerification(body: {
    brand: string;
    to: string;
    workflows: Array<{ channel: string; to?: string; from?: string; appHash?: string }>;
    codeLength?: number;
    channelTimeout?: number;
    locale?: string;
  }) {
    const brand = text(body.brand, 'brand', 18);
    if (/[/{}:$]/.test(brand) || !body.workflows.length || body.workflows.length > 3)
      throw invalid('Use a brand without /, braces, colon or $, and 1 to 3 workflow steps.');
    const workflow = body.workflows.map(step => {
      if (
        !['sms', 'whatsapp', 'whatsapp_interactive', 'voice', 'email', 'silent_auth'].includes(
          step.channel
        )
      )
        throw invalid('Choose a documented verification channel.');
      const recipient = step.to ?? body.to;
      if (step.channel === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
          throw invalid('Provide a valid email recipient.');
      } else phone(recipient);
      return pickDefined({
        channel: step.channel,
        to: recipient,
        from:
          step.from === undefined
            ? undefined
            : text(step.from, 'provisioned verification sender', 128),
        app_hash: step.appHash
      });
    });
    const native = pickDefined({
      brand,
      workflow,
      code_length:
        body.codeLength === undefined
          ? undefined
          : integer(body.codeLength, 'codeLength', 4, 10),
      channel_timeout:
        body.channelTimeout === undefined
          ? undefined
          : integer(body.channelTimeout, 'channelTimeout', 15, 900),
      locale: body.locale === undefined ? undefined : text(body.locale, 'locale', 32)
    });
    if (
      body.workflows.some(step => step.channel === 'silent_auth') &&
      body.channelTimeout !== undefined &&
      body.channelTimeout !== 60
    )
      throw invalid('Silent authentication has a fixed 60-second channel timeout.');
    const receipt = await this.data('POST', '/v2/verify', {
      jwt: 'optional',
      data: native,
      statuses: [202]
    });
    if (receipt.check_url !== undefined) url(receipt.check_url);
    return {
      requestId: string(receipt.request_id),
      checkUrl: receipt.check_url === undefined ? undefined : string(receipt.check_url)
    };
  }
  async checkVerificationCode(requestId: string, code: string) {
    if (!/^[A-Za-z0-9]{4,10}$/.test(code))
      throw invalid('Provide the exact 4 to 10 character verification code.');
    const receipt = await this.data(
      'POST',
      `/v2/verify/${encodeURIComponent(id(requestId))}`,
      { jwt: 'optional', data: { code } }
    );
    if (receipt.request_id !== requestId) throw incomplete();
    return { requestId, status: string(receipt.status) };
  }
  async cancelVerification(requestId: string) {
    await this.response('DELETE', `/v2/verify/${encodeURIComponent(id(requestId))}`, {
      jwt: 'optional',
      statuses: [204]
    });
  }
  async numberInsight(
    level: 'basic' | 'standard' | 'advanced',
    number: string,
    region?: string
  ) {
    if (!['basic', 'standard', 'advanced'].includes(level))
      throw invalid('Choose basic, standard or advanced insight.');
    const receipt = await this.data('GET', `/ni/${level}/json`, {
      params: pickDefined({
        number: text(number, 'phone number', 32),
        country: region === undefined ? undefined : country(region)
      })
    });
    const status = count(receipt.status);
    if (status !== 0 && !(level === 'advanced' && [43, 44, 45].includes(status)))
      upstreamStatus(status);
    string(receipt.request_id);
    const optionalText = (key: string) =>
      receipt[key] === undefined ? undefined : string(receipt[key]);
    return {
      ...receipt,
      status,
      request_id: string(receipt.request_id),
      status_message: optionalText('status_message'),
      international_format_number: optionalText('international_format_number'),
      national_format_number: optionalText('national_format_number'),
      country_code: optionalText('country_code'),
      country_code_iso3: optionalText('country_code_iso3'),
      country_name: optionalText('country_name'),
      country_prefix: optionalText('country_prefix'),
      current_carrier: receipt.current_carrier,
      original_carrier: receipt.original_carrier,
      caller_identity: receipt.caller_identity,
      roaming: receipt.roaming,
      ported: optionalText('ported'),
      caller_type: optionalText('caller_type'),
      valid_number: optionalText('valid_number'),
      reachable: optionalText('reachable'),
      lookup_outcome:
        receipt.lookup_outcome === undefined ? undefined : count(receipt.lookup_outcome),
      lookup_outcome_message: optionalText('lookup_outcome_message')
    };
  }
  private async numbers(
    search: boolean,
    params: {
      country?: string;
      type?: string;
      pattern?: string;
      searchPattern?: number;
      features?: string;
      applicationId?: string;
      hasApplication?: boolean;
      size?: number;
      index?: number;
    } = {}
  ) {
    if (search && params.country === undefined)
      throw invalid('country is required for searching numbers.');
    const size = integer(params.size ?? 10, 'size', 1, 100),
      index = integer(params.index ?? 1, 'index', 1);
    const query = pickDefined({
      country: params.country === undefined ? undefined : country(params.country),
      type: params.type,
      pattern: params.pattern,
      search_pattern:
        params.searchPattern === undefined
          ? undefined
          : integer(params.searchPattern, 'searchPattern', 0, 2),
      features: params.features,
      application_id:
        params.applicationId === undefined ? undefined : id(params.applicationId),
      has_application: params.hasApplication,
      size,
      index
    });
    const page = await this.data('GET', search ? '/number/search' : '/account/numbers', {
      rest: true,
      params: query
    });
    const numbers = array(page.numbers).map(number => {
      if (
        !Array.isArray(number.features) ||
        number.features.some(feature => typeof feature !== 'string')
      )
        throw incomplete();
      return {
        country: string(number.country),
        msisdn: string(number.msisdn),
        type: string(number.type),
        cost: number.cost === undefined ? undefined : decimal(number.cost),
        features: number.features as string[],
        moHttpUrl: number.moHttpUrl,
        voiceCallbackType: number.voiceCallbackType,
        voiceCallbackValue: number.voiceCallbackValue,
        voiceStatusCallback: number.voiceStatusCallback,
        applicationId: number.app_id == null ? undefined : string(number.app_id),
        limitations: number.limitations,
        initialPrice: number.initialPrice
      };
    });
    const total = count(page.count),
      offset = (index - 1) * size;
    if (
      !Number.isSafeInteger(offset) ||
      numbers.length !== Math.min(size, Math.max(total - offset, 0))
    )
      throw incomplete();
    unique(numbers.map(number => number.msisdn));
    return {
      count: total,
      numbers,
      size,
      index,
      nextIndex: offset + numbers.length < total ? index + 1 : undefined
    };
  }
  async searchNumbers(
    params: Parameters<VonageRestClient['numbers']>[1] & { country: string }
  ) {
    return this.numbers(true, params);
  }
  async listOwnedNumbers(params: Parameters<VonageRestClient['numbers']>[1] = {}) {
    return this.numbers(false, params);
  }
  private async numberWrite(action: string, region: string, msisdn: string, values: Row = {}) {
    const receipt = await this.data('POST', `/number/${action}`, {
      rest: true,
      form: true,
      data: { country: country(region), msisdn: phone(msisdn), ...values }
    });
    const code = string(receipt['error-code']);
    if (code !== '200') upstreamStatus(code);
  }
  async buyNumber(region: string, msisdn: string, targetApiKey?: string) {
    return this.numberWrite(
      'buy',
      region,
      msisdn,
      pickDefined({ target_api_key: targetApiKey })
    );
  }
  async cancelNumber(region: string, msisdn: string, targetApiKey?: string) {
    return this.numberWrite(
      'cancel',
      region,
      msisdn,
      pickDefined({ target_api_key: targetApiKey })
    );
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
  }) {
    if (body.moHttpUrl !== undefined && body.moHttpUrl !== '') url(body.moHttpUrl);
    if (body.voiceStatusCallback !== undefined && body.voiceStatusCallback !== '')
      url(body.voiceStatusCallback);
    if (
      body.voiceCallbackType !== undefined &&
      !['sip', 'tel', 'app', ''].includes(body.voiceCallbackType)
    )
      throw invalid('Choose sip, tel or app voice callback type.');
    const values = pickDefined({
      app_id: body.applicationId,
      moHttpUrl: body.moHttpUrl,
      moSmppSysType: body.moSmppSysType,
      voiceCallbackType: body.voiceCallbackType,
      voiceCallbackValue: body.voiceCallbackValue,
      voiceStatusCallback: body.voiceStatusCallback
    });
    if (!Object.keys(values).length) throw invalid('Provide a number setting to update.');
    await this.numberWrite('update', body.country, body.msisdn, values);
  }
  private mapApplication(app: Row) {
    return {
      applicationId: string(app.id),
      name: string(app.name),
      capabilities: app.capabilities,
      keys:
        app.keys === undefined
          ? undefined
          : pickDefined({ public_key: record(app.keys).public_key }),
      createdAt: app.created_at,
      updatedAt: app.updated_at
    };
  }
  async listApplications(params: { pageSize?: number; page?: number } = {}) {
    const requestedPage = integer(params.page ?? 1, 'page', 1),
      size = integer(params.pageSize ?? 10, 'pageSize', 1, 100);
    const native = await this.data('GET', '/v2/applications', {
      params: { page_size: size, page: requestedPage }
    });
    const applications = array(record(native._embedded).applications).map(value =>
      this.mapApplication(value)
    );
    const page = count(native.page, 1),
      pageSize = count(native.page_size, 1),
      totalItems = count(native.total_items),
      totalPages = count(native.total_pages);
    if (
      page !== requestedPage ||
      pageSize !== size ||
      !Number.isSafeInteger((page - 1) * size) ||
      applications.length !== Math.min(size, Math.max(totalItems - (page - 1) * size, 0)) ||
      totalPages !== Math.ceil(totalItems / size)
    )
      throw incomplete();
    unique(applications.map(app => app.applicationId));
    return {
      applications,
      totalItems,
      totalPages,
      page,
      pageSize,
      nextPage: page < totalPages ? page + 1 : undefined
    };
  }
  async getApplication(applicationId: string) {
    const native = await this.data(
      'GET',
      `/v2/applications/${encodeURIComponent(id(applicationId))}`,
      { application: true }
    );
    if (native.id !== applicationId) throw incomplete();
    return this.mapApplication(native);
  }
  async createApplication(body: { name: string; capabilities?: Row; publicKey?: string }) {
    if (!body.publicKey)
      throw invalid(
        'Provide publicKey from a keypair you already saved before creating an application. Keep its private key securely; no private key is returned.'
      );
    const publicKey = rsaPublicKey(body.publicKey);
    const native = await this.data('POST', '/v2/applications', {
      application: true,
      statuses: [201],
      data: pickDefined({
        name: text(body.name, 'application name', 255),
        capabilities: body.capabilities,
        keys: { public_key: publicKey }
      })
    });
    if (
      native.name !== body.name ||
      rsaPublicKey(string(record(native.keys).public_key)) !== publicKey
    )
      throw incomplete();
    return this.mapApplication(native);
  }
  async updateApplication(applicationId: string, body: { name?: string; capabilities?: Row }) {
    if (body.name === undefined && body.capabilities === undefined)
      throw invalid('Provide application name or capabilities to update.');
    const path = `/v2/applications/${encodeURIComponent(id(applicationId))}`;
    const current = await this.data('GET', path, { application: true });
    if (current.id !== applicationId) throw incomplete();
    const publicKey = rsaPublicKey(string(record(current.keys).public_key));
    const merge = (original: Row, change: Row): Row =>
      Object.fromEntries(
        Object.entries({ ...original, ...change }).map(([key, value]) => [
          key,
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          original[key] &&
          typeof original[key] === 'object' &&
          !Array.isArray(original[key])
            ? merge(record(original[key]), record(value))
            : value
        ])
      );
    const capabilities =
      body.capabilities === undefined
        ? current.capabilities
        : merge(
            current.capabilities === undefined ? {} : record(current.capabilities),
            body.capabilities
          );
    const name =
      body.name === undefined
        ? string(current.name)
        : text(body.name, 'application name', 255);
    const replacement = pickDefined({
      name,
      keys: { public_key: publicKey },
      capabilities,
      privacy: current.privacy
    });
    const native = await this.data('PUT', path, { application: true, data: replacement });
    if (
      native.id !== applicationId ||
      native.name !== name ||
      rsaPublicKey(string(record(native.keys).public_key)) !== publicKey
    )
      throw incomplete();
    return this.mapApplication(native);
  }
  async deleteApplication(applicationId: string) {
    await this.response(
      'DELETE',
      `/v2/applications/${encodeURIComponent(id(applicationId))}`,
      { statuses: [204] }
    );
  }
  async getBalance(): Promise<{ value: number; autoReload: boolean }> {
    const native = await this.data('GET', '/account/get-balance', { rest: true });
    if (typeof native.autoReload !== 'boolean') throw incomplete();
    return { value: monetaryNumber(native.value), autoReload: native.autoReload };
  }
  private account(value: unknown) {
    const native = record(value);
    return {
      apiKey: string(native.api_key),
      name: string(native.name),
      primaryAccountApiKey: native.primary_account_api_key,
      usePrimaryAccountBalance: native.use_primary_account_balance,
      createdAt: native.created_at,
      suspended: native.suspended,
      balance: native.balance == null ? native.balance : monetaryNumber(native.balance),
      creditLimit:
        native.credit_limit == null ? native.credit_limit : monetaryNumber(native.credit_limit)
    };
  }
  async listSubaccounts() {
    const native = await this.data(
        'GET',
        `/accounts/${encodeURIComponent(this.auth.apiKey)}/subaccounts`
      ),
      embedded = record(native._embedded);
    const primaryAccount = this.account(embedded.primary_account);
    if (primaryAccount.apiKey !== this.auth.apiKey) throw incomplete();
    const subaccounts = array(embedded.subaccounts).map(value => this.account(value));
    if (subaccounts.some(subaccount => subaccount.primaryAccountApiKey !== this.auth.apiKey))
      throw incomplete();
    unique(subaccounts.map(subaccount => subaccount.apiKey));
    return { primaryAccount, subaccounts };
  }
  async createSubaccount(body: {
    name: string;
    secret?: string;
    usePrimaryAccountBalance?: boolean;
  }) {
    if (!body.secret)
      throw invalid(
        'Provide subaccountSecret that you already hold securely before creation. No API secret is returned.'
      );
    const secret = text(body.secret, 'caller-held subaccount secret', 256);
    const native = await this.data(
      'POST',
      `/accounts/${encodeURIComponent(this.auth.apiKey)}/subaccounts`,
      {
        suppliedSecret: secret,
        statuses: [201],
        data: pickDefined({
          name: text(body.name, 'subaccount name', 80),
          secret,
          use_primary_account_balance: body.usePrimaryAccountBalance
        })
      }
    );
    if (
      native.primary_account_api_key !== this.auth.apiKey ||
      native.name !== body.name ||
      native.api_key === this.auth.apiKey ||
      (body.usePrimaryAccountBalance !== undefined &&
        native.use_primary_account_balance !== body.usePrimaryAccountBalance)
    )
      throw incomplete();
    return this.account(native);
  }
  private async transfer(
    kind: 'credit' | 'balance',
    body: { from: string; to: string; amount: number; reference?: string }
  ) {
    const from = id(body.from),
      to = id(body.to);
    if (from === to || (from !== this.auth.apiKey && to !== this.auth.apiKey))
      throw invalid(
        'Transfer between the primary account and one of its subaccounts using distinct exact account API keys.'
      );
    if (
      !Number.isFinite(body.amount) ||
      body.amount <= 0 ||
      (Number.isInteger(body.amount) && !Number.isSafeInteger(body.amount))
    )
      throw invalid(
        'Provide a positive finite transfer amount in EUR within safe numeric precision.'
      );
    const native = await this.data(
      'POST',
      `/accounts/${encodeURIComponent(this.auth.apiKey)}/${kind}-transfers`,
      {
        statuses: [201],
        data: pickDefined({
          from,
          to,
          amount: body.amount,
          reference:
            body.reference === undefined
              ? undefined
              : text(body.reference, 'transfer reference', 255)
        })
      }
    );
    if (
      native.from !== from ||
      native.to !== to ||
      monetaryNumber(native.amount) !== body.amount ||
      (body.reference !== undefined && native.reference !== body.reference)
    )
      throw incomplete();
    return {
      [kind === 'credit' ? 'creditTransferId' : 'balanceTransferId']: string(
        native[`${kind}_transfer_id`]
      ),
      from,
      to,
      amount: native.amount,
      reference: native.reference,
      createdAt: native.created_at
    };
  }
  async transferCredit(body: Parameters<VonageRestClient['transfer']>[1]) {
    return this.transfer('credit', body);
  }
  async transferBalance(body: Parameters<VonageRestClient['transfer']>[1]) {
    return this.transfer('balance', body);
  }
}
