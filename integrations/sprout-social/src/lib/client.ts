import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export const identityBase =
  'https://identity.sproutsocial.com/oauth2/84e39c75-d770-45d9-90a9-7b79e3037d2c';
export type Row = Record<string, any>;
export interface ClientConfig {
  token: string;
  customerId?: string;
}
export interface AnalyticsRequest {
  filters: string[];
  metrics?: string[];
  fields?: string[];
  dimensions?: string[];
  sort?: string[];
  timezone?: string;
  page?: number;
  limit?: number;
}
export interface MessagesRequest {
  filters: string[];
  fields?: string[];
  sort?: string[];
  timezone?: string;
  limit?: number;
  pageCursor?: string;
}
export type ListeningMessagesRequest = AnalyticsRequest;
export interface ListeningMetricsRequest {
  filters: string[];
  metrics: string[];
  dimensions?: string[];
  timezone?: string;
  limit?: number;
}
export interface CasesFilterRequest extends MessagesRequest {
  page?: number;
}
export interface CreatePublishingPostRequest {
  groupId: number;
  customerProfileIds: number[];
  isDraft: boolean;
  text?: string;
  media?: Array<{ mediaId: string; mediaType: string }>;
  delivery?: { scheduledTimes: string[]; type: string };
  tagIds?: number[];
}

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export function safeSproutFailure(error: unknown) {
  const details = isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : {};
  const candidate = getApiErrorStatus(error) ?? details.upstreamStatus;
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  return buildApiServiceError(status === undefined ? {} : { response: { status } }, {
    providerLabel: 'Sprout Social',
    parent: {},
    reason:
      details.reason === 'invalid_api_response'
        ? 'invalid_api_response'
        : 'api_request_failed',
    extractMessage: () =>
      'Check credentials, customer access, API permissions, plan availability and request fields. Submitted values and transport details are omitted. Independently reconcile failed writes before retrying.'
  });
}
export function pathId(value: string) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value === '.' ||
    value === '..' ||
    /[\r\n]/.test(value)
  )
    throw invalid('Provide a nonempty resource ID.');
  return encodeURIComponent(value);
}
export function positiveIds(values: number[], label = 'profileIds', maximum?: number) {
  if (
    !values.length ||
    values.some(value => !Number.isSafeInteger(value) || value < 1) ||
    new Set(values).size !== values.length ||
    (maximum !== undefined && values.length > maximum)
  )
    throw invalid(
      'Provide distinct positive integer ' +
        label +
        (maximum === undefined ? '.' : `, at most ${maximum}.`)
    );
}
export function range(start: string, end: string, datesOnly = false, maximumYear = false) {
  const format = datesOnly
    ? /^\d{4}-\d{2}-\d{2}$/
    : /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  const first = Date.parse(start),
    last = Date.parse(end);
  const calendarDate = (value: string) => {
    const parts = value.slice(0, 10).split('-').map(Number);
    return (
      new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!)).toISOString().slice(0, 10) ===
      value.slice(0, 10)
    );
  };
  if (
    !format.test(start) ||
    !format.test(end) ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first > last ||
    !calendarDate(start) ||
    !calendarDate(end)
  )
    throw invalid('Provide a valid ordered date or ISO-8601 timestamp range.');
  if (maximumYear) {
    const boundary = new Date(first);
    boundary.setUTCFullYear(boundary.getUTCFullYear() + 1);
    if (last > boundary.getTime())
      throw invalid('The reporting period must not exceed one year.');
  }
}
export function listeningValues(
  values: string[] | undefined,
  kind: 'network' | 'sentiment',
  messages = false
) {
  if (values === undefined) return undefined;
  if (!values.length || values.some(value => !/^[A-Za-z_]+$/.test(value)))
    throw invalid(`Provide nonempty ${kind} filter values.`);
  const mapped = values.map(value =>
    kind === 'network'
      ? value.toUpperCase() === 'WEB'
        ? 'WWW'
        : value.toUpperCase()
      : value.toLowerCase()
  );
  if (
    kind === 'network' &&
    mapped.some(value => ['X', 'TWITTER'].includes(value) || (messages && value === 'REDDIT'))
  )
    throw invalid(
      messages
        ? 'X Listening data and Reddit message-level Listening data are unavailable. Select another network.'
        : 'X Listening data is unavailable. Select another network.'
    );
  return mapped;
}
function page(value?: number) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1))
    throw invalid('page must be a positive integer.');
  return value;
}
function limit(value?: number) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 100))
    throw invalid('limit must be an integer between 1 and 100.');
  return value;
}
function cursor(value?: string) {
  if (value !== undefined && (!value.trim() || /[\r\n]/.test(value)))
    throw invalid('pageCursor must be a nonempty opaque cursor.');
  return value;
}
function list(values: string[] | undefined, required = false) {
  if (
    (required && !values?.length) ||
    values?.some(value => !value.trim() || /[\r\n]/.test(value))
  )
    throw invalid('Provide nonempty filter, field or metric values.');
  return values;
}
const exactPublishingId = (value: unknown) =>
  (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) ||
  (typeof value === 'string' && /^[1-9]\d*$/.test(value));

