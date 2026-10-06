import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';

export const API_VERSION = '202609';
export const API_BASE = 'https://api.linkedin.com';

export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'linkedin_ads_validation' });

export const apiError = (error: unknown, operation = 'request') => {
  const raw =
    getApiErrorStatus(error) ??
    (error instanceof ServiceError ? error.data.upstreamStatus : undefined);
  const status = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : undefined;
  const safeStatus =
    Number.isInteger(status) && Number(status) >= 100 && Number(status) <= 599
      ? status
      : undefined;
  return buildApiServiceError(
    { response: { status: safeStatus } },
    {
      providerLabel: 'LinkedIn',
      reason: 'linkedin_ads_api',
      operation,
      parent: {},
      fallbackMessage:
        'Check API product approval, granted permissions, account role, request fields and the supported Marketing API version.'
    }
  );
};

export const numericId = (value: string, kind = 'sponsoredAccount') => {
  const id = value.startsWith(`urn:li:${kind}:`)
    ? value.slice(`urn:li:${kind}:`.length)
    : value;
  if (!/^[1-9]\d*$/.test(id))
    throw invalid(`Provide a numeric ${kind} ID or its complete matching URN.`);
  return id;
};
export const urn = (value: string, kind: string) => `urn:li:${kind}:${numericId(value, kind)}`;
const atom = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
const list = (values: string[]) => `List(${values.map(atom).join(',')})`;
const page = (params?: PageInput, offset = false, maximum = 1000) => {
  const size = params?.pageSize;
  if (size !== undefined && (!Number.isInteger(size) || size < 1 || size > maximum))
    throw invalid(`pageSize must be an integer from 1 to ${maximum}.`);
  if (params?.pageToken !== undefined && !params.pageToken.trim())
    throw invalid('pageToken must not be blank.');
  if (!offset) return pickDefined({ pageSize: size, pageToken: params?.pageToken });
  const token = params?.pageToken;
  if (token !== undefined && !/^(?:offset:)?\d+$/.test(token))
    throw invalid('Use the returned offset page token for this endpoint.');
  const start = token === undefined ? 0 : Number(token.replace(/^offset:/, ''));
  if (!Number.isSafeInteger(start))
    throw invalid('The offset page token exceeds the supported integer range.');
  return pickDefined({ count: size, start });
};
export const continuation = (value: LinkedInPagedResponse<unknown>, offset = false) => {
  if (!offset)
    return typeof value.metadata?.nextPageToken === 'string' && value.metadata.nextPageToken
      ? value.metadata.nextPageToken
      : undefined;
  const p = value.paging;
  if (!p) return undefined;
  const next = p.start + p.count;
  const hasNext =
    p.total !== undefined
      ? next < p.total
      : p.links?.some(link => link.rel === 'next') ||
        (p.count > 0 && value.elements.length >= p.count);
  return hasNext && p.count > 0 ? `offset:${next}` : undefined;
};
const scrub = (value: unknown, token: string): unknown => {
  if (typeof value === 'string')
    return value
      .split(token)
      .join('[redacted]')
      .split('{{SLATE_AUTH_TOKEN}}')
      .join('[redacted]')
      .split('$$MT$secret$')
      .join('[redacted]');
  if (Array.isArray(value)) return value.map(v => scrub(v, token));
  if (isApiErrorRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        String(scrub(key, token)),
        /^(authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret)$/i.test(key)
          ? '[redacted]'
          : scrub(v, token)
      ])
    );
  return value;
};
const safeId = z.number().int().positive().refine(Number.isSafeInteger);
const money = z.object({ amount: z.string(), currencyCode: z.string() });
const schedule = z
  .object({ start: z.number().int().optional(), end: z.number().int().optional() })
  .optional();
const exactLeadId = z.union([z.string().regex(/^[1-9]\d*$/), safeId]).transform(String);
const ensureLeadJsonPrecision = () => {
  let original: string | undefined;
  JSON.parse(
    '{"id":6755260984438374401}',
    (key: string, value: unknown, context?: { source?: string }) => {
      if (key === 'id') original = context?.source;
      return value;
    }
  );
  if (original !== '6755260984438374401')
    throw invalid(
      'This runtime cannot preserve exact LinkedIn lead-form IDs. Upgrade to a runtime supporting JSON.parse reviver source before using Lead Sync; rounded IDs are never sent or reported.'
    );
};
const parseLeadJson = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw, (key: string, value: unknown, context?: { source?: string }) => {
      if (['id', 'questionId'].includes(key) && typeof value === 'number') {
        if (!context?.source || !/^(?:0|[1-9]\d*)$/.test(context.source))
          throw invalid('An exact lead identifier could not be read.');
        return Number.isSafeInteger(value) ? value : context.source;
      }
      return value;
    });
  } catch {
    throw invalid(
      'LinkedIn returned invalid Lead Sync JSON or an identifier whose exact digits could not be preserved.'
    );
  }
};
const accountSchema = z
  .object({
    id: safeId,
    name: z.string(),
    status: z.string(),
    type: z.string(),
    currency: z.string(),
    reference: z.string().default(''),
    servingStatuses: z.array(z.string()).optional(),
    totalBudget: money.optional(),
    notifiedOnCreativeApproval: z.boolean().optional(),
    notifiedOnCreativeRejection: z.boolean().optional(),
    notifiedOnEndOfCampaign: z.boolean().optional(),
    test: z.boolean().optional()
  })
  .passthrough();
