import { createAuthenticatedAxios, pickDefined, requestAxios } from 'slates';
import {
  boolean,
  count,
  credential,
  dateInput,
  id,
  incomplete,
  integer,
  nonempty,
  optionalText,
  protect,
  type Row,
  reject,
  row,
  rows,
  text,
  timestamp,
  upstream
} from './contracts';
export const API_VERSION = '2026-08-04';
export interface TallyBlock extends Row {
  uuid: string;
  type: string;
  groupUuid: string;
  groupType: string;
  payload: Row;
}
export interface TallyForm {
  id: string;
  name: string;
  workspaceId: string | null;
  status: string;
  numberOfSubmissions: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface TallyFormDetail extends TallyForm {
  blocks: TallyBlock[];
  settings: Row;
}
export interface TallyWorkspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
export interface TallyUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
}
export interface TallyQuestion {
  key: string;
  label: string;
  type: string;
}
export interface TallyField extends TallyQuestion {
  value: unknown;
}
export interface TallySubmission {
  submissionId: string;
  respondentId?: string;
  formId: string;
  formName: string;
  createdAt: string;
  fields: TallyField[];
  isCompleted: boolean;
  native: Row;
}
export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  hasMore: boolean;
  total: number;
  items: T[];
}
export interface ListFormsParams {
  page?: number;
  limit?: number;
  workspaceId?: string;
  workspaceIds?: string[];
}
export interface ListSubmissionsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  afterId?: string;
  filter?: 'all' | 'completed' | 'partial';
}
export interface CreateFormParams {
  status?: string;
  workspaceId?: string;
  blocks?: TallyBlock[];
  settings?: Row;
}
export interface UpdateFormParams {
  name?: string;
  status?: string;
  blocks?: TallyBlock[];
  settings?: Row;
}
const form = (value: unknown): TallyForm => {
  const data = row(value);
  return {
    id: id(data.id),
    name: text(data.name),
    workspaceId: data.workspaceId === null ? null : id(data.workspaceId),
    status: nonempty(data.status),
    numberOfSubmissions: count(data.numberOfSubmissions),
    isClosed: boolean(data.isClosed),
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt)
  };
};
const workspace = (value: unknown): TallyWorkspace => {
  const data = row(value);
  return {
    id: id(data.id),
    name: text(data.name),
    createdAt: timestamp(data.createdAt),
    updatedAt: timestamp(data.updatedAt)
  };
};
const block = (value: unknown): TallyBlock => {
  const data = row(value);
  return {
    ...data,
    uuid: id(data.uuid),
    type: nonempty(data.type),
    groupUuid: id(data.groupUuid),
    groupType: nonempty(data.groupType),
    payload: row(data.payload)
  };
};
const validateBlocks = (value: unknown): TallyBlock[] => {
  const values = rows(value).map(block);
  const seen = new Set<string>();
  for (const item of values) {
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.uuid) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.groupUuid)
    )
      reject('Each block and group needs a valid UUID.');
    if (seen.has(item.uuid)) reject('Block UUIDs must be unique.');
    seen.add(item.uuid);
  }
  return values;
};
const page = <T>(value: unknown, map: (item: unknown) => T): PaginatedResponse<T> => {
  const data = row(value);
  const items = rows(data.items).map(map);
  const current = integer(data.page),
    limit = integer(data.limit),
    total = count(data.total);
  if (items.length > limit) incomplete();
  return { page: current, limit, total, hasMore: boolean(data.hasMore), items };
};
export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;
  constructor(config: { token: string }) {
    this.token = credential(config.token);
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.tally.so',
      authHeader: { value: `Bearer ${this.token}` },
      headers: { 'tally-version': API_VERSION },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: Row,
    accepted = [200]
  ) {
    protect({ path, data, params }, { token: this.token });
    const response = await requestAxios(
      'Tally API request',
      () =>
        this.axios.request<unknown>({
          method,
          url: path,
          data: data === undefined ? undefined : pickDefined(row(data)),
          params: params ? pickDefined(params) : undefined,
          paramsSerializer: { indexes: null }
        }),
      upstream
    );
    if (!accepted.includes(response.status)) incomplete();
    protect(response.data, { token: this.token });
    return response.data;
  }
  async listForms(params: ListFormsParams = {}) {
    if (params.workspaceId !== undefined && params.workspaceIds !== undefined)
      reject('Use workspaceId or workspaceIds, not both.');
    const ids =
      params.workspaceIds ??
      (params.workspaceId === undefined ? undefined : [params.workspaceId]);
    if (ids && (!ids.length || new Set(ids).size !== ids.length))
      reject('Provide distinct workspace IDs.');
    const current = integer(params.page ?? 1),
      limit = integer(params.limit ?? 50, 1, 500);
    const result = page(
      await this.request('get', '/forms', undefined, {
        page: current,
        limit,
        workspaceIds: ids?.map(id)
      }),
      form
    );
    if (result.page !== current || result.limit !== limit) incomplete();
    if (
      new Set(result.items.map(item => item.id)).size !== result.items.length ||
      (ids && result.items.some(item => !ids.includes(item.workspaceId ?? '')))
    )
      incomplete();
    return result;
  }
  async getForm(formId: string): Promise<TallyFormDetail> {
    const data = row(await this.request('get', `/forms/${encodeURIComponent(id(formId))}`));
    const result = form(data);
    if (result.id !== formId) incomplete();
    return { ...result, blocks: rows(data.blocks).map(block), settings: row(data.settings) };
  }
  async createForm(params: CreateFormParams) {
    const status = params.status ?? 'DRAFT';
    if (!['DRAFT', 'PUBLISHED', 'BLANK'].includes(status))
      reject('Choose a documented form status.');
    const data = row(
      await this.request(
        'post',
        '/forms',
        {
          ...params,
          status,
          blocks: validateBlocks(params.blocks ?? []),
          workspaceId: params.workspaceId === undefined ? undefined : id(params.workspaceId),
          settings: params.settings === undefined ? undefined : row(params.settings)
        },
        undefined,
        [201]
      )
    );
    if (
      data.status !== status ||
      (params.workspaceId !== undefined && data.workspaceId !== params.workspaceId)
    )
      incomplete();
    return {
      id: id(data.id),
      name: text(data.name),
      status: nonempty(data.status),
      createdAt: timestamp(data.createdAt),
      updatedAt: timestamp(data.updatedAt)
    };
  }
  async updateForm(formId: string, params: UpdateFormParams) {
    if (!Object.values(params).some(value => value !== undefined))
      reject('Provide at least one form change.');
    if (
      params.status !== undefined &&
      !['DRAFT', 'PUBLISHED', 'BLANK'].includes(params.status)
    )
      reject('Choose a documented form status.');
    const before = await this.getForm(formId);
    const content = {
      ...params,
      blocks: params.blocks === undefined ? undefined : validateBlocks(params.blocks),
      settings:
        params.settings === undefined
          ? undefined
          : { ...before.settings, ...row(params.settings) }
    };
    const result = row(
      await this.request('patch', `/forms/${encodeURIComponent(id(formId))}`, content)
    );
    if (result.id !== formId) incomplete();
  }
  async deleteForm(formId: string) {
    await this.getForm(formId);
    await this.request(
      'delete',
      `/forms/${encodeURIComponent(id(formId))}`,
      undefined,
      undefined,
      [204]
    );
  }
  private questions(value: unknown, formId: string) {
    const values = rows(value);
    const result = values.map(item => {
      if (item.formId !== formId) incomplete();
      return { key: id(item.id), label: text(item.title), type: nonempty(item.type) };
    });
    if (new Set(result.map(item => item.key)).size !== result.length) incomplete();
    return result;
  }
  private submission(
    value: unknown,
    questions: TallyQuestion[],
    parent: TallyForm
  ): TallySubmission {
    const data = row(value);
    if (data.formId !== parent.id) incomplete();
    const submissionId = id(data.id),
      responses = rows(data.responses);
    const respondentIds = new Set<string>();
    const used = new Set<string>();
    const fields = responses.map(response => {
      if (
        response.formId !== parent.id ||
        (response.submissionId !== undefined &&
          response.submissionId !== null &&
          response.submissionId !== submissionId)
      )
        incomplete();
      const key = id(response.questionId),
        responseId = id(response.id);
      const question = questions.find(item => item.key === key);
      if (!question) return incomplete();
      if (used.has(responseId) || !Object.hasOwn(response, 'answer')) incomplete();
      used.add(responseId);
      respondentIds.add(id(response.respondentId));
      return { ...question, value: response.answer };
    });
    if (respondentIds.size > 1) incomplete();
    return {
      submissionId,
      respondentId: [...respondentIds][0],
      formId: parent.id,
      formName: parent.name,
      createdAt: timestamp(data.createdAt),
      fields,
      isCompleted: boolean(data.isCompleted),
      native: data
    };
  }
  async listSubmissions(formId: string, params: ListSubmissionsParams = {}) {
    id(formId);
    if (params.startDate !== undefined) dateInput(params.startDate);
    if (params.endDate !== undefined) dateInput(params.endDate);
    if (
      params.startDate &&
      params.endDate &&
      Date.parse(params.startDate) > Date.parse(params.endDate)
    )
      reject('startDate must not follow endDate.');
    const filter = params.filter ?? 'all';
    if (!['all', 'completed', 'partial'].includes(filter))
      reject('Choose all, completed or partial submissions.');
    const current = integer(params.page ?? 1),
      limit = integer(params.limit ?? 50, 1, 500);
    const data = row(
      await this.request(
        'get',
        `/forms/${encodeURIComponent(formId)}/submissions`,
        undefined,
        {
          ...params,
          page: current,
          limit,
          filter,
          afterId: params.afterId === undefined ? undefined : id(params.afterId)
        }
      )
    );
    const parent = await this.getForm(formId);
    const questions = this.questions(data.questions, formId),
      items = rows(data.submissions).map(item => this.submission(item, questions, parent));
    if (
      integer(data.page) !== current ||
      integer(data.limit, 1, 500) !== limit ||
      items.length > limit ||
      new Set(items.map(item => item.submissionId)).size !== items.length
    )
      incomplete();
    const totals = row(data.totalNumberOfSubmissionsPerFilter);
    const totalNumberOfSubmissionsPerFilter = count(totals[filter]);
    if (
      items.some(item =>
        filter === 'completed'
          ? !item.isCompleted
          : filter === 'partial'
            ? item.isCompleted
            : false
      )
    )
      incomplete();
    return {
      page: current,
      limit,
      hasMore: boolean(data.hasMore),
      totalNumberOfSubmissionsPerFilter,
      questions,
      items
    };
  }
  async getSubmission(formId: string, submissionId: string) {
    const data = row(
      await this.request(
        'get',
        `/forms/${encodeURIComponent(id(formId))}/submissions/${encodeURIComponent(id(submissionId))}`
      )
    );
    const parent = await this.getForm(formId);
    const questions = this.questions(data.questions, formId),
      result = this.submission(data.submission, questions, parent);
    if (result.submissionId !== submissionId) incomplete();
    return { ...result, questions };
  }
  async deleteSubmission(formId: string, submissionId: string) {
    await this.getSubmission(formId, submissionId);
    await this.request(
      'delete',
      `/forms/${encodeURIComponent(id(formId))}/submissions/${encodeURIComponent(id(submissionId))}`,
      undefined,
      undefined,
      [204]
    );
  }
  async listQuestions(formId: string) {
    const data = row(
      await this.request('get', `/forms/${encodeURIComponent(id(formId))}/questions`)
    );
    return this.questions(data.questions, formId);
  }
  async listWorkspaces(current = 1) {
    const result = page(
      await this.request('get', '/workspaces', undefined, { page: integer(current) }),
      workspace
    );
    if (
      result.page !== current ||
      new Set(result.items.map(item => item.id)).size !== result.items.length
    )
      incomplete();
    return result;
  }
  async getWorkspace(workspaceId: string) {
    const result = workspace(
      await this.request('get', `/workspaces/${encodeURIComponent(id(workspaceId))}`)
    );
    if (result.id !== workspaceId) incomplete();
    return result;
  }
  async createWorkspace(params: { name: string }) {
    if (!params.name.trim()) reject('Provide a nonempty workspace name.');
    const result = workspace(
      await this.request('post', '/workspaces', params, undefined, [201])
    );
    if (result.name !== params.name) incomplete();
    return result;
  }
  async deleteWorkspace(workspaceId: string) {
    await this.getWorkspace(workspaceId);
    await this.request(
      'delete',
      `/workspaces/${encodeURIComponent(id(workspaceId))}`,
      undefined,
      undefined,
      [204]
    );
  }
  async getCurrentUser(): Promise<TallyUser> {
    const data = row(await this.request('get', '/users/me'));
    return { id: id(data.id), email: nonempty(data.email), name: optionalText(data.fullName) };
  }
}
