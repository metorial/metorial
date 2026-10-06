import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  pickDefined
} from 'slates';
import { apiDate, email, identifier, paging, type Row, record, records, text } from './data';

const pathId = (value: string) => encodeURIComponent(text(value, 'resource ID'));
const statusOf = (error: unknown) => {
  const status = getApiErrorStatus(error);
  const parsed =
    typeof status === 'string' && /^\d{3}$/.test(status) ? Number(status) : status;
  return typeof parsed === 'number' &&
    Number.isInteger(parsed) &&
    parsed >= 100 &&
    parsed <= 599
    ? parsed
    : undefined;
};

export class MoosendClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  constructor(config: { token: string }) {
    this.token = text(config.token, 'Moosend API key');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.moosend.com/v3',
      timeout: 45000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
      errorAdapter: error => {
        if (error instanceof ServiceError) return error;
        const status = statusOf(error);
        return buildApiServiceError(error, {
          providerLabel: 'Moosend',
          parent: {},
          reason: 'moosend_api_error',
          extractResponse: () => ({}),
          extractStatus: () => status,
          extractMessage: () => 'Request failed; upstream details are omitted.',
          formatMessage: () =>
            `Moosend request failed${status ? ` (HTTP ${status})` : ''}. Check the API key, permissions and request parameters.`
        });
      }
    });
  }
  private async envelope(
    method: 'get' | 'post' | 'delete',
    path: string,
    data?: Row,
    params?: Row,
    partial = false
  ): Promise<{ context: unknown; partialFailure: boolean }> {
    const response = await this.axios.request<unknown>({
      method,
      url: path,
      data,
      params: pickDefined({ ...params, apikey: this.token })
    });
    const result = record(response.data, 'API envelope');
    const code = result.Code;
    if (code !== 0 && code !== '0') {
      const status =
        typeof code === 'number' && Number.isInteger(code) && code >= 400 && code <= 599
          ? code
          : undefined;
      throw createApiServiceError(
        'Moosend rejected the operation. Check the API key, resource IDs and request parameters; provider details are omitted.',
        {
          reason: 'moosend_api_rejected',
          upstreamStatus: status,
          upstreamCode:
            typeof code === 'number' && Number.isSafeInteger(code) ? String(code) : undefined
        }
      );
    }
    const partialFailure =
      (result.Error != null && result.Error !== '') ||
      (result.Errors != null && (!Array.isArray(result.Errors) || result.Errors.length > 0));
    if (partialFailure && !partial)
      throw createApiServiceError(
        'Moosend reported an unsuccessful operation; provider details are omitted.',
        { reason: 'moosend_api_rejected' }
      );
    if (!Object.hasOwn(result, 'Context'))
      throw createApiServiceError('Moosend returned an API envelope without a result.');
    return { context: result.Context, partialFailure };
  }
  private async request(
    method: 'get' | 'post' | 'delete',
    path: string,
    data?: Row,
    params?: Row
  ): Promise<unknown> {
    return (await this.envelope(method, path, data, params)).context;
  }
  private async readback(id: string, read: () => Promise<Row>): Promise<Row> {
    try {
      return await read();
    } catch {
      throw createApiServiceError(
        `Moosend accepted the write for resource ${id}, but its readback failed. Verify the resource before retrying; the write was not repeated.`,
        { reason: 'moosend_write_readback_failed' }
      );
    }
  }
  async createCampaign(body: Row): Promise<Row> {
    const id = identifier(await this.request('post', '/campaigns/create.json', body));
    return { ID: id, Name: body.Name, Subject: body.Subject };
  }
  async updateCampaign(campaignId: string, body: Row): Promise<void> {
    const current = await this.getCampaign(campaignId);
    if (current.Status !== 0)
      throw createApiServiceError('Only draft campaigns can be updated.');
    const merged: Row = { ...body, Name: body.Name ?? current.Name };
    if (body.ReplyToEmail === undefined && current.ReplyToEmail != null)
      merged.ReplyToEmail = email(record(current.ReplyToEmail, 'reply-to sender').Email);
    if (body.ConfirmationToEmail === undefined && current.ConfirmationTo != null)
      merged.ConfirmationToEmail = email(current.ConfirmationTo, 'confirmation email');
    const mailingLists = records(current.MailingLists, 'campaign mailing lists').map(list => {
      const listId = identifier(list.MailingListID, 'mailing list ID');
      return {
        MailingListID: listId,
        ...(list.SegmentID == null || list.SegmentID === 0 || list.SegmentID === '0'
          ? {}
          : { SegmentID: identifier(list.SegmentID, 'segment ID') })
      };
    });
    if (!mailingLists.length)
      throw createApiServiceError('Existing campaign recipients cannot be preserved.');
    merged.MailingLists = mailingLists;
    if (body.HTMLContent === undefined && body.WebLocation === undefined) {
      if (current.HTMLContent != null) merged.HTMLContent = current.HTMLContent;
      else if (current.WebLocation != null) merged.WebLocation = current.WebLocation;
      else
        throw createApiServiceError(
          'Existing campaign content cannot be preserved. Supply htmlContent or webLocation explicitly.'
        );
    }
    await this.request('post', `/campaigns/${pathId(campaignId)}/update.json`, merged);
  }
  async getCampaigns(page = 1, pageSize = 50): Promise<Row> {
    paging(page, pageSize);
    return record(await this.request('get', `/campaigns/${page}/${pageSize}.json`));
  }
  async getCampaign(id: string): Promise<Row> {
    return record(await this.request('get', `/campaigns/${pathId(id)}/view.json`));
  }
  async sendCampaign(id: string): Promise<void> {
    await this.request('post', `/campaigns/${pathId(id)}/send.json`, {});
  }
  async scheduleCampaign(id: string, dateTime: string, timezone?: string): Promise<void> {
    await this.request(
      'post',
      `/campaigns/${pathId(id)}/schedule.json`,
      pickDefined({ DateTime: text(dateTime, 'schedule date and time'), Timezone: timezone })
    );
  }
  async unscheduleCampaign(id: string): Promise<void> {
    await this.request('post', `/campaigns/${pathId(id)}/unschedule.json`, {});
  }
  async cloneCampaign(id: string): Promise<Row> {
    return record(await this.request('post', `/campaigns/${pathId(id)}/clone.json`, {}));
  }
  async deleteCampaign(id: string): Promise<void> {
    await this.request('delete', `/campaigns/${pathId(id)}/delete.json`);
  }
  async sendTestEmail(id: string, emails: string[]): Promise<void> {
    if (emails.length < 1 || emails.length > 5)
      throw createApiServiceError('Provide one to five controlled test email recipients.');
    await this.request('post', `/campaigns/${pathId(id)}/send-test.json`, {
      TestEmails: emails.map(value => email(value))
    });
  }
  async getCampaignSummary(id: string): Promise<Row> {
    return record(await this.request('get', `/campaigns/${pathId(id)}/view-summary.json`));
  }
  async getCampaignABSummary(id: string): Promise<Row> {
    return record(await this.request('get', `/campaigns/${pathId(id)}/view-ab-summary.json`));
  }
  async getCampaignStats(
    id: string,
    type: string,
    page?: number,
    pageSize?: number,
    from?: string,
    to?: string
  ): Promise<Row> {
    paging(page, pageSize);
    if (type === 'Forward')
      throw createApiServiceError(
        'Forward statistics are not supported by the current API. Use a documented activity type.'
      );
    const fromDate = apiDate(from),
      toDate = apiDate(to);
    if (
      fromDate &&
      toDate &&
      `${fromDate.slice(6)}-${fromDate.slice(3, 5)}-${fromDate.slice(0, 2)}` >
        `${toDate.slice(6)}-${toDate.slice(3, 5)}-${toDate.slice(0, 2)}`
    )
      throw createApiServiceError('fromDate must not be after toDate.');
    return record(
      await this.request(
        'get',
        `/campaigns/${pathId(id)}/stats/${encodeURIComponent(type)}.json`,
        undefined,
        { Page: page, PageSize: pageSize, From: fromDate, To: toDate }
      )
    );
  }
  async getCampaignLinkActivity(id: string): Promise<Row> {
    return record(await this.request('get', `/campaigns/${pathId(id)}/stats/links.json`));
  }
  async getCampaignActivityByLocation(id: string): Promise<Row> {
    return record(await this.request('get', `/campaigns/${pathId(id)}/stats/countries.json`));
  }
  async createMailingList(body: Row): Promise<Row> {
    return {
      ID: identifier(await this.request('post', '/lists/create.json', body)),
      Name: body.Name
    };
  }
  async getMailingLists(page = 1, pageSize = 100, withStatistics = false): Promise<Row> {
    paging(page, pageSize);
    return record(
      await this.request('get', `/lists/${page}/${pageSize}.json`, undefined, {
        WithStatistics: String(withStatistics)
      })
    );
  }
  async getMailingList(id: string, withStatistics = false): Promise<Row> {
    return record(
      await this.request('get', `/lists/${pathId(id)}/details.json`, undefined, {
        WithStatistics: String(withStatistics)
      })
    );
  }
  async updateMailingList(id: string, body: Row): Promise<Row> {
    const current = await this.getMailingList(id);
    body = { ...body, Name: body.Name ?? text(current.Name, 'existing list name') };
    if (body.Preferences === undefined && current.Preferences != null) {
      const preferences = record(current.Preferences, 'list preferences');
      const selectType = preferences.SelectType;
      if (selectType !== 0 && selectType !== 1)
        throw createApiServiceError(
          'Existing list preferences cannot be preserved. Supply preferences explicitly.'
        );
      if (
        !Array.isArray(preferences.Options) ||
        preferences.Options.some(value => typeof value !== 'string')
      )
        throw createApiServiceError(
          'Existing preference options cannot be preserved. Supply preferences explicitly.'
        );
      body.Preferences = pickDefined({
        SelectType: selectType === 0 ? 'SingleSelect' : 'MultiSelect',
        Options: preferences.Options,
        IsRequired: preferences.IsRequired
      });
    }
    await this.request('post', `/lists/${pathId(id)}/update.json`, body);
    return this.readback(id, () => this.getMailingList(id));
  }
  async deleteMailingList(id: string): Promise<void> {
    await this.request('delete', `/lists/${pathId(id)}/delete.json`);
  }
  async createCustomField(listId: string, body: Row): Promise<unknown> {
    return this.request('post', `/lists/${pathId(listId)}/customfields/create.json`, body);
  }
  async updateCustomField(listId: string, fieldId: string, body: Row): Promise<void> {
    const fields = records(
      (await this.getMailingList(listId)).CustomFieldsDefinition,
      'custom fields'
    );
    const current = fields.find(field => identifier(field.ID) === fieldId);
    if (!current)
      throw createApiServiceError('Custom field was not found in the specified list.');
    const types: Record<number, string> = {
      0: 'Text',
      1: 'Number',
      2: 'DateTime',
      3: 'SingleSelectDropdown',
      5: 'CheckBox'
    };
    const existingType = typeof current.Type === 'number' ? types[current.Type] : undefined;
    if (
      Object.entries(body).every(
        ([key, value]) =>
          (key === 'Name' && value === current.Name) ||
          (key === 'CustomFieldType' && value === existingType) ||
          (key === 'IsRequired' && value === current.IsRequired) ||
          (key === 'IsHidden' && value === current.IsHidden)
      )
    )
      return;
    body = { ...body, Name: body.Name ?? text(current.Name, 'existing custom field name') };
    if (body.CustomFieldType === undefined) {
      if (!existingType)
        throw createApiServiceError(
          'Existing field type cannot be preserved. Supply fieldType.'
        );
      body.CustomFieldType = existingType;
    }
    if (body.IsRequired === undefined) {
      if (typeof current.IsRequired !== 'boolean')
        throw createApiServiceError(
          'Existing required setting cannot be preserved. Supply isRequired.'
        );
      body.IsRequired = current.IsRequired;
    }
    if (body.IsHidden === undefined) {
      if (typeof current.IsHidden !== 'boolean')
        throw createApiServiceError(
          'Existing field visibility is not reported. Supply isHidden explicitly to avoid exposing a hidden field; no update was sent.'
        );
      body.IsHidden = current.IsHidden;
    }
    if (body.CustomFieldType === 'SingleSelectDropdown' && body.Options === undefined)
      throw createApiServiceError(
        'Supply all comma-separated options when updating a dropdown field; its XML definition cannot be safely replayed as request options.'
      );
    await this.request(
      'post',
      `/lists/${pathId(listId)}/customfields/${pathId(fieldId)}/update.json`,
      body
    );
  }
  async deleteCustomField(listId: string, fieldId: string): Promise<void> {
    await this.request(
      'delete',
      `/lists/${pathId(listId)}/customfields/${pathId(fieldId)}/delete.json`
    );
  }
  async addSubscriber(listId: string, body: Row): Promise<Row> {
    body = { ...body, Email: email(body.Email) };
    return record(
      await this.request('post', `/subscribers/${pathId(listId)}/subscribe.json`, body)
    );
  }
  async addMultipleSubscribers(
    listId: string,
    subscribers: Row[],
    hasExternalDoubleOptIn?: boolean
  ): Promise<{ subscribers: Row[]; partialFailure: boolean }> {
    if (subscribers.length < 1 || subscribers.length > 1000)
      throw createApiServiceError('Provide one to 1000 subscribers per batch.');
    const result = await this.envelope(
      'post',
      `/subscribers/${pathId(listId)}/subscribe_many.json`,
      pickDefined({
        Subscribers: subscribers.map(value => ({ ...value, Email: email(value.Email) })),
        HasExternalDoubleOptIn: hasExternalDoubleOptIn
      }),
      undefined,
      true
    );
    return {
      subscribers: records(result.context, 'subscribers'),
      partialFailure: result.partialFailure
    };
  }
  async updateSubscriber(listId: string, id: string, body: Row): Promise<Row> {
    if (body.Email === undefined)
      body = { ...body, Email: (await this.getSubscriberById(listId, id)).Email };
    body = { ...body, Email: email(body.Email) };
    return record(
      await this.request(
        'post',
        `/subscribers/${pathId(listId)}/update/${pathId(id)}.json`,
        body
      )
    );
  }
  async getSubscriberByEmail(listId: string, address: string): Promise<Row> {
    return record(
      await this.request('get', `/subscribers/${pathId(listId)}/view.json`, undefined, {
        Email: email(address)
      })
    );
  }
  async getSubscriberById(listId: string, id: string): Promise<Row> {
    return record(
      await this.request('get', `/subscribers/${pathId(listId)}/find/${pathId(id)}.json`)
    );
  }
  async getSubscribersByStatus(
    listId: string,
    status: string,
    page?: number,
    pageSize?: number,
    since?: string
  ): Promise<Row> {
    paging(page, pageSize);
    if (since !== undefined)
      throw createApiServiceError(
        'The current subscriber list API does not document a since filter. Omit since and compare returned timestamps after paging.'
      );
    return record(
      await this.request(
        'get',
        `/lists/${pathId(listId)}/subscribers/${encodeURIComponent(status)}.json`,
        undefined,
        { Page: page, PageSize: pageSize }
      )
    );
  }
  async unsubscribeFromList(listId: string, address: string): Promise<void> {
    await this.request('post', `/subscribers/${pathId(listId)}/unsubscribe.json`, {
      Email: email(address)
    });
  }
  async unsubscribeFromCampaign(listId: string, id: string, address: string): Promise<void> {
    await this.request(
      'post',
      `/subscribers/${pathId(listId)}/${pathId(id)}/unsubscribe.json`,
      { Email: email(address) }
    );
  }
  async removeSubscriber(listId: string, address: string): Promise<void> {
    await this.request('post', `/subscribers/${pathId(listId)}/remove.json`, {
      Email: email(address)
    });
  }
  async removeMultipleSubscribers(listId: string, emails: string[]): Promise<Row> {
    if (!emails.length) throw createApiServiceError('Provide at least one email to remove.');
    return record(
      await this.request('post', `/subscribers/${pathId(listId)}/remove-many.json`, {
        Emails: emails.map(value => email(value)).join(',')
      })
    );
  }
  async createSegment(
    listId: string,
    name: string,
    matchType?: string,
    criteria?: Row
  ): Promise<Row> {
    if (!criteria)
      throw createApiServiceError(
        'Provide criteria when creating a segment; the current API requires initial rules.'
      );
    const id = identifier(
      await this.request(
        'post',
        `/lists/${pathId(listId)}/segments/create.json`,
        pickDefined({
          Name: text(name, 'segment name'),
          MatchType: matchType,
          Criteria: [criteria]
        })
      )
    );
    return this.readback(id, () => this.getSegment(listId, id));
  }
  async getSegments(listId: string): Promise<Row> {
    return record(await this.request('get', `/lists/${pathId(listId)}/segments.json`));
  }
  async getSegment(listId: string, id: string): Promise<Row> {
    return record(
      await this.request('get', `/lists/${pathId(listId)}/segments/${pathId(id)}/details.json`)
    );
  }
  async getSegmentSubscribers(
    listId: string,
    id: string,
    page?: number,
    pageSize?: number
  ): Promise<Row> {
    paging(page, pageSize);
    return record(
      await this.request(
        'get',
        `/lists/${pathId(listId)}/segments/${pathId(id)}/members.json`,
        undefined,
        { Page: page, PageSize: pageSize }
      )
    );
  }
  async updateSegment(
    listId: string,
    id: string,
    name: string,
    matchType?: string
  ): Promise<Row> {
    const current = await this.getSegment(listId, id);
    const selected =
      matchType ??
      (current?.MatchType === 0 ? 'All' : current?.MatchType === 1 ? 'Any' : undefined);
    if (!selected)
      throw createApiServiceError(
        'Existing segment match type cannot be preserved. Supply matchType.'
      );
    const fetchType =
      current.FetchType === 0
        ? 'All'
        : current.FetchType === 1
          ? 'Top'
          : current.FetchType === 2
            ? 'TopPercent'
            : undefined;
    if (
      !fetchType ||
      typeof current.FetchValue !== 'number' ||
      !Number.isSafeInteger(current.FetchValue) ||
      current.FetchValue < 0
    )
      throw createApiServiceError(
        'Existing segment audience limit cannot be preserved; no update was sent.'
      );
    await this.request('post', `/lists/${pathId(listId)}/segments/${pathId(id)}/update.json`, {
      Name: text(name, 'segment name'),
      MatchType: selected,
      FetchType: fetchType,
      FetchValue: current.FetchValue
    });
    return this.readback(id, () => this.getSegment(listId, id));
  }
  async addSegmentCriteria(listId: string, id: string, body: Row): Promise<unknown> {
    return this.request(
      'post',
      `/lists/${pathId(listId)}/segments/${pathId(id)}/criteria/add.json`,
      body
    );
  }
  async updateSegmentCriteria(
    listId: string,
    id: string,
    criteriaId: string,
    body: Row
  ): Promise<void> {
    await this.request(
      'post',
      `/lists/${pathId(listId)}/segments/${pathId(id)}/criteria/${pathId(criteriaId)}/update.json`,
      body
    );
  }
  async deleteSegment(listId: string, id: string): Promise<void> {
    await this.request(
      'delete',
      `/lists/${pathId(listId)}/segments/${pathId(id)}/delete.json`
    );
  }
  async sendTransactionalEmail(body: Row): Promise<Row> {
    const response = await this.axios.post<unknown>(
      '/campaigns/transactional/send.json',
      body,
      { params: { apikey: this.token } }
    );
    const result = record(response.data, 'transactional receipt');
    if (Object.hasOwn(result, 'Code')) {
      if (result.Code !== 0 || (result.Error != null && result.Error !== ''))
        throw createApiServiceError(
          'Moosend rejected the transactional request; provider details are omitted.'
        );
      return record(result.Context, 'transactional receipt');
    }
    return result;
  }
  async getSenders(): Promise<Row[]> {
    return records(await this.request('get', '/senders/find_all.json'), 'senders');
  }
  async getSenderByEmail(address: string): Promise<Row | null> {
    const result = await this.request('get', '/senders/find_one.json', undefined, {
      Email: email(address)
    });
    return result === null ? null : record(result, 'sender');
  }
}
