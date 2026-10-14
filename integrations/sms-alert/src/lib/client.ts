import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export interface SmsAlertClientConfig {
  token: string;
  authType?: 'api_key' | 'username_password';
  username?: string;
  password?: string;
}

export interface SmsAlertResponse {
  status: string;
  description: unknown;
}

export interface ListParams {
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
  query?: string;
}

const discoveryPageSize = 10;
const maxDiscoveryPages = 1000;
const emptyListMessages: Record<string, string> = {
  'grouplist.json': 'no groups available for your account',
  'contactlist.json': 'no contacts in this group',
  'templatelist.json': 'no template available for your account'
};

export class SmsAlertClient {
  private axios: ReturnType<typeof createAxios>;
  private authParams: Record<string, string>;

  constructor(config: SmsAlertClientConfig) {
    this.axios = createAxios({ baseURL: 'https://www.smsalert.co.in/api/' });
    if (!config.token) throw createApiServiceError('Connect an SMS Alert account first.');

    if (config.authType === 'username_password') {
      if (!config.username || !config.password) {
        throw createApiServiceError('Reconnect SMS Alert with your username and password.');
      }
      this.authParams = { user: config.username, pwd: config.password };
    } else if (!config.authType && config.token.includes(':')) {
      // Preserve credentials saved before separate username/password fields were introduced.
      let separator = config.token.indexOf(':');
      this.authParams = {
        user: config.token.slice(0, separator),
        pwd: config.token.slice(separator + 1)
      };
    } else {
      this.authParams = { apikey: config.token };
    }
  }

  private async request(
    endpoint: string,
    params: Record<string, unknown> = {},
    method: 'GET' | 'POST' = 'POST'
  ): Promise<SmsAlertResponse> {
    let data = await requestAxiosData<unknown>(
      endpoint,
      () =>
        this.axios.request({
          url: endpoint,
          method,
          params: pickDefined({ ...this.authParams, ...params })
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'SMS Alert',
          operation,
          reason: 'sms_alert_api_error',
          detailKeys: ['description', 'desc', 'message', 'error'],
          nestedKeys: ['description']
        })
    );
    if (
      !isApiErrorRecord(data) ||
      typeof data.status !== 'string' ||
      !('description' in data)
    ) {
      throw createApiServiceError('SMS Alert returned an invalid response.');
    }
    if (data.status.toLowerCase() !== 'success') {
      let detail = extractApiErrorMessage(
        { response: { data } },
        {
          detailKeys: ['description', 'desc', 'message', 'error'],
          nestedKeys: ['description']
        }
      );
      if (detail.toLowerCase().replace(/\.$/, '') === emptyListMessages[endpoint]) {
        return { status: 'success', description: [] };
      }
      throw createApiServiceError(`SMS Alert: ${detail}`, {
        reason: 'sms_alert_api_error',
        upstreamCode: data.status
      });
    }
    return { status: data.status, description: data.description };
  }

  private list(
    endpoint: string,
    params: ListParams = {},
    extra: Record<string, unknown> = {}
  ) {
    return this.request(
      endpoint,
      {
        ...extra,
        page: params.page,
        limit: params.limit,
        order: params.order,
        q: params.query
      },
      'GET'
    );
  }

  private async collectPages(endpoint: string, extra: Record<string, unknown> = {}) {
    let records: unknown[] = [];
    let previousPage: string | undefined;
    for (let page = 1; page <= maxDiscoveryPages; page++) {
      let result = await this.list(
        endpoint,
        { page, limit: discoveryPageSize, order: 'asc' },
        extra
      );
      if (!Array.isArray(result.description)) {
        throw createApiServiceError('SMS Alert returned an invalid list response.');
      }
      let fingerprint = JSON.stringify(result.description);
      if (result.description.length > 0 && fingerprint === previousPage) {
        throw createApiServiceError(
          'SMS Alert repeated a results page. Use a resource ID instead.'
        );
      }
      records.push(...result.description);
      if (result.description.length < discoveryPageSize) return records;
      previousPage = fingerprint;
    }
    throw createApiServiceError(
      'SMS Alert discovery exceeded its page limit. Provide a resource ID.'
    );
  }