const groupSchema = z
  .object({
    id: safeId,
    name: z.string(),
    account: z.string(),
    status: z.string(),
    runSchedule: schedule,
    totalBudget: money.optional(),
    test: z.boolean().optional()
  })
  .passthrough();
const campaignSchema = z
  .object({
    targetingCriteria: z.unknown().optional(),
    creativeSelection: z.string().optional(),
    format: z.string().optional(),
    optimizationTargetType: z.string().optional(),
    audienceExpansionEnabled: z.boolean().optional(),
    servingStatuses: z.array(z.string()).optional(),
    id: safeId,
    name: z.string(),
    account: z.string(),
    campaignGroup: z.string(),
    status: z.string(),
    objectiveType: z.string().default(''),
    type: z.string(),
    costType: z.string(),
    dailyBudget: money.optional(),
    totalBudget: money.optional(),
    unitCost: money.optional(),
    runSchedule: schedule,
    test: z.boolean().optional()
  })
  .passthrough();
const creativeSchema = z
  .object({
    name: z.string().optional(),
    content: z.unknown().optional(),
    servingStatuses: z.array(z.string()).optional(),
    servingHoldReasons: z.array(z.string()).optional(),
    isTest: z.boolean().optional(),
    isServing: z.boolean().optional(),
    id: z.string().regex(/^urn:li:sponsoredCreative:[1-9]\d*$/),
    campaign: z.string(),
    account: z.string(),
    intendedStatus: z.string()
  })
  .passthrough();
const conversionSchema = z
  .object({
    postClickAttributionWindowSize: z.number().optional(),
    viewThroughAttributionWindowSize: z.number().optional(),
    attributionType: z.string().optional(),
    enabled: z.boolean().optional(),
    id: safeId,
    name: z.string(),
    account: z.string(),
    conversionMethod: z.string(),
    type: z.string()
  })
  .passthrough();
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      'LinkedIn returned an unexpected response or an ID outside the exact integer range. No completion can be confirmed.',
      { reason: 'linkedin_ads_response' }
    );
  return result.data;
};
const localized = (value: unknown, locale: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (!isApiErrorRecord(value) || !isApiErrorRecord(value.localized)) return undefined;
  const l = isApiErrorRecord(locale)
    ? [locale.language, locale.country, locale.variant].filter(Boolean).join('_')
    : undefined;
  const entry = l ? value.localized[l] : undefined;
  if (typeof entry === 'string') return entry;
  const first = Object.values(value.localized).find(v => typeof v === 'string');
  return typeof first === 'string' ? first : undefined;
};
const leadFormSchema = z
  .object({
    id: exactLeadId,
    name: z.string(),
    state: z.string(),
    content: z.object({
      headline: z.unknown().optional(),
      description: z.unknown().optional(),
      legalInfo: z.object({ privacyPolicyUrl: z.string().optional() }).optional(),
      questions: z
        .array(
          z.object({
            predefinedField: z.string().optional(),
            question: z.unknown().optional(),
            responseRequired: z.boolean().optional()
          })
        )
        .optional()
    }),
    creationLocale: z.unknown().optional(),
    owner: z.object({ sponsoredAccount: z.string() }),
    versionId: z.number().int().nonnegative()
  })
  .transform(form => ({
    id: form.id,
    name: form.name,
    status: form.state,
    owner: form.owner,
    versionId: form.versionId,
    headline: localized(form.content.headline, form.creationLocale),
    description: localized(form.content.description, form.creationLocale),
    privacyPolicyUrl: form.content.legalInfo?.privacyPolicyUrl,
    questions: form.content.questions?.map(q => ({
      predefinedField: q.predefinedField,
      customQuestionText: localized(q.question, form.creationLocale),
      required: q.responseRequired
    }))
  }));
