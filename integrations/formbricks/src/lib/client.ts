import { randomUUID } from 'node:crypto';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

const record = z.record(z.string(), z.unknown());
const timestamps = { createdAt: z.string().min(1), updatedAt: z.string().min(1) };
const relation = {
  workspaceId: z.string().min(1).optional(),
  environmentId: z.string().min(1).optional()
};
const surveySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    status: z.string().min(1),
    questions: z.array(record),
    endings: z.array(record).optional(),
    welcomeCard: record.optional(),
    hiddenFields: record.optional(),
    displayOption: z.string().optional(),
    languages: z.array(record).optional(),
    triggers: z.array(record).optional(),
    followUps: z.array(record).optional(),
    ...relation,
    ...timestamps
  })
  .passthrough();
const responseSchema = z
  .object({
    id: z.string().min(1),
    surveyId: z.string().min(1),
    finished: z.boolean(),
    data: record,
    ...timestamps,
    meta: record.optional(),
    contactAttributes: record.nullish(),
    personAttributes: record.nullish()
  })
  .passthrough();
const contactSchema = z
  .object({
    id: z.string().min(1),
    ...relation,
    ...timestamps,
    userId: z.string().nullish(),
    attributes: record.optional()
  })
  .passthrough();
const actionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string(),
    ...relation,
    ...timestamps,
    description: z.string().nullish(),
    key: z.string().nullish(),
    noCodeConfig: record.nullish()
  })
  .passthrough();
const attributeKeySchema = z
  .object({
    id: z.string().min(1),
    key: z.string().min(1),
    name: z.string().nullable(),
    type: z.string(),
    ...relation,
    ...timestamps,
    description: z.string().nullish(),
    isUnique: z.boolean()
  })
  .passthrough();
const meSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['production', 'development']),
    project: z.object({ id: z.string().min(1), name: z.string().min(1) }),
    workspace: z.object({ id: z.string().min(1), name: z.string().min(1) }).optional(),
    ...timestamps
  })
  .passthrough();
export type Survey = z.infer<typeof surveySchema>;
export type ResponseData = z.infer<typeof responseSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type ActionClass = z.infer<typeof actionSchema>;
export type Paging = { limit?: number; offset?: number };
const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
const malformed = () =>
  createApiServiceError(
    'Formbricks returned an incomplete or inconsistent result. Check the resource with its exact ID before retrying any write.',
    { reason: 'invalid_provider_response' }
  );
