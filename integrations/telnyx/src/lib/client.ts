import { buildApiServiceError, createAuthenticatedAxios, getApiErrorStatus } from 'slates';
import { validateCallAction } from './actions';
import {
  availableSchema,
  balanceSchema,
  callSchema,
  connectionSchema,
  exact,
  faxSchema,
  httpUrl,
  integer,
  invalid,
  lookupSchema,
  messageSchema,
  metaSchema,
  orderSchema,
  paging,
  parse,
  phone,
  phoneSchema,
  profileSchema,
  type Row,
  receipt,
  required,
  secretFree,
  segment,
  simActionSchema,
  simSchema,
  verificationSchema,
  z
} from './native';

export type Page = { pageNumber?: number; pageSize?: number };
export type ProfileInput = {
  name?: string;
  webhookUrl?: string;
  webhookFailoverUrl?: string;
  webhookApiVersion?: string;
  enabled?: boolean;
  whitelistedDestinations?: string[];
  defaultTimeoutSecs?: number;
  channelSettings?: { sms?: Row; call?: Row; flashcall?: Row; whatsapp?: Row };
};
export class TelnyxClient {
  private readonly http;
  private readonly token: string;
  constructor(config: { token: string }) {
    this.token = required(config.token, 'API key');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.telnyx.com/v2',
      authHeader: { value: `Bearer ${this.token}` },
      timeout: 30_000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Telnyx',
          reason: 'upstream_error',
          parent: {},
          extractMessage: () => 'Request failed',
          extractResponse: () => ({ status: getApiErrorStatus(error) }),
          formatMessage: ({ status }) =>
            `Telnyx request failed${typeof status === 'number' ? ` (HTTP ${status})` : ''}. Check API-key permissions and inputs. For writes, inspect native status before retrying; the request may already have been accepted.`
        })
    });
  }
  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    schema: z.ZodType<T>,
    body?: Row,
    query?: Row
  ) {
    if (
      !secretFree(path, this.token) ||
      !secretFree(body, this.token) ||
      !secretFree(query, this.token)
    )
      invalid('Request fields must not contain the connection API key.');
    const response = await this.http.request<unknown>({
      method,
      url: path,
      data: body,
      params: query
    });
    if (!secretFree(response.data, this.token))
      invalid(
        'Telnyx returned sensitive credential data. For writes, inspect native status before retrying.',
        'sensitive_response'
      );
    return parse(z.object({ data: schema }).passthrough(), response.data).data;
  }
  private async list<T>(path: string, schema: z.ZodType<T>, query: Row) {
    if (!secretFree(path, this.token) || !secretFree(query, this.token))
      invalid('Query fields must not contain the connection API key.');
    const response = await this.http.get<unknown>(path, { params: query });
    if (!secretFree(response.data, this.token))
      invalid('Telnyx returned sensitive credential data.', 'sensitive_response');
    return parse(
      z.object({ data: z.array(schema).max(1000), meta: metaSchema.optional() }).passthrough(),
      response.data
    );
  }
  async sendMessage(input: {
    from: string;
    to: string;
    text?: string;
    mediaUrls?: string[];
    messagingProfileId?: string;
    subject?: string;
    type?: 'SMS' | 'MMS';
    autoDetect?: boolean;
  }) {
    const from = required(input.from, 'sender');
    phone(input.to, 'recipient phone number');
    if (input.messagingProfileId !== undefined)
      required(input.messagingProfileId, 'messagingProfileId');
    if (!/^\+?[A-Za-z0-9 ]{1,16}$/.test(from))
      invalid('Provide an E.164 number, short code, or supported alphanumeric sender.');
    if (/[A-Za-z]/.test(from) && !input.messagingProfileId)
      invalid('Alphanumeric senders require messagingProfileId.');
    const media = input.mediaUrls;
    if (media && media.length > 10) invalid('Provide at most ten media URLs.');
    media?.forEach(value => httpUrl(value, 'media URL'));
    if (input.type === 'SMS' && media !== undefined)
      invalid('Omit mediaUrls for SMS; its presence selects MMS, even when empty.');
    if (!media?.length && !input.text?.trim())
      invalid('Provide non-empty message text or at least one media URL.');
    const body: Row = { from, to: input.to };
    for (const [key, value] of Object.entries({
      text: input.text,
      media_urls: media,
      messaging_profile_id: input.messagingProfileId,
      subject: input.subject,
      type: input.type,
      auto_detect: input.autoDetect
    }))
      if (value !== undefined) body[key] = value;
    const result = await this.request('post', '/messages', messageSchema, body);
    exact(result.from.phone_number, from, 'sender');
    exact(result.to[0]!.phone_number, input.to, 'recipient');
    return result;
  }
  async getMessage(id: string) {
    const result = await this.request(
      'get',
      `/messages/${segment(id, 'messageId')}`,
      messageSchema
    );
    exact(result.id, id, 'message ID');
    return result;
  }
  listMessagingProfiles(input?: Page) {
    return this.list('/messaging_profiles', profileSchema, paging(input));
  }
  async getMessagingProfile(id: string) {
    const result = await this.request(
      'get',
      `/messaging_profiles/${segment(id, 'profileId')}`,
      profileSchema
    );
    exact(result.id, id, 'profile ID');
    return result;
  }
  private profileBody(input: ProfileInput, create: boolean, verify: boolean) {
    if (input.defaultTimeoutSecs !== undefined)
      invalid(
        'defaultTimeoutSecs has no documented aggregate Verify API field. Set channelSettings.sms/call/flashcall/whatsapp.default_verification_timeout_secs instead.'
      );
    if (create) required(input.name, 'profile name');
    if (input.name !== undefined) required(input.name, 'profile name');
    if (!verify) {
      if (create && input.whitelistedDestinations === undefined)
        invalid(
          'Messaging profile creation requires explicit whitelistedDestinations country codes, or ["*"] only when you intend to allow all destinations.'
        );
      const destinations = input.whitelistedDestinations;
      if (
        destinations !== undefined &&
        (!Array.isArray(destinations) ||
          !destinations.every(
            value => typeof value === 'string' && (/^[A-Z]{2}$/.test(value) || value === '*')
          ) ||
          (destinations.includes('*') && destinations.length !== 1))
      )
        invalid(
          'Destinations must be uppercase ISO country codes or the single wildcard ["*"].'
        );
    }
    const body: Row = {};
    for (const [key, value] of Object.entries({
      name: input.name,
      webhook_url: input.webhookUrl,
      webhook_failover_url: input.webhookFailoverUrl,
      ...(verify
        ? {}
        : {
            enabled: input.enabled,
            webhook_api_version: input.webhookApiVersion,
            whitelisted_destinations: input.whitelistedDestinations
          })
    })) {
      if (value !== undefined) {
        if (key.startsWith('webhook_') && key !== 'webhook_api_version')
          httpUrl(String(value), key, true);
        body[key] = value;
      }
    }
    if (verify && input.channelSettings) {
      if (!create && input.channelSettings.flashcall !== undefined)
        invalid(
          'Current Verify profile PATCH does not document flashcall settings. Use flashcall settings only when creating a profile.'
        );
      const allowed = [
        'messaging_template_id',
        'app_name',
        'code_length',
        'whitelisted_destinations',
        'default_verification_timeout_secs'
      ];
      for (const [channel, settings] of Object.entries(input.channelSettings)) {
        const fields =
          channel === 'whatsapp'
            ? [
                'whitelisted_destinations',
                'default_verification_timeout_secs',
                'waba_id',
                'sender_phone_number',
                'template_id'
              ]
            : channel === 'flashcall'
              ? ['app_name', 'whitelisted_destinations', 'default_verification_timeout_secs']
              : [...allowed, ...(channel === 'sms' ? ['alpha_sender'] : [])];
        for (const [key, value] of Object.entries(settings)) {
          if (!fields.includes(key))
            invalid(
              `Unsupported ${channel} channel setting. Use documented channelSettings fields.`
            );
          if (key === 'default_verification_timeout_secs')
            integer(value, 'channel timeout', 0, 2_147_483_647);
          if (key === 'code_length') integer(value, 'code length', 1, 2_147_483_647);
          if (
            key === 'app_name' &&
            (typeof value !== 'string' || !/^[A-Za-z0-9 -]{1,30}$/.test(value))
          )
            invalid(
              'Channel app_name must contain one to 30 letters, digits, spaces or hyphens.'
            );
          if (
            key === 'alpha_sender' &&
            value !== null &&
            (typeof value !== 'string' || !/^[A-Za-z0-9 ]{1,11}$/.test(value))
          )
            invalid('SMS alpha_sender must be null or one to 11 letters, digits or spaces.');
          if (
            key === 'whitelisted_destinations' &&
            (!Array.isArray(value) ||
              !value.every(
                item => typeof item === 'string' && (/^[A-Z]{2}$/.test(item) || item === '*')
              ) ||
              (value.includes('*') && value.length !== 1))
          )
            invalid(
              'Channel destinations must be uppercase ISO country codes or the single wildcard ["*"].'
            );
          if (
            [
              'messaging_template_id',
              'waba_id',
              'sender_phone_number',
              'template_id'
            ].includes(key) &&
            value !== null &&
            typeof value !== 'string'
          )
            invalid('Channel identifiers must remain strings.');
        }
        body[channel] = settings;
      }
    }
    if (!create && Object.keys(body).length === 0)
      invalid('Provide at least one supported profile field to update.');
    return body;
  }
  async createMessagingProfile(input: ProfileInput) {
    const body = this.profileBody(input, true, false);
    const result = await this.request('post', '/messaging_profiles', profileSchema, body);
    receipt(result, body);
    return result;
  }
  async updateMessagingProfile(id: string, input: ProfileInput) {
    const body = this.profileBody(input, false, false);
    const result = await this.request(
      'patch',
      `/messaging_profiles/${segment(id, 'profileId')}`,
      profileSchema,
      body
    );
    exact(result.id, id, 'profile ID');
    receipt(result, body);
    return result;
  }
  async deleteMessagingProfile(id: string) {
    const result = await this.request(
      'delete',
      `/messaging_profiles/${segment(id, 'profileId')}`,
      profileSchema
    );
    exact(result.id, id, 'deleted profile ID');
    return result;
  }
  listMessagingProfileNumbers(id: string, input?: Page) {
    return this.list(
      `/messaging_profiles/${segment(id, 'profileId')}/phone_numbers`,
      phoneSchema,
      paging(input)
    );
  }
  listMessagingProfileShortCodes(id: string, input?: Page) {
    return this.list(
      `/messaging_profiles/${segment(id, 'profileId')}/short_codes`,
      z.object({ id: z.string().min(1), short_code: z.string().optional() }).passthrough(),
      paging(input)
    );
  }
  searchAvailablePhoneNumbers(input: {
    countryCode: string;
    phoneNumberType?: string;
    features?: string[];
    city?: string;
    state?: string;
    startsWith?: string;
    endsWith?: string;
    contains?: string;
    limit?: number;
  }) {
    if (!/^[A-Z]{2}$/.test(input.countryCode))
      invalid('countryCode must be an uppercase ISO alpha-2 country code.');
    integer(input.limit, 'limit', 1, 1000);
    const query: Row = { 'filter[country_code]': input.countryCode };
    for (const [key, value] of Object.entries({
      'filter[phone_number_type]': input.phoneNumberType,
      'filter[features]': input.features,
      'filter[locality]': input.city,
      'filter[administrative_area]': input.state,
      'filter[phone_number][starts_with]': input.startsWith,
      'filter[phone_number][ends_with]': input.endsWith,
      'filter[phone_number][contains]': input.contains,
      'filter[limit]': input.limit
    }))
      if (value !== undefined) query[key] = value;
    return this.list('/available_phone_numbers', availableSchema, query);
  }
  listPhoneNumbers(input?: Page & { tag?: string; status?: string; connectionId?: string }) {
    return this.list('/phone_numbers', phoneSchema, {
      ...paging(input),
      ...(input?.tag === undefined ? {} : { 'filter[tag]': input.tag }),
      ...(input?.status === undefined ? {} : { 'filter[status]': input.status }),
      ...(input?.connectionId === undefined
        ? {}
        : { 'filter[connection_id]': input.connectionId })
    });
  }
  async getPhoneNumber(id: string) {
    const result = await this.request(
      'get',
      `/phone_numbers/${segment(id, 'phoneNumberId')}`,
      phoneSchema
    );
    exact(result.id, id, 'phone number ID');
    return result;
  }
  async updatePhoneNumber(
    id: string,
    input: {
      tags?: string[];
      connectionId?: string;
      billingGroupId?: string;
      externalPin?: string;
    }
  ) {
    const body: Row = {};
    for (const [key, value] of Object.entries({
      tags: input.tags,
      connection_id: input.connectionId,
      billing_group_id: input.billingGroupId,
      external_pin: input.externalPin
    }))
      if (value !== undefined) body[key] = value;
    if (!Object.keys(body).length)
      invalid('Provide at least one supported phone-number field to update.');
    const result = await this.request(
      'patch',
      `/phone_numbers/${segment(id, 'phoneNumberId')}`,
      phoneSchema,
      body
    );
    exact(result.id, id, 'phone number ID');
    receipt(result, body);
    return result;
  }
  async deletePhoneNumber(id: string) {
    const result = await this.request(
      'delete',
      `/phone_numbers/${segment(id, 'phoneNumberId')}`,
      phoneSchema
    );
    exact(result.id, id, 'released phone number ID');
    return result;
  }
  async orderPhoneNumbers(numbers: string[]) {
    if (!numbers.length || numbers.length > 100 || new Set(numbers).size !== numbers.length)
      invalid('Provide one to 100 distinct phone numbers.');
    numbers.forEach(value => phone(value));
    const result = await this.request('post', '/number_orders', orderSchema, {
      phone_numbers: numbers.map(phone_number => ({ phone_number }))
    });
    if (result.phone_numbers_count !== numbers.length)
      invalid(
        'The number-order receipt did not confirm the requested count. Inspect the order before retrying.',
        'unconfirmed_order'
      );
    if (result.phone_numbers) {
      const actual = result.phone_numbers.map(item => item.phone_number);
      if (actual.length !== numbers.length || numbers.some(number => !actual.includes(number)))
        invalid(
          'The number-order receipt did not confirm the requested numbers. Inspect the order before retrying.',
          'unconfirmed_order'
        );
    }
    return result;
  }
  async getNumberOrder(id: string) {
    const result = await this.request(
      'get',
      `/number_orders/${segment(id, 'orderId')}`,
      orderSchema
    );
    exact(result.id, id, 'order ID');
    return result;
  }
  listNumberOrders(input?: Page) {
    return this.list('/number_orders', orderSchema, paging(input));
  }
  async dialCall(input: {
    to: string;
    from: string;
    fromDisplayName?: string;
    connectionId: string;
    webhookUrl?: string;
    timeoutSecs?: number;
  }) {
    required(input.to, 'call destination');
    if (!input.to.startsWith('sip:')) phone(input.to);
    phone(input.from, 'caller number');
    required(input.connectionId, 'connectionId');
    integer(input.timeoutSecs, 'timeoutSecs', 5, 600);
    if (input.webhookUrl) httpUrl(input.webhookUrl, 'webhook URL');
    const body: Row = { to: input.to, from: input.from, connection_id: input.connectionId };
    for (const [key, value] of Object.entries({
      from_display_name: input.fromDisplayName,
      timeout_secs: input.timeoutSecs,
      webhook_url: input.webhookUrl
    }))
      if (value !== undefined) body[key] = value;
    return this.request('post', '/calls', callSchema, body);
  }
  async getCall(id: string) {
    const result = await this.request(
      'get',
      `/calls/${segment(id, 'callControlId')}`,
      callSchema
    );
    exact(result.call_control_id, id, 'call control ID');
    return result;
  }
  async callAction(id: string, action: string, input: Row = {}) {
    const native = action === 'play_audio' ? 'playback_start' : action;
    validateCallAction(native, input);
    return this.request(
      'post',
      `/calls/${segment(id, 'callControlId')}/actions/${native}`,
      z.object({ result: z.literal('ok') }),
      input
    );
  }
  async sendVerification(input: {
    phoneNumber: string;
    verifyProfileId: string;
    type: 'sms' | 'call' | 'flashcall' | 'whatsapp';
    customCode?: string;
    timeoutSecs?: number;
  }) {
    phone(input.phoneNumber);
    required(input.verifyProfileId, 'verifyProfileId');
    integer(input.timeoutSecs, 'timeoutSecs', 0, 2_147_483_647);
    if (input.type === 'flashcall' && input.customCode !== undefined)
      invalid(
        'Flash-call verification does not support customCode. Omit it or select a documented code-delivery channel.'
      );
    if (input.customCode !== undefined && !/^\d+$/.test(input.customCode))
      invalid('customCode must contain decimal digits.');
    const body: Row = {
      phone_number: input.phoneNumber,
      verify_profile_id: input.verifyProfileId
    };
    if (input.customCode !== undefined) body.custom_code = input.customCode;
    if (input.timeoutSecs !== undefined) body.timeout_secs = input.timeoutSecs;
    const result = await this.request(
      'post',
      `/verifications/${input.type}`,
      verificationSchema,
      body
    );
    exact(result.phone_number, input.phoneNumber, 'verification phone number');
    exact(result.verify_profile_id, input.verifyProfileId, 'Verify profile ID');
    exact(result.type, input.type, 'verification channel');
    return result;
  }
  async getVerification(id: string) {
    const result = await this.request(
      'get',
      `/verifications/${segment(id, 'verificationId')}`,
      verificationSchema
    );
    exact(result.id, id, 'verification ID');
    return result;
  }
  async verifyCode(number: string, code: string, profileId: string) {
    phone(number);
    required(profileId, 'verifyProfileId');
    if (!/^\d+$/.test(code)) invalid('code must contain decimal digits.');
    const result = await this.request(
      'post',
      `/verifications/by_phone_number/${segment(number, 'phone number')}/actions/verify`,
      z.object({ phone_number: z.string(), response_code: z.enum(['accepted', 'rejected']) }),
      { code, verify_profile_id: profileId }
    );
    exact(result.phone_number, number, 'verification phone number');
    return result;
  }
  listVerifyProfiles(input?: Page) {
    return this.list('/verify_profiles', profileSchema, paging(input));
  }
  async getVerifyProfile(id: string) {
    const result = await this.request(
      'get',
      `/verify_profiles/${segment(id, 'profileId')}`,
      profileSchema
    );
    exact(result.id, id, 'Verify profile ID');
    return result;
  }
  async createVerifyProfile(input: ProfileInput) {
    const body = this.profileBody(input, true, true);
    const result = await this.request('post', '/verify_profiles', profileSchema, body);
    receipt(result, body);
    return result;
  }
  async updateVerifyProfile(id: string, input: ProfileInput) {
    const body = this.profileBody(input, false, true);
    const result = await this.request(
      'patch',
      `/verify_profiles/${segment(id, 'profileId')}`,
      profileSchema,
      body
    );
    exact(result.id, id, 'Verify profile ID');
    receipt(result, body);
    return result;
  }
  async deleteVerifyProfile(id: string) {
    const result = await this.request(
      'delete',
      `/verify_profiles/${segment(id, 'profileId')}`,
      profileSchema
    );
    exact(result.id, id, 'deleted Verify profile ID');
    return result;
  }
  async lookupNumber(number: string, type?: 'carrier' | 'caller-name') {
    phone(number);
    const result = await this.request(
      'get',
      `/number_lookup/${segment(number, 'phone number')}`,
      lookupSchema,
      undefined,
      type ? { type } : undefined
    );
    exact(result.phone_number, number, 'lookup phone number');
    return result;
  }
  async sendFax(input: {
    connectionId: string;
    to: string;
    from: string;
    mediaUrl?: string;
    mediaName?: string;
    fromDisplayName?: string;
    quality?: 'normal' | 'high' | 'very_high' | 'ultra_light' | 'ultra_dark';
    storeMedia?: boolean;
  }) {
    phone(input.to);
    phone(input.from);
    required(input.connectionId, 'connectionId');
    if (Boolean(input.mediaUrl) === Boolean(input.mediaName))
      invalid('Provide exactly one of mediaUrl or mediaName.');
    if (input.mediaUrl) httpUrl(input.mediaUrl, 'PDF URL');
    if (input.mediaName) required(input.mediaName, 'mediaName');
    if (input.mediaName && input.storeMedia)
      invalid('storeMedia cannot be used with mediaName; provide mediaUrl instead.');
    const body: Row = { connection_id: input.connectionId, to: input.to, from: input.from };
    for (const [key, value] of Object.entries({
      media_url: input.mediaUrl,
      media_name: input.mediaName,
      from_display_name: input.fromDisplayName,
      quality: input.quality,
      store_media: input.storeMedia
    }))
      if (value !== undefined) body[key] = value;
    const result = await this.request('post', '/faxes', faxSchema, body);
    exact(result.connection_id, input.connectionId, 'fax connection ID');
    exact(result.from, input.from, 'fax sender');
    exact(result.to, input.to, 'fax recipient');
    return result;
  }
  async getFax(id: string) {
    const result = await this.request('get', `/faxes/${segment(id, 'faxId')}`, faxSchema);
    exact(result.id, id, 'fax ID');
    return result;
  }
  async refreshInboundFax(
    id: string,
    reference?: { connectionId: string; from: string; to: string; direction: 'inbound' }
  ) {
    const before = await this.getFax(id);
    if (before.direction !== 'inbound' || before.status !== 'received')
      invalid(
        'Only a completed inbound fax supports documented media-URL refresh. Request an already stored outbound PDF again; outbound renewal is not documented.'
      );
    if (
      reference &&
      (before.connection_id !== reference.connectionId ||
        before.from !== reference.from ||
        before.to !== reference.to ||
        before.direction !== reference.direction)
    )
      invalid(
        'The fax no longer matches the original file reference. Retrieve the exact fax again.',
        'fax_identity_changed'
      );
    await this.request(
      'post',
      `/faxes/${segment(id, 'faxId')}/actions/refresh`,
      z.object({ result: z.literal('ok') })
    );
    const after = await this.getFax(id);
    if (
      after.direction !== before.direction ||
      after.status !== before.status ||
      after.connection_id !== before.connection_id ||
      after.from !== before.from ||
      after.to !== before.to
    )
      invalid(
        'Fax identity changed during media refresh. Request the exact fax again.',
        'fax_identity_changed'
      );
    return after;
  }
  listSimCards(input?: Page & { status?: string; simCardGroupId?: string }) {
    if (input?.simCardGroupId !== undefined)
      invalid(
        'simCardGroupId is not a documented /sim_cards filter. Omit it, inspect native simCardGroupId on each returned page, and use get for exact IDs; no group-filtered total is available.'
      );
    return this.list('/sim_cards', simSchema, {
      ...paging(input),
      ...(input?.status === undefined ? {} : { 'filter[status]': [input.status] }),
      ...(input?.simCardGroupId === undefined
        ? {}
        : { 'filter[sim_card_group_id]': input.simCardGroupId })
    });
  }
  async getSimCard(id: string) {
    const result = await this.request(
      'get',
      `/sim_cards/${segment(id, 'simCardId')}`,
      simSchema,
      undefined,
      { include_pin_puk_codes: false }
    );
    exact(result.id, id, 'SIM card ID');
    return result;
  }
  async updateSimCard(id: string, input: { simCardGroupId?: string; tags?: string[] }) {
    const body: Row = {};
    if (input.simCardGroupId !== undefined)
      body.sim_card_group_id = required(input.simCardGroupId, 'simCardGroupId');
    if (input.tags !== undefined) body.tags = input.tags;
    if (!Object.keys(body).length) invalid('Provide tags or simCardGroupId to update.');
    const result = await this.request(
      'patch',
      `/sim_cards/${segment(id, 'simCardId')}`,
      simSchema,
      body
    );
    exact(result.id, id, 'SIM card ID');
    receipt(result, body);
    return result;
  }
  async simCardAction(id: string, action: 'enable' | 'disable' | 'set_standby') {
    const result = await this.request(
      'post',
      `/sim_cards/${segment(id, 'simCardId')}/actions/${action}`,
      simActionSchema
    );
    exact(result.sim_card_id, id, 'SIM card ID');
    exact(result.action_type, action, 'SIM action');
    return result;
  }
  async getSimCardAction(id: string) {
    const result = await this.request(
      'get',
      `/sim_card_actions/${segment(id, 'actionId')}`,
      simActionSchema
    );
    exact(result.id, id, 'SIM action ID');
    return result;
  }
  async deleteSimCard(id: string) {
    const result = await this.request(
      'delete',
      `/sim_cards/${segment(id, 'simCardId')}`,
      simSchema
    );
    exact(result.id, id, 'decommissioned SIM card ID');
    return result;
  }
  listConnections(input?: Page & { nameContains?: string }) {
    if (input?.nameContains !== undefined && input.nameContains.length < 3)
      invalid('nameContains must contain at least three characters.');
    return this.list('/connections', connectionSchema, {
      ...paging(input),
      ...(input?.nameContains === undefined
        ? {}
        : { 'filter[connection_name][contains]': input.nameContains })
    });
  }
  getBalance() {
    return this.request('get', '/balance', balanceSchema);
  }
}