const answerSchema = z
  .object({
    questionId: z.union([safeId, z.string()]).optional(),
    answerDetails: z
      .object({
        textQuestionAnswer: z.object({ answer: z.string() }).optional(),
        multipleChoiceAnswer: z.object({ options: z.array(z.number().int()) }).optional()
      })
      .optional(),
    accepted: z
      .object({
        textQuestionAnswer: z.object({ answer: z.string() }).optional(),
        multipleChoiceAnswer: z.object({ options: z.array(z.number().int()) }).optional()
      })
      .optional()
  })
  .transform(a => ({
    questionId: a.questionId === undefined ? undefined : String(a.questionId),
    answer: (a.answerDetails ?? a.accepted)?.textQuestionAnswer?.answer,
    options: (a.answerDetails ?? a.accepted)?.multipleChoiceAnswer?.options
  }));
const leadResponseSchema = z
  .object({
    id: z.string().min(1),
    owner: z.object({ sponsoredAccount: z.string() }),
    versionedLeadGenFormUrn: z
      .string()
      .regex(/^urn:li:versionedLeadGenForm:\(urn:li:leadGenForm:[1-9]\d*,\d+\)$/),
    submittedAt: z.number().int().nonnegative().refine(Number.isSafeInteger),
    formResponse: z.object({ answers: z.array(answerSchema).optional() }).optional(),
    associatedEntity: z
      .union([z.string(), z.object({ associatedCreative: z.string() })])
      .optional(),
    testLead: z.boolean().optional()
  })
  .transform(r => ({
    ...r,
    leadForm: r.versionedLeadGenFormUrn.match(/urn:li:leadGenForm:[1-9]\d*/)?.[0]!,
    associatedEntity:
      typeof r.associatedEntity === 'string'
        ? r.associatedEntity
        : r.associatedEntity?.associatedCreative
  }));