  private resource(row: unknown, key: string) {
    if (!isApiErrorRecord(row) || !isApiErrorRecord(row[key])) {
      throw createApiServiceError(`SMS Alert returned an invalid ${key} record.`);
    }
    return row[key];
  }

  async resolveGroupId(groupName: string) {
    let groups = (await this.collectPages('grouplist.json'))
      .map(row => this.resource(row, 'Group'))
      .filter(group => group.name === groupName);
    if (groups.length !== 1 || !groups[0]?.id) {
      throw createApiServiceError(
        'Group name did not identify exactly one group. Use manage_groups with action list to find its ID.'
      );
    }
    return String(groups[0].id);
  }

  private async resolveContact(params: {
    groupId?: string;
    groupName?: string;
    contactId?: string;
    mobileNo?: string;
  }) {
    let groupId =
      params.groupId ??
      (params.groupName ? await this.resolveGroupId(params.groupName) : undefined);
    if (!groupId) {
      throw createApiServiceError('Provide a group ID or group name to discover the contact.');
    }
    let normalizeNumber = (value: string) => {
      let digits = value.replace(/\D/g, '');
      return digits.length === 10 ? `91${digits}` : digits;
    };
    let contacts = (await this.collectPages('contactlist.json', { group_id: groupId }))
      .map(row => this.resource(row, 'Groupmember'))
      .filter(contact =>
        params.contactId
          ? String(contact.id) === params.contactId
          : typeof contact.number === 'string' &&
            params.mobileNo &&
            normalizeNumber(contact.number) === normalizeNumber(params.mobileNo)
      );
    if (contacts.length !== 1 || !contacts[0]?.id) {
      throw createApiServiceError(
        'Contact did not identify exactly one record. Use manage_contacts with action list to find its ID.'
      );
    }
    return contacts[0];
  }

  sendSms(params: {
    sender: string;
    mobileNo: string;
    text: string;
    route?: string;
    dlrUrl?: string;
    reference?: string;
  }) {
    let dlrUrl = params.dlrUrl;
    if (dlrUrl && !/^https?:\/\//i.test(dlrUrl)) {
      try {
        dlrUrl = decodeURIComponent(dlrUrl);
      } catch {
        throw createApiServiceError('Provide a valid delivery callback URL.');
      }
    }
    if (dlrUrl && !/^https?:\/\/\S+$/i.test(dlrUrl)) {
      throw createApiServiceError('The delivery callback URL must use HTTP or HTTPS.');
    }
    return this.request('push.json', {
      sender: params.sender,
      mobileno: params.mobileNo,
      text: params.text,
      route: params.route,
      dlrurl: dlrUrl,
      reference: params.reference
    });
  }

  async sendSmsToGroup(params: {
    sender: string;
    groupName?: string;
    groupId?: string;
    text: string;
    route?: string;
    dlrUrl?: string;
    reference?: string;
  }) {
    let id =
      params.groupId ??
      (params.groupName ? await this.resolveGroupId(params.groupName) : undefined);
    if (!id) throw createApiServiceError('Provide a group ID or group name.');
    if (params.dlrUrl || params.reference) {
      throw createApiServiceError(
        'Delivery callbacks and references are supported for mobile-number sends. Omit them for a group send.'
      );
    }
    return this.request('grouppush.json', {
      id,
      sender: params.sender,
      text: params.text,
      route: params.route
    });
  }

  scheduleSms(params: {
    sender: string;
    mobileNo: string;
    text: string;
    schedule: string;
    route?: string;
  }) {
    return this.request('push.json', {
      sender: params.sender,
      mobileno: params.mobileNo,
      text: params.text,
      schedule: params.schedule,
      route: params.route
    });
  }

  editSchedule(params: { scheduledId: string; newSchedule: string }) {
    return this.request('modifyschedule.json', {
      batchid: params.scheduledId,
      schedule: params.newSchedule
    });
  }