export class Client {
  private axios;
  private redactor: AuthConfigSecretRedactor;
  private customerId?: string;
  constructor(config: ClientConfig) {
    if (!config.token?.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('Reconnect with a valid Sprout Social token.', {
        reason: 'invalid_credentials'
      });
    this.customerId = config.customerId;
    const token = config.token.trim();
    this.redactor = new AuthConfigSecretRedactor({ token, authorization: `Bearer ${token}` });
    this.axios = createAxios({
      baseURL: 'https://api.sproutsocial.com',
      timeout: 45000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }
  private scoped(path: string) {
    if (!this.customerId || !/^[0-9]+$/.test(this.customerId) || /^0+$/.test(this.customerId))
      throw createApiServiceError('Call list_customers and supply the selected customerId.', {
        reason: 'missing_customer'
      });
    return `/v1/${encodeURIComponent(this.customerId)}${path}`;
  }
  private clean(value: unknown): any {
    if (typeof value === 'string')
      return this.redactor
        .redactEmbedded(value)
        .replace(/\$\$MT\$secret\$authConfig\$[A-Za-z0-9_.]+(?:\$\$)?/g, '[redacted]');
    if (Array.isArray(value)) return value.map(item => this.clean(item));
    if (isApiErrorRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [this.clean(key), this.clean(item)])
      );
    return value;
  }
  private async request(
    method: 'get' | 'post',
    url: string,
    data?: unknown,
    multipart = false
  ): Promise<Row> {
    try {
      const response = await this.axios.request({
        method,
        url,
        data,
        ...(multipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : {})
      });
      if (
        response.status !== 200 ||
        !isApiErrorRecord(response.data) ||
        !Array.isArray(response.data.data) ||
        response.data.data.some((item: unknown) => !isApiErrorRecord(item)) ||
        (response.data.error !== undefined &&
          response.data.error !== null &&
          response.data.error !== '') ||
        (response.data.errors !== undefined &&
          (!Array.isArray(response.data.errors) || response.data.errors.length))
      )
        throw createApiServiceError('Sprout Social returned an invalid response.', {
          reason: 'invalid_api_response',
          upstreamStatus: response.status
        });
      const paging = response.data.paging;
      if (
        (/\/listening\/topics\/[^/]+\/messages$/.test(url) &&
          (!isApiErrorRecord(paging) || typeof paging.current_page !== 'number')) ||
        (paging !== undefined &&
          (!isApiErrorRecord(paging) ||
            ['current_page', 'total_pages'].some(
              key =>
                paging[key] !== undefined &&
                (typeof paging[key] !== 'number' ||
                  !Number.isInteger(paging[key]) ||
                  paging[key] < (key === 'current_page' ? 1 : 0))
            ) ||
            (paging.next_cursor !== undefined &&
              (typeof paging.next_cursor !== 'string' || !paging.next_cursor))))
      )
        throw createApiServiceError('Sprout Social returned invalid pagination.', {
          reason: 'invalid_api_response'
        });
      if (
        (url.endsWith('/analytics/profiles') &&
          response.data.data.some(
            (item: Row) =>
              !isApiErrorRecord(item.dimensions) || !isApiErrorRecord(item.metrics)
          )) ||
        (url.endsWith('/metrics') &&
          response.data.data.some((item: Row) => !isApiErrorRecord(item.metrics)))
      )
        throw createApiServiceError(
          'Sprout Social omitted requested analytics dimensions or metrics.',
          { reason: 'invalid_api_response' }
        );
      return this.clean(response.data);
    } catch (error) {
      throw safeSproutFailure(error);
    }
  }
  async listCustomers() {
    const result = await this.request('get', '/v1/metadata/client');
    if (
      result.data.some(
        (item: Row) =>
          !(
            (typeof item.customer_id === 'number' &&
              Number.isSafeInteger(item.customer_id) &&
              item.customer_id > 0) ||
            (typeof item.customer_id === 'string' && /^[1-9]\d*$/.test(item.customer_id))
          ) ||
          typeof item.name !== 'string' ||
          !item.name.trim()
      )
    )
      throw createApiServiceError('Customer discovery omitted a stable ID or name.', {
        reason: 'invalid_api_response'
      });
    return result;
  }
  async getCurrentUser() {
    try {
      const http = createAxios({ baseURL: identityBase, timeout: 45000, maxRedirects: 0 });
      const response = await http.get('/v1/userinfo', {
        headers: { Authorization: this.axios.defaults.headers.Authorization }
      });
      if (
        response.status !== 200 ||
        !isApiErrorRecord(response.data) ||
        typeof response.data.sub !== 'string' ||
        !response.data.sub ||
        ['email', 'given_name', 'family_name'].some(
          key =>
            response.data[key] !== undefined &&
            response.data[key] !== null &&
            typeof response.data[key] !== 'string'
        )
      )
        throw createApiServiceError('OAuth user identity was not confirmed.', {
          reason: 'invalid_api_response'
        });
      return this.clean(response.data);
    } catch (error) {
      throw safeSproutFailure(error);
    }
  }
  getCustomerProfiles() {
    return this.request('get', this.scoped('/metadata/customer'));
  }
  getGroups() {
    return this.request('get', this.scoped('/metadata/customer/groups'));
  }
  getTags() {
    return this.request('get', this.scoped('/metadata/customer/tags'));
  }
  getUsers() {
    return this.request('get', this.scoped('/metadata/customer/users'));
  }
  getTeams() {
    return this.request('get', this.scoped('/metadata/customer/teams'));
  }
  getTopics() {
    return this.request('get', this.scoped('/metadata/customer/topics'));
  }
  getQueues() {
    return this.request('get', this.scoped('/metadata/customer/queues'));
  }
  getProfileAnalytics(request: AnalyticsRequest) {
    return this.request(
      'post',
      this.scoped('/analytics/profiles'),
      pickDefined({
        filters: list(request.filters, true),
        metrics: list(request.metrics, true),
        page: page(request.page)
      })
    );
  }
  getPostAnalytics(request: AnalyticsRequest) {
    return this.request(
      'post',
      this.scoped('/analytics/posts'),
      pickDefined({
        filters: list(request.filters, true),
        fields: list(request.fields),
        metrics: list(request.metrics),
        sort: list(request.sort),
        timezone: request.timezone,
        page: page(request.page)
      })
    );
  }
  getMessages(request: MessagesRequest) {
    return this.request(
      'post',
      this.scoped('/messages'),
      pickDefined({
        filters: list(request.filters, true),
        fields: list(request.fields),
        sort: list(request.sort),
        timezone: request.timezone,
        limit: limit(request.limit),
        page_cursor: cursor(request.pageCursor)
      })
    );
  }
  getListeningTopicMessages(topicId: string, request: ListeningMessagesRequest) {
    return this.request(
      'post',
      this.scoped(`/listening/topics/${pathId(topicId)}/messages`),
      pickDefined({
        filters: list(request.filters, true),
        fields: list(request.fields ?? ['guid', 'created_time'], true),
        metrics: list(request.metrics),
        sort: list(request.sort),
        timezone: request.timezone,
        page: page(request.page),
        limit: limit(request.limit)
      })
    );
  }
  getListeningTopicMetrics(topicId: string, request: ListeningMetricsRequest) {
    return this.request(
      'post',
      this.scoped(`/listening/topics/${pathId(topicId)}/metrics`),
      pickDefined({
        filters: list(request.filters, true),
        metrics: list(request.metrics, true),
        dimensions: list(request.dimensions),
        timezone: request.timezone,
        limit: limit(request.limit)
      })
    );
  }
  getCases(request: CasesFilterRequest) {
    page(request.page);
    if (request.page !== undefined && request.page !== 1)
      throw invalid(
        'Case pagination uses pageCursor. Omit legacy page or use 1 for the first page, then pass the returned pageCursor.'
      );
    list(request.filters, true);
    const id = request.filters.find(value => /^case_id\.eq\(/.test(value));
    if (id && request.filters.length !== 1)
      throw invalid('case_id must be used without other case filters.');
    if (!id) {
      const dates = request.filters.filter(value =>
        /^(?:created_time|updated_time|latest_activity_time)\.in\(/.test(value)
      );
      if (!dates.length)
        throw invalid('Use case_id alone or a case date range no longer than one week.');
      for (const value of dates) {
        const match = value.match(/^[^.]+\.in\((.+?)\.{2,3}(.+)\)$/);
        if (!match) throw invalid('Provide a valid case date-range filter.');
        range(match[1]!, match[2]!);
        if (Date.parse(match[2]!) - Date.parse(match[1]!) > 7 * 86400000)
          throw invalid('Case date ranges must not exceed one week.');
      }
    }
    return this.request(
      'post',
      this.scoped('/cases/filter'),
      pickDefined({
        filters: request.filters,
        fields: list(request.fields),
        sort: list(request.sort),
        timezone: request.timezone,
        limit: limit(request.limit),
        page_cursor: cursor(request.pageCursor)
      })
    );
  }
  async createPublishingPost(request: CreatePublishingPostRequest) {
    positiveIds([request.groupId], 'groupId');
    positiveIds(request.customerProfileIds, 'customerProfileIds');
    if (!request.isDraft)
      throw invalid(
        'Only draft creation is supported; publishing is unavailable through this operation.'
      );
    if (!request.text?.trim() && !request.media?.length)
      throw invalid('Provide post text or media.');
    if (
      request.media?.some(
        value =>
          !value.mediaId.trim() || !['PHOTO', 'VIDEO', 'DOCUMENT'].includes(value.mediaType)
      )
    )
      throw invalid(
        'Provide valid uploaded media IDs and PHOTO, VIDEO or DOCUMENT media types.'
      );
    if (request.tagIds?.length) positiveIds(request.tagIds, 'tagIds');
    if (
      request.delivery &&
      (request.delivery.type !== 'SCHEDULED' ||
        !request.delivery.scheduledTimes.length ||
        request.delivery.scheduledTimes.some(
          value =>
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) ||
            !Number.isFinite(Date.parse(value)) ||
            Date.parse(value) <= Date.now()
        ))
    )
      throw invalid('Scheduled drafts require future UTC ISO-8601 timestamps.');
    for (const value of request.delivery?.scheduledTimes ?? []) range(value, value);
    const result = await this.request(
      'post',
      this.scoped('/publishing/posts'),
      pickDefined({
        group_id: request.groupId,
        customer_profile_ids: request.customerProfileIds,
        is_draft: true,
        text: request.text,
        media: request.media?.map(value => ({
          media_id: value.mediaId,
          media_type: value.mediaType
        })),
        delivery: request.delivery && {
          scheduled_times: request.delivery.scheduledTimes,
          type: 'SCHEDULED'
        },
        tag_ids: request.tagIds
      })
    );
    if (
      !result.data.length ||
      result.data.some(
        (value: Row) =>
          !isApiErrorRecord(value.internal?.publishing) ||
          value.internal.publishing.is_draft !== true ||
          value.internal.publishing.group_id !== request.groupId ||
          !request.customerProfileIds.includes(Number(value.customer_profile_id)) ||
          !exactPublishingId(value.internal.publishing.publishing_post_id)
      )
    )
      throw createApiServiceError(
        'Draft creation was not independently identifiable; reconcile the calendar before retrying.',
        { reason: 'invalid_api_response' }
      );
    return result;
  }
  async getPublishingPost(id: string) {
    if (!/^[1-9]\d*$/.test(id))
      throw invalid(
        'Provide the exact numeric publishing post ID returned by draft creation.'
      );
    const result = await this.request('get', this.scoped(`/publishing/posts/${pathId(id)}`));
    if (
      !result.data.length ||
      result.data.some(
        (value: Row) =>
          !isApiErrorRecord(value.internal?.publishing) ||
          !exactPublishingId(value.internal.publishing.publishing_post_id)
      ) ||
      !result.data.some(
        (value: Row) => String(value.internal.publishing.publishing_post_id) === id
      )
    )
      throw createApiServiceError(
        'Publishing readback omitted the exact requested calendar post or returned an inexact ID.',
        { reason: 'invalid_api_response' }
      );
    return result;
  }
  async uploadMediaFromUrl(mediaUrl: string) {
    let url: URL;
    try {
      url = new URL(mediaUrl);
    } catch {
      throw invalid('Provide a publicly accessible HTTP/HTTPS media URL.');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      /[\r\n]/.test(mediaUrl)
    )
      throw invalid('Use a public HTTP/HTTPS media URL without embedded credentials.');
    const form = new FormData();
    form.set('media_url', mediaUrl);
    const result = await this.request('post', this.scoped('/media/'), form, true);
    if (
      result.data.length !== 1 ||
      typeof result.data[0].media_id !== 'string' ||
      !result.data[0].media_id ||
      typeof result.data[0].expiration_time !== 'string' ||
      !Number.isFinite(Date.parse(result.data[0].expiration_time))
    )
      throw createApiServiceError(
        'Media upload omitted its ID or expiration time; reconcile before retrying.',
        { reason: 'invalid_api_response' }
      );
    return result;
  }
}