type PageInput = { pageSize?: number; pageToken?: string };
type Entity = 'adCampaignGroups' | 'adCampaigns' | 'creatives';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  constructor(config: { token: string }) {
    if (!config.token.trim() || /[\r\n]/.test(config.token))
      throw invalid('Connect a valid LinkedIn OAuth token.');
    this.token = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: API_BASE,
      timeout: 30000,
      maxRedirects: 0,
      authHeader: { value: `Bearer ${config.token}` },
      headers: { 'LinkedIn-Version': API_VERSION, 'X-Restli-Protocol-Version': '2.0.0' },
      errorAdapter: error => apiError(error)
    });
  }
  private async request(
    method: 'get' | 'post',
    path: string,
    data?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string>
  ) {
    const leadRequest =
      path.startsWith('/rest/leadForms') || path.startsWith('/rest/leadFormResponses');
    if (leadRequest) ensureLeadJsonPrecision();
    const response = await requestAxios(
      `LinkedIn ${method}`,
      () =>
        this.axios.request({
          method,
          url: path,
          data,
          params,
          headers: { ...(params?.q ? { 'X-RestLi-Method': 'FINDER' } : {}), ...headers },
          ...(leadRequest ? { transformResponse: [parseLeadJson] } : {}),
          paramsSerializer: {
            serialize: p =>
              Object.entries(p)
                .filter(([, v]) => v !== undefined)
                .map(
                  ([k, v]) =>
                    `${atom(k)}=${['search', 'campaigns', 'accounts', 'creatives', 'campaignGroups', 'dateRange', 'owner', 'leadType', 'submittedAtTimeRange', 'versionedLeadGenFormUrn'].includes(k) ? String(v) : atom(String(v))}`
                )
                .join('&')
          }
        }),
      apiError
    );
    return { ...response, data: scrub(response.data, this.token) };
  }
  private async read<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Record<string, unknown>
  ): Promise<T> {
    return parse(schema, (await this.request('get', path, undefined, params)).data);
  }
  private async paged<T>(
    path: string,
    schema: z.ZodType<T>,
    params: Record<string, unknown>
  ): Promise<LinkedInPagedResponse<T>> {
    return this.read(
      path,
      z.object({
        elements: z.array(schema),
        metadata: z.record(z.string(), z.unknown()).optional(),
        paging: z
          .object({
            count: z.number().int().nonnegative(),
            start: z.number().int().nonnegative(),
            total: z.number().int().nonnegative().optional(),
            links: z.array(z.object({ rel: z.string(), href: z.string() })).optional()
          })
          .optional()
      }),
      params
    );
  }
  private async created(path: string, data: unknown, kind: string) {
    const response = await this.request('post', path, data);
    if (response.status !== 201)
      throw invalid(
        'LinkedIn did not confirm creation. Inspect the target before retrying; the request may have created a resource.'
      );
    const raw =
      getResponseHeaderValue(response.headers, 'x-restli-id') ??
      (isApiErrorRecord(response.data) ? response.data.id : undefined);
    if (typeof raw !== 'string' && typeof raw !== 'number')
      throw invalid(
        'LinkedIn did not return a resource ID. Reconcile possible creation before retrying.'
      );
    if (typeof raw === 'number' && !Number.isSafeInteger(raw))
      throw invalid(
        'LinkedIn returned an inexact numeric resource ID. Reconcile creation before retrying.'
      );
    const value = String(scrub(String(raw), this.token));
    const id = numericId(
      kind === 'llaPartnerConversion'
        ? value.replace(/^urn:lla:llaPartnerConversion:/, '')
        : value,
      kind
    );
    return kind === 'sponsoredCreative' ? urn(id, kind) : id;
  }
  private async resolveAccount(entity: Entity, id: string, explicit?: string) {
    if (explicit !== undefined) return numericId(explicit);
    const accounts = await this.getAdAccounts({ pageSize: 21 });
    if (accounts.elements.length > 20 || continuation(accounts))
      throw invalid(
        'Specify accountId from list_ad_accounts; automatic account discovery is limited to 20 authorized accounts.'
      );
    const kind =
      entity === 'adCampaignGroups'
        ? 'sponsoredCampaignGroup'
        : entity === 'adCampaigns'
          ? 'sponsoredCampaign'
          : 'sponsoredCreative';
    const target = urn(id, kind);
    const matches: string[] = [];
    for (const account of accounts.elements) {
      const params =
        entity === 'creatives'
          ? { q: 'criteria', creatives: list([target]), pageSize: 2 }
          : { q: 'search', search: `(id:(values:${list([target])}))`, pageSize: 2 };
      const result = await this.paged(
        `/rest/adAccounts/${account.id}/${entity}`,
        z.object({ id: z.union([z.string(), safeId]), account: z.string() }).passthrough(),
        params
      );
      if (continuation(result) || result.elements.length > 1)
        throw invalid(
          'Account discovery is ambiguous. Specify the exact accountId from list_ad_accounts.'
        );
      if (result.elements.length) {
        const row = result.elements[0]!;
        if (
          urn(String(row.id), kind) !== target ||
          row.account !== urn(String(account.id), 'sponsoredAccount')
        )
          throw invalid('LinkedIn returned an inconsistent account relationship.');
        matches.push(String(account.id));
      }
    }
    if (matches.length !== 1)
      throw invalid(
        'The resource could not be bound to exactly one authorized account. Specify accountId from list_ad_accounts.'
      );
    return matches[0]!;
  }
  async getCurrentUser() {
    return this.read(
      '/v2/userinfo',
      z.object({
        sub: z.string().min(1),
        name: z.string().optional(),
        given_name: z.string().optional(),
        family_name: z.string().optional(),
        picture: z.string().optional()
      })
    );
  }
  async getAdAccounts(params?: PageInput & { search?: string }) {
    if (params?.search !== undefined && !params.search.trim())
      throw invalid('search must not be blank.');
    return this.paged('/rest/adAccounts', accountSchema, {
      q: 'search',
      ...page(params),
      ...(params?.search ? { search: `(name:(values:${list([params.search])}))` } : {})
    });
  }
  async getAdAccount(id: string) {
    const account = await this.read(`/rest/adAccounts/${numericId(id)}`, accountSchema);
    if (String(account.id) !== numericId(id))
      throw invalid('LinkedIn returned an account outside the requested ID.');
    return account;
  }
  async getCampaignGroups(accountId: string, params?: PageInput) {
    return this.paged(
      `/rest/adAccounts/${numericId(accountId)}/adCampaignGroups`,
      groupSchema,
      {
        q: 'search',
        search: `(status:(values:${list(['ACTIVE', 'ARCHIVED', 'CANCELED', 'DRAFT', 'PAUSED', 'PENDING_DELETION', 'REMOVED'])}))`,
        ...page(params)
      }
    );
  }
  async getCampaignGroup(id: string, accountId?: string) {
    const account = await this.resolveAccount('adCampaignGroups', id, accountId);
    const result = await this.read(
      `/rest/adAccounts/${account}/adCampaignGroups/${numericId(id, 'sponsoredCampaignGroup')}`,
      groupSchema
    );
    if (
      result.account !== urn(account, 'sponsoredAccount') ||
      String(result.id) !== numericId(id, 'sponsoredCampaignGroup')
    )
      throw invalid('The campaign group does not match the requested account and ID.');
    return result;
  }
  async createCampaignGroup(data: Record<string, unknown>) {
    this.validateWrite(data);
    if (!isApiErrorRecord(data.runSchedule) || data.runSchedule.start === undefined)
      throw invalid('Campaign group creation requires an explicit runScheduleStart.');
    if (data.totalBudget && data.runSchedule.end === undefined)
      throw invalid('A campaign group with totalBudget requires runScheduleEnd.');
    return this.created(
      `/rest/adAccounts/${numericId(String(data.account))}/adCampaignGroups`,
      data,
      'sponsoredCampaignGroup'
    );
  }
  async updateCampaignGroup(id: string, updates: Record<string, unknown>, accountId?: string) {
    const current = await this.getCampaignGroup(id, accountId);
    return this.partial(
      `/rest/adAccounts/${numericId(current.account)}/adCampaignGroups/${current.id}`,
      updates,
      current
    );
  }
  async getCampaigns(
    accountId: string,
    params?: PageInput & { campaignGroupId?: string; status?: string[] }
  ) {
    const criteria: string[] = [];
    if (params?.campaignGroupId)
      criteria.push(
        `campaignGroup:(values:${list([urn(params.campaignGroupId, 'sponsoredCampaignGroup')])})`
      );
    if (params?.status) {
      if (!params.status.length || params.status.some(s => !/^[A-Z_]+$/.test(s)))
        throw invalid('Provide one or more valid campaign statuses.');
      criteria.push(`status:(values:${list(params.status)})`);
    }
    if (!criteria.length)
      criteria.push(
        `status:(values:${list(['ACTIVE', 'PAUSED', 'ARCHIVED', 'COMPLETED', 'CANCELED', 'DRAFT', 'PENDING_DELETION', 'REMOVED'])})`
      );
    return this.paged(`/rest/adAccounts/${numericId(accountId)}/adCampaigns`, campaignSchema, {
      q: 'search',
      ...page(params),
      ...(criteria.length ? { search: `(${criteria.join(',')})` } : {})
    });
  }
  async getCampaign(id: string, accountId?: string) {
    const account = await this.resolveAccount('adCampaigns', id, accountId);
    const result = await this.read(
      `/rest/adAccounts/${account}/adCampaigns/${numericId(id, 'sponsoredCampaign')}`,
      campaignSchema
    );
    if (
      result.account !== urn(account, 'sponsoredAccount') ||
      String(result.id) !== numericId(id, 'sponsoredCampaign')
    )
      throw invalid('The campaign does not match the requested account and ID.');
    return result;
  }
  async createCampaign(data: Record<string, unknown>) {
    this.validateWrite(data);
    if (!data.dailyBudget && !data.totalBudget)
      throw invalid('Provide a dailyBudget or totalBudget for campaign creation.');
    if (
      !isApiErrorRecord(data.locale) ||
      !isApiErrorRecord(data.targetingCriteria) ||
      typeof data.offsiteDeliveryEnabled !== 'boolean'
    )
      throw invalid(
        'Current campaign creation requires locale, targetingCriteria and offsiteDeliveryEnabled. Supply them explicitly.'
      );
    if (
      ['SPONSORED_UPDATES', 'DYNAMIC'].includes(String(data.type)) &&
      (typeof data.associatedEntity !== 'string' ||
        !/^urn:li:(organization|person):[A-Za-z0-9_-]+$/.test(data.associatedEntity))
    )
      throw invalid(
        'This campaign type requires the advertiser associatedEntity URN. Supply it explicitly; it is not inferred from another account.'
      );
    const account = numericId(String(data.account));
    const group = await this.getCampaignGroup(String(data.campaignGroup), account);
    if (group.account !== urn(account, 'sponsoredAccount'))
      throw invalid('The campaign group belongs to a different account.');
    return this.created(`/rest/adAccounts/${account}/adCampaigns`, data, 'sponsoredCampaign');
  }
  async updateCampaign(id: string, updates: Record<string, unknown>, accountId?: string) {
    const current = await this.getCampaign(id, accountId);
    return this.partial(
      `/rest/adAccounts/${numericId(current.account)}/adCampaigns/${current.id}`,
      updates,
      current
    );
  }
  async getCreatives(campaignId: string, params?: PageInput & { accountId?: string }) {
    const campaign = await this.getCampaign(campaignId, params?.accountId);
    return this.paged(
      `/rest/adAccounts/${numericId(campaign.account)}/creatives`,
      creativeSchema,
      {
        q: 'criteria',
        campaigns: list([urn(campaignId, 'sponsoredCampaign')]),
        ...page(params, false, 100)
      }
    );
  }
  async getCreative(id: string, accountId?: string) {
    const account = await this.resolveAccount('creatives', id, accountId);
    const result = await this.read(
      `/rest/adAccounts/${account}/creatives/${atom(urn(id, 'sponsoredCreative'))}`,
      creativeSchema
    );
    if (
      result.account !== urn(account, 'sponsoredAccount') ||
      result.id !== urn(id, 'sponsoredCreative')
    )
      throw invalid('The creative does not match the requested account and ID.');
    return result;
  }
  async createCreative(data: Record<string, unknown>, accountId?: string) {
    const campaign = await this.getCampaign(String(data.campaign), accountId);
    if (!isApiErrorRecord(data.content))
      throw invalid(
        'Creative content must be a documented content object. Inline post creation is a separate API operation.'
      );
    if (data.isTest !== undefined && data.isTest !== campaign.test)
      throw invalid(
        'isTest is derived from the parent account and cannot contradict the campaign test flag.'
      );
    const { isTest: _isTest, ...body } = data;
    return this.created(
      `/rest/adAccounts/${numericId(campaign.account)}/creatives`,
      body,
      'sponsoredCreative'
    );
  }
  async updateCreative(id: string, updates: Record<string, unknown>, accountId?: string) {
    const current = await this.getCreative(id, accountId);
    const fields = isApiErrorRecord(updates.patch) ? updates.patch : updates;
    if (fields.content !== undefined)
      throw invalid(
        'Existing creative content references cannot be replaced through this update. Create a new creative with the desired content; status changes remain supported.'
      );
    return this.partial(
      `/rest/adAccounts/${numericId(current.account)}/creatives/${atom(current.id)}`,
      updates,
      current
    );
  }
  private validateWrite(data: Record<string, unknown>) {
    if ('name' in data && (typeof data.name !== 'string' || !data.name.trim()))
      throw invalid('name must not be blank.');
    for (const key of ['dailyBudget', 'totalBudget', 'unitCost'])
      if (data[key] !== undefined) {
        const v = data[key];
        if (
          !isApiErrorRecord(v) ||
          typeof v.amount !== 'string' ||
          !/^\d+(?:\.\d+)?$/.test(v.amount) ||
          typeof v.currencyCode !== 'string' ||
          !/^[A-Z]{3}$/.test(v.currencyCode)
        )
          throw invalid(
            'Provide a nonnegative decimal amount and uppercase three-letter currency code.'
          );
      }
    if (data.targetingCriteria !== undefined && !isApiErrorRecord(data.targetingCriteria))
      throw invalid('targetingCriteria must be a current targeting JSON object.');
    if (
      data.associatedEntity !== undefined &&
      (typeof data.associatedEntity !== 'string' ||
        !/^urn:li:(organization|person):[A-Za-z0-9_-]+$/.test(data.associatedEntity))
    )
      throw invalid('associatedEntity must be an organization or person URN.');
    if (data.runSchedule !== undefined) {
      const v = data.runSchedule;
      if (!isApiErrorRecord(v)) throw invalid('runSchedule must be an object.');
      for (const key of ['start', 'end'])
        if (v[key] !== undefined && (!Number.isSafeInteger(v[key]) || Number(v[key]) < 0))
          throw invalid('Schedule timestamps must be nonnegative exact integer milliseconds.');
      if (v.start !== undefined && v.end !== undefined && Number(v.end) <= Number(v.start))
        throw invalid('Schedule end must be after start.');
    }
  }
  private async partial(
    path: string,
    updates: Record<string, unknown>,
    current: Record<string, unknown>
  ) {
    const fields = pickDefined(isApiErrorRecord(updates.patch) ? updates.patch : updates);
    if (!Object.keys(fields).length) throw invalid('Provide at least one field to update.');
    this.validateWrite(fields);
    const set = { ...fields };
    if (isApiErrorRecord(fields.runSchedule)) {
      const old = isApiErrorRecord(current.runSchedule) ? current.runSchedule : {};
      set.runSchedule = { ...old, ...pickDefined(fields.runSchedule) };
      this.validateWrite({ runSchedule: set.runSchedule });
    }
    const response = await this.request('post', path, { patch: { $set: set } }, undefined, {
      'X-RestLi-Method': 'PARTIAL_UPDATE'
    });
    if (response.status !== 204)
      throw invalid(
        'LinkedIn did not confirm the update; inspect the resource before retrying.'
      );
  }
  async getAdAnalytics(params: {
    pivot: string;
    dateRange: {
      start: { year: number; month: number; day: number };
      end: { year: number; month: number; day: number };
    };
    timeGranularity: string;
    accounts?: string[];
    campaigns?: string[];
    creatives?: string[];
    campaignGroups?: string[];
    fields?: string[];
  }) {
    const date = (v: { year: number; month: number; day: number }) => {
      const value = new Date(Date.UTC(v.year, v.month - 1, v.day));
      if (
        ![v.year, v.month, v.day].every(Number.isInteger) ||
        v.year < 1900 ||
        value.getUTCFullYear() !== v.year ||
        value.getUTCMonth() + 1 !== v.month ||
        value.getUTCDate() !== v.day
      )
        throw invalid('Provide real calendar dates.');
      return value.getTime();
    };
    if (date(params.dateRange.end) <= date(params.dateRange.start))
      throw invalid('endDate must be after startDate.');
    const facets = [
      ['accounts', 'sponsoredAccount'],
      ['campaigns', 'sponsoredCampaign'],
      ['creatives', 'sponsoredCreative'],
      ['campaignGroups', 'sponsoredCampaignGroup']
    ] as const;
    if (!facets.some(([key]) => params[key]?.length))
      throw invalid('Provide at least one nonempty resource ID list for analytics.');
    if (
      params.fields &&
      (!params.fields.length ||
        params.fields.length > 20 ||
        params.fields.some(f => !/^[A-Za-z][A-Za-z0-9]*$/.test(f)))
    )
      throw invalid('Specify between 1 and 20 metric field names.');
    const inclusiveEndDate = new Date(date(params.dateRange.end) - 86400000);
    const inclusiveEnd = {
      year: inclusiveEndDate.getUTCFullYear(),
      month: inclusiveEndDate.getUTCMonth() + 1,
      day: inclusiveEndDate.getUTCDate()
    };
    const d = (v: { year: number; month: number; day: number }) =>
      `(year:${v.year},month:${v.month},day:${v.day})`;
    const query: Record<string, unknown> = {
      q: 'analytics',
      pivot: params.pivot,
      timeGranularity: params.timeGranularity,
      dateRange: `(start:${d(params.dateRange.start)},end:${d(inclusiveEnd)})`,
      ...(params.fields ? { fields: params.fields.join(',') } : {})
    };
    for (const [key, kind] of facets)
      if (params[key]) {
        if (!params[key]!.length) throw invalid('Resource filter arrays must not be empty.');
        query[key] = list(params[key]!.map(id => urn(id, kind)));
      }
    return this.paged('/rest/adAnalytics', z.record(z.string(), z.unknown()), query);
  }
  async getConversionRules(accountId: string, params?: PageInput) {
    return this.paged('/rest/conversions', conversionSchema, {
      q: 'account',
      account: urn(accountId, 'sponsoredAccount'),
      ...page(params, true)
    });
  }
  async createConversionRule(data: Record<string, unknown>) {
    this.validateWrite(data);
    return this.created('/rest/conversions', data, 'llaPartnerConversion');
  }
  async sendConversionEvents(
    data: Array<{
      conversion: string;
      conversionHappenedAt: number;
      conversionValue?: { currencyCode: string; amount: string };
      eventId?: string;
      user?: {
        userIds?: Array<{ idType: string; idValue: string }>;
        userInfo?: Record<string, string | undefined>;
      };
    }>
  ) {
    if (!data.length || data.length > 5000)
      throw invalid('Send between 1 and 5000 conversion events.');
    for (const event of data) {
      if (
        !/^urn:lla:llaPartnerConversion:[1-9]\d*$/.test(event.conversion) ||
        !Number.isSafeInteger(event.conversionHappenedAt) ||
        event.conversionHappenedAt < 0 ||
        (!event.user?.userIds?.length &&
          !(event.user?.userInfo?.firstName?.trim() && event.user?.userInfo?.lastName?.trim()))
      )
        throw invalid(
          'Each event requires a conversion URN, exact millisecond timestamp and matching user identifiers or both firstName and lastName.'
        );
      if (
        (event.user?.userIds ?? []).some(
          v =>
            !v.idType.trim() ||
            !v.idValue.trim() ||
            (v.idType === 'SHA256_EMAIL' && !/^[a-fA-F0-9]{64}$/.test(v.idValue))
        )
      )
        throw invalid(
          'Provide valid matching identifiers; SHA256_EMAIL requires a 64-character SHA-256 hash.'
        );
      if (event.conversionValue) this.validateWrite({ unitCost: event.conversionValue });
    }
    const response = await this.request(
      'post',
      '/rest/conversionEvents',
      { elements: data },
      undefined,
      { 'X-RestLi-Method': 'BATCH_CREATE' }
    );
    if (response.status !== 201)
      throw invalid(
        'LinkedIn did not confirm batch acceptance. Reconcile possible events before retrying.'
      );
    if (
      isApiErrorRecord(response.data) &&
      ((isApiErrorRecord(response.data.errors) && Object.keys(response.data.errors).length) ||
        (Array.isArray(response.data.elements) &&
          response.data.elements.some(
            v =>
              isApiErrorRecord(v) &&
              (v.error !== undefined ||
                (typeof v.status === 'number' && (v.status < 200 || v.status >= 300)))
          )))
    )
      throw invalid(
        'LinkedIn reported a batch element failure; do not assume every event was accepted or automatically replay the batch.'
      );
  }
  async getLeadForms(accountId: string, params?: PageInput) {
    const result = await this.paged('/rest/leadForms', leadFormSchema, {
      q: 'owner',
      owner: `(sponsoredAccount:${atom(urn(accountId, 'sponsoredAccount'))})`,
      ...page(params, true)
    });
    if (
      result.elements.some(
        form => form.owner.sponsoredAccount !== urn(accountId, 'sponsoredAccount')
      )
    )
      throw invalid('LinkedIn returned a form outside the requested owner.');
    return result;
  }
  async getLeadFormResponses(
    params: PageInput & {
      leadFormId?: string;
      accountId?: string;
      startTime?: number;
      endTime?: number;
      limitedToTestLeads?: boolean;
    }
  ) {
    if (!params.accountId && !params.leadFormId)
      throw invalid(
        'Provide accountId from list_ad_accounts or a leadFormId from list_lead_forms.'
      );
    let account = params.accountId ? numericId(params.accountId) : undefined;
    let versioned: string | undefined;
    if (params.leadFormId) {
      const match =
        /^urn:li:versionedLeadGenForm:\(urn:li:leadGenForm:([1-9]\d*),(\d+)\)$/.exec(
          params.leadFormId
        );
      const id = match?.[1] ?? numericId(params.leadFormId, 'leadGenForm');
      const form = await this.read(
        `/rest/leadForms/${id}`,
        z.object({
          id: exactLeadId,
          owner: z.object({ sponsoredAccount: z.string() }),
          versionId: z.number().int().nonnegative()
        })
      );
      if (String(form.id) !== id)
        throw invalid('LinkedIn returned a form outside the requested ID.');
      const owner = numericId(form.owner.sponsoredAccount);
      if (account && account !== owner)
        throw invalid('The lead form belongs to a different account.');
      account = owner;
      versioned = `urn:li:versionedLeadGenForm:(urn:li:leadGenForm:${id},${match?.[2] ?? form.versionId})`;
    }
    const query: Record<string, unknown> = {
      q: 'owner',
      owner: `(sponsoredAccount:${atom(urn(account!, 'sponsoredAccount'))})`,
      leadType: '(leadType:SPONSORED)',
      ...page(params, true),
      ...(versioned ? { versionedLeadGenFormUrn: atom(versioned) } : {}),
      ...(params.limitedToTestLeads !== undefined
        ? { limitedToTestLeads: params.limitedToTestLeads }
        : {})
    };
    for (const key of ['startTime', 'endTime'] as const)
      if (
        params[key] !== undefined &&
        (!Number.isSafeInteger(params[key]) || params[key]! < 0)
      )
        throw invalid('Lead time filters must be nonnegative exact integer milliseconds.');
    if (
      params.startTime !== undefined &&
      params.endTime !== undefined &&
      params.endTime <= params.startTime
    )
      throw invalid('endTime must be after startTime.');
    if (params.startTime !== undefined || params.endTime !== undefined)
      query.submittedAtTimeRange = `(${[params.startTime !== undefined ? `start:${params.startTime}` : undefined, params.endTime !== undefined ? `end:${params.endTime}` : undefined].filter(Boolean).join(',')})`;
    const result = await this.paged('/rest/leadFormResponses', leadResponseSchema, query);
    if (
      result.elements.some(
        r =>
          r.owner.sponsoredAccount !== urn(account!, 'sponsoredAccount') ||
          (versioned && r.versionedLeadGenFormUrn !== versioned) ||
          (params.limitedToTestLeads && r.testLead !== true)
      )
    )
      throw invalid(
        'LinkedIn returned a lead outside the requested account, form version or test-lead filter.'
      );
    return result;
  }
}

export type AdAccount = z.infer<typeof accountSchema>;
export type CampaignGroup = z.infer<typeof groupSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type Creative = z.infer<typeof creativeSchema>;
export type ConversionRule = z.infer<typeof conversionSchema>;
export type LinkedInPagedResponse<T> = {
  elements: T[];
  metadata?: Record<string, unknown>;
  paging?: {
    count: number;
    start: number;
    total?: number;
    links?: Array<{ rel: string; href: string }>;
  };
};