export function instanceUrl(value: unknown): string {
  const text = value === undefined ? 'https://app.formbricks.com' : value;
  if (
    typeof text !== 'string' ||
    [...text].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid(
      'Use a valid Formbricks instance URL without credentials, query parameters, or fragments.'
    );
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw invalid('Use an absolute Formbricks instance URL.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw invalid(
      'Use the HTTPS origin of your Formbricks instance, or HTTP localhost for local development.'
    );
  return url.origin;
}
export function pathId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value !== value.trim() ||
    /[/?#\\]/.test(value) ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw invalid('Provide a nonempty exact Formbricks resource ID, not a URL or path.');
  return encodeURIComponent(value);
}
export function targetId(value: { environmentId?: string; workspaceId?: string }): string {
  const target = value.workspaceId ?? value.environmentId;
  pathId(target);
  if (target === undefined)
    throw invalid(
      'The provider did not return a workspace or environment ID. Read the exact survey before writing.'
    );
  return target;
}
function page(params: Paging = {}, offsetKey = 'offset') {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || value < 0)
      throw invalid(
        'Pagination limit and offset must be nonnegative safe integers. Omit them to use provider defaults.'
      );
    query.set(key === 'offset' ? offsetKey : key, String(value));
  }
  return query;
}
export function publicResponse(value: ResponseData) {
  return {
    responseId: value.id,
    surveyId: value.surveyId,
    finished: value.finished,
    answers: value.data,
    meta: value.meta,
    contactAttributes:
      value.contactAttributes !== undefined ? value.contactAttributes : value.personAttributes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}
export function publicContact(value: Contact) {
  return {
    contactId: value.id,
    workspaceId: value.workspaceId,
    environmentId: value.environmentId,
    userId: value.userId ?? undefined,
    attributes: value.attributes,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}
function answerData(value: unknown) {
  const shape = z.record(
    z.string(),
    z.union([z.string(), z.number(), z.array(z.string()), z.record(z.string(), z.string())])
  );
  const parsed = shape.safeParse(value);
  if (!parsed.success)
    throw invalid(
      'Answer values must be strings, finite numbers, arrays of strings, or objects of strings as required by the question type.'
    );
  return parsed.data;
}
function questions(value: unknown, create: boolean) {
  const parsed = z.array(record).safeParse(value);
  if (!parsed.success || !parsed.data.length)
    throw invalid(
      'Provide at least one complete question. An empty questions array is not a valid survey.'
    );
  const ids = new Set<string>();
  return parsed.data.map(question => {
    const q = { ...question };
    if (create && q.id === undefined) q.id = `q-${randomUUID()}`;
    if (create && q.required === undefined) q.required = false;
    if (
      typeof q.id !== 'string' ||
      !/^[A-Za-z0-9_-]+$/.test(q.id) ||
      ids.has(q.id) ||
      ['end', 'start', 'hidden', 'variables'].includes(q.id)
    )
      throw invalid(
        'Each question needs a unique alphanumeric ID with optional hyphens or underscores. Keep existing IDs when updating.'
      );
    ids.add(q.id);
    if (
      typeof q.type !== 'string' ||
      ![
        'openText',
        'multipleChoiceSingle',
        'multipleChoiceMulti',
        'rating',
        'nps',
        'date',
        'matrix',
        'consent',
        'fileUpload',
        'ranking',
        'address',
        'cta',
        'contactInfo',
        'pictureSelection',
        'cal',
        'csat',
        'ces'
      ].includes(q.type) ||
      !z.record(z.string(), z.string()).safeParse(q.headline).success ||
      typeof q.required !== 'boolean'
    )
      throw invalid(
        'Each question needs its type, language-keyed headline, and required flag.'
      );
    if (Array.isArray(q.choices))
      q.choices = q.choices.map(choice => {
        const c = record.safeParse(choice);
        if (!c.success) throw invalid('Provide complete question choices.');
        return {
          ...c.data,
          ...(create && c.data.id === undefined ? { id: `choice-${randomUUID()}` } : {})
        };
      });
    const required: Record<string, string[]> = {
      rating: ['range', 'scale'],
      consent: ['label'],
      cta: ['buttonExternal'],
      date: ['format'],
      fileUpload: ['allowMultipleFiles'],
      matrix: ['rows', 'columns'],
      cal: ['calUserName'],
      address: ['addressLine1', 'addressLine2', 'city', 'state', 'zip', 'country'],
      contactInfo: ['firstName', 'lastName', 'email', 'phone', 'company']
    };
    for (const field of required[q.type] ?? [])
      if (q[field] === undefined)
        throw invalid(
          `Question type ${q.type} requires ${field}. Provide the documented question configuration.`
        );
    if (
      ['multipleChoiceSingle', 'multipleChoiceMulti', 'pictureSelection', 'ranking'].includes(
        q.type
      ) &&
      (!Array.isArray(q.choices) || q.choices.length < 2)
    )
      throw invalid('Choice questions require at least two choices.');
    return q;
  });
}
function surveyBody(data: Record<string, unknown>, create: boolean) {
  const body = pickDefined(data);
  if (typeof body.name === 'string' && !body.name.trim())
    throw invalid('Provide a nonempty survey name.');
  if (body.questions !== undefined) body.questions = questions(body.questions, create);
  if (body.redirectUrl !== undefined)
    throw invalid(
      'redirectUrl is not a current survey field. Configure a redirectToUrl ending with its ID and URL in endings.'
    );
  if (body.welcomeCard !== undefined) {
    const card = record.safeParse(body.welcomeCard);
    if (
      !card.success ||
      typeof card.data.enabled !== 'boolean' ||
      (card.data.enabled && !record.safeParse(card.data.headline).success)
    )
      throw invalid(
        'A welcome card needs an enabled flag and a language-keyed headline when enabled.'
      );
    if (card.data.html !== undefined)
      throw invalid(
        'welcomeCard.html is not a current field. Use a language-keyed subheader instead.'
      );
  }
  if (body.hiddenFields !== undefined) {
    const hidden = record.safeParse(body.hiddenFields);
    if (!hidden.success || typeof hidden.data.enabled !== 'boolean')
      throw invalid('hiddenFields needs an explicit enabled flag.');
  }
  if (body.endings !== undefined) {
    const endings = z.array(record).safeParse(body.endings);
    if (!endings.success) throw invalid('Provide complete ending configurations.');
    for (const ending of endings.data)
      if (!z.string().cuid2().safeParse(ending.id).success)
        throw invalid(
          'Each ending requires its documented CUID2 id. Preserve existing IDs when updating.'
        );
  }
  for (const key of ['autoClose', 'delay', 'autoComplete'])
    if (
      body[key] !== undefined &&
      (typeof body[key] !== 'number' ||
        !Number.isFinite(body[key]) ||
        Number(body[key]) < (key === 'autoComplete' ? 1 : 0))
    )
      throw invalid(
        'Survey timing must be nonnegative and the response limit must be at least one.'
      );
  if (!create && !Object.keys(body).length)
    throw invalid('Provide at least one survey property to update.');
  return body;
}
export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  private secrets: string[];
  constructor(params: { token: string; baseUrl?: unknown; instanceUrl?: string }) {
    if (
      !params.token ||
      params.token !== params.token.trim() ||
      [...params.token].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
    )
      throw invalid('Provide a valid Formbricks Management API key.');
    const origin = instanceUrl(params.instanceUrl ?? params.baseUrl);
    this.secrets = [
      params.token,
      encodeURIComponent(params.token),
      Buffer.from(params.token).toString('base64'),
      Buffer.from(params.token).toString('base64url'),
      [...Buffer.from(params.token)]
        .map(byte => `%${byte.toString(16).padStart(2, '0')}`)
        .join(''),
      [...Buffer.from(params.token)]
        .map(byte => `%${byte.toString(16).padStart(2, '0').toUpperCase()}`)
        .join('')
    ];
    this.http = createAuthenticatedAxios({
      baseURL: `${origin}/api/v1`,
      authHeader: { name: 'x-api-key', value: params.token },
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 8 * 1024 * 1024,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Formbricks',
          reason: 'formbricks_api_error',
          parent: {},
          extractMessage: () =>
            'Check the instance URL, single-workspace API key permissions, and documented required fields. For writes, read the exact resource before retrying.'
        })
    });
  }
  private protect(value: unknown) {
    let text: string;
    try {
      text = JSON.stringify(value);
    } catch {
      throw malformed();
    }
    if (
      typeof text !== 'string' ||
      text.length > 8 * 1024 * 1024 ||
      this.secrets.some(secret => secret && text.includes(secret))
    )
      throw malformed();
    const token = this.secrets[0];
    let decoded = text;
    for (let round = 0; round < 4; round++) {
      if (token && decoded.includes(token)) throw malformed();
      for (const match of decoded.matchAll(/[A-Za-z0-9+/_-]{8,}={0,2}/g))
        if (token && Buffer.from(match[0], 'base64').toString('utf8').includes(token))
          throw malformed();
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        break;
      }
    }
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    this.protect(value);
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw malformed();
    return parsed.data;
  }
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    schema: z.ZodType<T>,
    data?: Record<string, unknown>
  ) {
    this.protect(path);
    if (data !== undefined) this.protect(data);
    const response = await this.http.request<unknown>({
      method,
      url: path,
      ...(data === undefined ? {} : { data })
    });
    if (response.status !== 200 && !(method === 'post' && response.status === 201))
      throw malformed();
    return this.parse(z.object({ data: schema }), response.data).data;
  }
  private exact<T extends { id: string }>(value: T, id: string): T {
    if (value.id !== id) throw malformed();
    return value;
  }
  async getMe() {
    const response = await this.http.get<unknown>('/management/me');
    if (response.status !== 200) throw malformed();
    return this.parse(meSchema, response.data);
  }
  async listSurveys(params?: Paging) {
    const query = page(params);
    return this.request(
      'get',
      `/management/surveys${query.size ? `?${query}` : ''}`,
      z.array(surveySchema)
    );
  }
  async getSurvey(id: string) {
    const survey = this.exact(
      await this.request('get', `/management/surveys/${pathId(id)}`, surveySchema),
      id
    );
    targetId(survey);
    return survey;
  }
  async createSurvey(data: Record<string, unknown>) {
    const body = surveyBody(data, true);
    this.protect(body);
    pathId(body.environmentId);
    const me = await this.getMe();
    const canonical = me.workspace?.id ?? me.project.id;
    if (body.environmentId !== me.id && body.environmentId !== canonical)
      throw invalid(
        'The survey target must match the connected single workspace. Use get_account_info to discover the exact target.'
      );
    const value = await this.request('post', '/management/surveys', surveySchema, body);
    if (
      value.name !== body.name ||
      value.type !== body.type ||
      value.status !== body.status ||
      ![canonical, me.id].includes(targetId(value))
    )
      throw malformed();
    return value;
  }
  async updateSurvey(id: string, data: Record<string, unknown>) {
    const body = surveyBody(data, false);
    const value = this.exact(
      await this.request('put', `/management/surveys/${pathId(id)}`, surveySchema, body),
      id
    );
    for (const field of ['name', 'status', 'displayOption'])
      if (body[field] !== undefined && value[field] !== body[field]) throw malformed();
    return value;
  }
  async deleteSurvey(id: string) {
    return this.exact(
      await this.request('delete', `/management/surveys/${pathId(id)}`, surveySchema),
      id
    );
  }
  async listResponses(id: string, params?: Paging) {
    pathId(id);
    const query = page(params, 'skip');
    query.set('surveyId', id);
    const values = await this.request(
      'get',
      `/management/responses?${query}`,
      z.array(responseSchema)
    );
    if (values.some(value => value.surveyId !== id)) throw malformed();
    return values;
  }
  async getResponse(id: string) {
    return this.exact(
      await this.request('get', `/management/responses/${pathId(id)}`, responseSchema),
      id
    );
  }
  async createResponse(data: Record<string, unknown>) {
    const body = pickDefined(data);
    this.protect(body);
    pathId(body.surveyId);
    body.data = answerData(body.data);
    const survey = await this.getSurvey(String(body.surveyId));
    if (survey.workspaceId !== undefined) body.workspaceId = survey.workspaceId;
    else body.environmentId = targetId(survey);
    const value = await this.request('post', '/management/responses', responseSchema, body);
    if (value.surveyId !== body.surveyId || value.finished !== body.finished)
      throw malformed();
    return value;
  }
  async updateResponse(id: string, data: Record<string, unknown>) {
    const body = pickDefined(data);
    if (!Object.keys(body).length)
      throw invalid('Provide answers or finished to update the response.');
    if (body.data !== undefined) body.data = answerData(body.data);
    const value = this.exact(
      await this.request('put', `/management/responses/${pathId(id)}`, responseSchema, body),
      id
    );
    if (body.finished !== undefined && value.finished !== body.finished) throw malformed();
    return value;
  }
  async deleteResponse(id: string) {
    return this.exact(
      await this.request('delete', `/management/responses/${pathId(id)}`, responseSchema),
      id
    );
  }
  async listContacts(params?: Paging) {
    page(params);
    const values = await this.request('get', '/management/contacts', z.array(contactSchema));
    const start = params?.offset ?? 0;
    return values.slice(start, params?.limit === undefined ? undefined : start + params.limit);
  }
  async getContact(id: string) {
    return this.exact(
      await this.request('get', `/management/contacts/${pathId(id)}`, contactSchema),
      id
    );
  }
  async listActionClasses() {
    return this.request('get', '/management/action-classes', z.array(actionSchema));
  }
  async createActionClass(data: Record<string, unknown>) {
    const body = pickDefined(data);
    this.protect(body);
    pathId(body.environmentId);
    if (body.type === 'code' && body.noCodeConfig !== undefined)
      throw invalid(
        'noCodeConfig is only supported for noCode actions. Omit it for a code action.'
      );
    if (body.type === 'noCode' && body.key !== undefined)
      throw invalid('key is only supported for code actions. Omit it for a noCode action.');
    if (body.type === 'automatic')
      throw invalid(
        'Automatic actions cannot be created with the current Management API. Use code with key, or noCode with noCodeConfig.'
      );
    if (body.type === 'code' && (typeof body.key !== 'string' || !body.key.trim()))
      throw invalid('A code action requires a nonempty key.');
    if (body.type === 'noCode') {
      const parsed = record.safeParse(body.noCodeConfig);
      if (
        !parsed.success ||
        !['click', 'pageView', 'exitIntent', 'fiftyPercentScroll', 'pageDwell'].includes(
          String(parsed.data.type)
        ) ||
        !Array.isArray(parsed.data.urlFilters)
      )
        throw invalid('A noCode action requires its documented type and urlFilters.');
      if (parsed.data.type === 'click') {
        const selector = record.safeParse(parsed.data.elementSelector);
        if (!selector.success || (!selector.data.cssSelector && !selector.data.innerHtml))
          throw invalid('A click action needs elementSelector.cssSelector or innerHtml.');
      }
      if (
        parsed.data.type === 'pageDwell' &&
        (!Number.isInteger(parsed.data.timeInSeconds) ||
          Number(parsed.data.timeInSeconds) < 1 ||
          Number(parsed.data.timeInSeconds) > 3600)
      )
        throw invalid('A pageDwell action needs timeInSeconds between 1 and 3600.');
    }
    const me = await this.getMe();
    const canonical = me.workspace?.id ?? me.project.id;
    if (body.environmentId !== me.id && body.environmentId !== canonical)
      throw invalid(
        'The action target must match the connected single workspace. Use get_account_info to discover the exact target.'
      );
    const value = await this.request('post', '/management/action-classes', actionSchema, body);
    if (
      value.name !== body.name ||
      value.type !== body.type ||
      (body.key !== undefined && value.key !== body.key) ||
      ![canonical, me.id].includes(targetId(value))
    )
      throw malformed();
    return value;
  }
  async deleteActionClass(id: string) {
    return this.exact(
      await this.request('delete', `/management/action-classes/${pathId(id)}`, actionSchema),
      id
    );
  }
  async listContactAttributeKeys() {
    return this.request(
      'get',
      '/management/contact-attribute-keys',
      z.array(attributeKeySchema)
    );
  }
}