  cancelSchedule(params: { scheduledId: string }) {
    return this.request('cancelschedule.json', { batchid: params.scheduledId });
  }

  generateOtp(params: {
    sender?: string;
    mobileNo: string;
    text: string;
    otpLength?: number;
    otpRetry?: number;
    otpValidity?: number;
    route?: string;
  }) {
    let template = params.text.replace(/\[otp(?:\s[^\]]*)?\]/gi, tag => {
      tag = tag.replace(/^\[otp/i, '[otp');
      for (let [attribute, value] of [
        ['length', params.otpLength],
        ['retry', params.otpRetry],
        ['validity', params.otpValidity]
      ] as const) {
        if (value === undefined) continue;
        tag = tag.replace(
          new RegExp(`\\s${attribute}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s\\]]+)`, 'gi'),
          ''
        );
        tag = `${tag.slice(0, -1)} ${attribute}="${value}"]`;
      }
      return tag;
    });
    return this.request('mverify.json', {
      sender: params.sender,
      mobileno: params.mobileNo,
      template,
      route: params.route
    });
  }

  validateOtp(params: { mobileNo: string; otp: string }) {
    return this.request('mverify.json', { mobileno: params.mobileNo, code: params.otp });
  }

  async listContacts(params: ListParams & { groupName?: string; groupId?: string } = {}) {
    let groupId =
      params.groupId ??
      (params.groupName ? await this.resolveGroupId(params.groupName) : undefined);
    if (groupId) return this.list('contactlist.json', params, { group_id: groupId });
    let groups = await this.collectPages('grouplist.json');
    let records: unknown[] = [];
    for (let row of groups) {
      let group = this.resource(row, 'Group');
      if (!group.id) throw createApiServiceError('SMS Alert returned a group without an ID.');
      let contacts = await this.collectPages('contactlist.json', {
        group_id: String(group.id)
      });
      records.push(
        ...contacts.map(contact => ({
          ...this.resource(contact, 'Groupmember'),
          groupId: String(group.id),
          groupName: group.name
        }))
      );
      if (records.length > discoveryPageSize * maxDiscoveryPages) {
        throw createApiServiceError(
          'Contact discovery exceeded its record limit. Filter the list by groupId.'
        );
      }
    }
    records.sort((left, right) => {
      let first = isApiErrorRecord(left) ? String(left.creationdate ?? '') : '';
      let second = isApiErrorRecord(right) ? String(right.creationdate ?? '') : '';
      return (params.order === 'asc' ? 1 : -1) * first.localeCompare(second);
    });
    let limit = params.limit ?? 10;
    let start = ((params.page ?? 1) - 1) * limit;
    return {
      status: 'success',
      description: records.slice(start, start + limit).map(Groupmember => ({ Groupmember }))
    };
  }

  createContact(params: { groupName: string; name: string; mobileNo: string }) {
    return this.request('createcontact.json', {
      grpname: params.groupName,
      name: params.name,
      number: params.mobileNo
    });
  }

  async editContact(params: {
    groupName?: string;
    groupId?: string;
    contactId?: string;
    oldMobileNo?: string;
    newMobileNo?: string;
    name?: string;
  }) {
    let existing =
      params.contactId && params.newMobileNo && params.name
        ? { id: params.contactId, number: params.newMobileNo, name: params.name }
        : await this.resolveContact({ ...params, mobileNo: params.oldMobileNo });
    let name = params.name ?? existing.name;
    let number = params.newMobileNo ?? existing.number;
    if (typeof name !== 'string' || typeof number !== 'string') {
      throw createApiServiceError(
        'Provide both contact name and mobile number to update this contact.'
      );
    }
    return this.request('updatecontact.json', { id: existing.id, name, number });
  }

  async deleteContact(params: {
    groupName?: string;
    groupId?: string;
    contactId?: string;
    mobileNo?: string;
  }) {
    let id = params.contactId ?? (await this.resolveContact(params)).id;
    return this.request('deletecontact.json', { id });
  }

  listGroups(params: ListParams = {}) {
    return this.list('grouplist.json', params);
  }

  createGroup(params: { groupName: string }) {
    return this.request('creategroup.json', { name: params.groupName });
  }

  async editGroup(params: { oldGroupName?: string; groupId?: string; newGroupName: string }) {
    let id =
      params.groupId ??
      (params.oldGroupName ? await this.resolveGroupId(params.oldGroupName) : undefined);
    if (!id) throw createApiServiceError('Provide a group ID or the current group name.');
    return this.request('updategroup.json', { id, name: params.newGroupName });
  }

  async deleteGroup(params: { groupName?: string; groupId?: string }) {
    let id =
      params.groupId ??
      (params.groupName ? await this.resolveGroupId(params.groupName) : undefined);
    if (!id) throw createApiServiceError('Provide a group ID or group name.');
    return this.request('deletegroup.json', { id });
  }

  listTemplates(params: ListParams = {}) {
    return this.list('templatelist.json', params);
  }

  createTemplate(params: { templateName: string; templateBody: string }) {
    return this.request('createtemplate.json', {
      name: params.templateName,
      text: params.templateBody
    });
  }

  async editTemplate(params: {
    templateId: string;
    templateName?: string;
    templateBody?: string;
  }) {
    let existing =
      params.templateName && params.templateBody
        ? { title: params.templateName, template: params.templateBody }
        : (await this.collectPages('templatelist.json'))
            .map(row => this.resource(row, 'Smstemplate'))
            .find(template => String(template.id) === params.templateId);
    let name = params.templateName ?? existing?.title;
    let text = params.templateBody ?? existing?.template;
    if (typeof name !== 'string' || typeof text !== 'string') {
      throw createApiServiceError(
        'Template not found. Provide both template name and body, or list templates to find its ID.'
      );
    }
    return this.request('updatetemplate.json', { id: params.templateId, name, text });
  }

  deleteTemplate(params: { templateId: string }) {
    return this.request('deletetemplate.json', { id: params.templateId });
  }

  listSenderIds() {
    return this.request('senderlist.json', {}, 'GET');
  }

  async getSmsReport(
    params: ListParams & {
      fromDate?: string;
      toDate?: string;
      mobileNo?: string;
      sender?: string;
      scheduledOnly?: boolean;
    } = {}
  ) {
    if (params.mobileNo) {
      throw createApiServiceError(
        'Campaign logs do not support a recipient-number filter. Use get_delivery_status with a campaign batch ID to inspect recipients.'
      );
    }
    let result = await this.request('smscampaignlog.json', {
      page: params.page,
      limit: params.limit,
      q: params.query,
      schedule: params.scheduledOnly === undefined ? undefined : Number(params.scheduledOnly)
    });
    if (params.fromDate || params.toDate || params.sender) {
      if (!Array.isArray(result.description))
        throw createApiServiceError('SMS Alert returned an invalid campaign list.');
      result.description = result.description.filter(row => {
        let campaign = this.resource(row, 'Smscampaignlog');
        let date = typeof campaign.datetime === 'string' ? campaign.datetime.slice(0, 10) : '';
        return (
          (!params.fromDate || date >= params.fromDate) &&
          (!params.toDate || date <= params.toDate) &&
          (!params.sender || campaign.senderid === params.sender)
        );
      });
    }
    return result;
  }

  getDeliveryReport(params: { batchId: string }) {
    return this.request('pull.json', { batchid: params.batchId });
  }

  getCreditBalance() {
    return this.request('creditstatus.json', {}, 'GET');
  }

  createShortUrl(params: { longUrl: string }) {
    return this.request('createshorturl.json', { url: params.longUrl });
  }

  deleteShortUrl(params: { shortUrlId: string }) {
    return this.request('deleteshorturl.json', { id: params.shortUrlId });
  }

  getProfile() {
    return this.request('user.json');
  }
}
