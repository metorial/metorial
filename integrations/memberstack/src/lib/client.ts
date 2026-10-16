import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { dataRecordSchema, type Member, memberSchema, tokenVerificationSchema } from './types';

let malformed = (message: string) =>
  createApiServiceError(`Memberstack returned ${message}.`, {
    reason: 'memberstack_invalid_response'
  });

let requireRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isApiErrorRecord(value)) throw malformed(`an invalid ${label}`);
  return value;
};

let requireIdentifier = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} must not be empty.`);
  return encodeURIComponent(value);
};

// Non-nullable optional summaries omit nulls; the complete provider value stays in raw.
let optionalSummaries = (raw: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    keys.filter(key => raw[key] !== undefined && raw[key] !== null).map(key => [key, raw[key]])
  );

let normalizeMember = (value: unknown): Member => {
  let raw = requireRecord(value, 'member');
  let candidate: Record<string, unknown> = {
    ...raw,
    memberId: raw.id,
    ...optionalSummaries(raw, [
      'verified',
      'createdAt',
      'customFields',
      'metaData',
      'permissions',
      'planConnections',
      'teams'
    ]),
    raw
  };
  if (isApiErrorRecord(raw.auth)) {
    candidate.auth = {
      email: raw.auth.email,
      ...optionalSummaries(raw.auth, ['hasPassword', 'providers'])
    };
  }
  // The official SDK also permits bare plan-connection IDs. Keep those in raw
  // rather than inventing object fields for the existing object-array summary.
  if (
    Array.isArray(raw.planConnections) &&
    raw.planConnections.some(item => typeof item === 'string')
  ) {
    candidate.planConnections = undefined;
  } else if (Array.isArray(raw.planConnections)) {
    candidate.planConnections = raw.planConnections.map(value => {
      let connection = requireRecord(value, 'plan connection');
      let payment = connection.payment;
      if (isApiErrorRecord(payment)) {
        let normalizedPayment = { ...payment };
        for (let key of ['amount', 'currency', 'status']) {
          if (normalizedPayment[key] === null) normalizedPayment[key] = undefined;
        }
        payment = normalizedPayment;
      }
      return {
        id: connection.id,
        ...optionalSummaries(connection, ['active', 'status', 'planId', 'planName', 'type']),
        ...(payment === undefined ? {} : { payment })
      };
    });
  }
  for (let key of [
    'verified',
    'createdAt',
    'customFields',
    'metaData',
    'permissions',
    'planConnections',
    'teams'
  ]) {
    if (raw[key] === null) candidate[key] = undefined;
  }
  let result = memberSchema.safeParse(candidate);
  if (!result.success || !result.data.memberId.trim() || !result.data.auth.email.trim()) {
    throw malformed('a member without valid member ID, email, or member fields');
  }
  return result.data;
};

export interface ListMembersParams {
  after?: number;
  limit?: number;
  order?: 'ASC' | 'DESC';
  includeJSON?: boolean;
}

export interface ListMembersResponse {
  totalCount: number;
  endCursor: number | null;
  hasMore: boolean;
  members: Member[];
  raw?: Record<string, unknown>;
}

export interface CreateMemberParams {
  email: string;
  password?: string;
  plans?: { planId: string }[];
  customFields?: Record<string, unknown>;
  metaData?: Record<string, unknown>;
  json?: unknown;
  loginRedirect?: string;
}

export interface UpdateMemberParams {
  email?: string;
  password?: string;
  customFields?: Record<string, unknown>;
  metaData?: Record<string, unknown>;
  json?: unknown;
  loginRedirect?: string;
  verified?: boolean;
  profileImage?: string;
}

export interface DeleteMemberParams {
  deleteStripeCustomer?: boolean;
  cancelStripeSubscriptions?: boolean;
}

export interface DataQueryParams {
  mode: 'many' | 'unique' | 'count';
  recordId?: string;
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  take?: number;
  skip?: number;
  after?: string | number;
}

export class Client {
  private api;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Memberstack secret API key is required.');
    this.api = createAuthenticatedAxios({
      baseURL: 'https://admin.memberstack.com',
      timeout: 30_000,
      headers: { 'X-API-KEY': config.token, Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Memberstack',
          reason: 'memberstack_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
          extractUpstreamCode: (_error, response) => {
            let body = response?.data;
            if (!isApiErrorRecord(body)) return undefined;
            let detail = isApiErrorRecord(body.error) ? body.error : body;
            return typeof detail.code === 'string' ? detail.code : undefined;
          }
        })
    });
    this.api.interceptors.response.use(response => {
      let body: unknown = response.data;
      if (isApiErrorRecord(body) && body.error) {
        throw buildApiServiceError(
          { response: { status: response.status, data: body } },
          {
            providerLabel: 'Memberstack',
            reason: 'memberstack_api_error',
            extractUpstreamCode: () => {
              let detail = isApiErrorRecord(body.error) ? body.error : body;
              return typeof detail.code === 'string' ? detail.code : undefined;
            }
          }
        );
      }
      return response;
    });
  }

  async listMembers(params: ListMembersParams = {}): Promise<ListMembersResponse> {
    let response = await this.api.get('/members', {
      params: {
        ...pickDefined(params),
        includeJSON: params.includeJSON === undefined ? undefined : String(params.includeJSON)
      }
    });
    let raw = requireRecord(response.data, 'member list');
    let hasMore = typeof raw.hasNextPage === 'boolean' ? raw.hasNextPage : raw.hasMore;
    if (
      typeof raw.totalCount !== 'number' ||
      !Number.isFinite(raw.totalCount) ||
      (raw.endCursor !== null &&
        (typeof raw.endCursor !== 'number' || !Number.isFinite(raw.endCursor))) ||
      typeof hasMore !== 'boolean' ||
      !Array.isArray(raw.data)
    ) {
      throw malformed('an invalid member list or pagination metadata');
    }
    return {
      totalCount: raw.totalCount,
      endCursor: raw.endCursor,
      hasMore,
      members: raw.data.map(normalizeMember),
      raw
    };
  }

  async getMember(idOrEmail: string, includeTeams?: boolean): Promise<Member> {
    let response = await this.api.get(
      `/members/${requireIdentifier(idOrEmail, 'Member ID or email')}`,
      {
        params: includeTeams ? { include: 'teams' } : undefined
      }
    );
    let envelope = requireRecord(response.data, 'member response');
    if (envelope.data === null) {
      throw createApiServiceError('No Memberstack member matches that ID or email.', {
        reason: 'memberstack_member_not_found'
      });
    }
    return normalizeMember(envelope.data);
  }

  async createMember(params: CreateMemberParams): Promise<Member> {
    requireIdentifier(params.email, 'Email');
    let response = await this.api.post('/members', pickDefined(params));
    return normalizeMember(requireRecord(response.data, 'member response').data);
  }

  async updateMember(memberId: string, params: UpdateMemberParams): Promise<Member> {
    let id = requireIdentifier(memberId, 'Member ID');
    let data = pickDefined(params);
    if (Object.keys(data).length === 0)
      throw createApiServiceError('Provide at least one member field to update.');
    let response = await this.api.patch(`/members/${id}`, data);
    return normalizeMember(requireRecord(response.data, 'member response').data);
  }

  async deleteMember(memberId: string, params: DeleteMemberParams = {}) {
    let response = await this.api.delete(
      `/members/${requireIdentifier(memberId, 'Member ID')}`,
      { data: pickDefined(params) }
    );
    let raw = requireRecord(response.data, 'deletion response');
    let data = requireRecord(raw.data, 'deleted member');
    if (typeof data.id !== 'string' || !data.id.trim())
      throw malformed('a deleted member without an ID');
    return { memberId: data.id, raw };
  }

  private async changePlan(memberId: string, planId: string, action: 'add' | 'remove') {
    let id = requireIdentifier(memberId, 'Member ID');
    requireIdentifier(planId, 'Plan ID');
    let response = await this.api.post(`/members/${id}/${action}-plan`, { planId });
    let planChangeResponse: unknown = response.data;
    // Current routes acknowledge with plain-text OK (SDK) or no body (REST docs).
    // A separate read preserves this tool's existing member-object output contract.
    try {
      return { ...(await this.getMember(memberId)), planChangeResponse };
    } catch (error) {
      throw createApiServiceError(
        'Memberstack accepted the plan change, but the follow-up member read failed. The change was not rolled back. Retrieve the member to confirm the current state before repeating the change.',
        { reason: 'memberstack_plan_read_failed', parent: error }
      );
    }
  }

  async addPlanToMember(memberId: string, planId: string) {
    return this.changePlan(memberId, planId, 'add');
  }

  async removePlanFromMember(memberId: string, planId: string) {
    return this.changePlan(memberId, planId, 'remove');
  }

  async verifyToken(token: string) {
    requireIdentifier(token, 'Member token');
    let response = await this.api.post('/members/verify-token', { token });
    let raw = requireRecord(
      requireRecord(response.data, 'token response').data,
      'token claims'
    );
    let result = tokenVerificationSchema.safeParse({
      memberId: raw.id,
      ...optionalSummaries(
        {
          type: raw.type,
          issuedAt: raw.iat,
          expiresAt: raw.exp,
          audience: raw.aud,
          issuer: raw.iss
        },
        ['type', 'issuedAt', 'expiresAt', 'audience', 'issuer']
      ),
      raw
    });
    if (!result.success || !result.data.memberId.trim())
      throw malformed('invalid token claims or a missing member ID');
    return result.data;
  }

  async listDataTables() {
    let response = await this.api.get('/v2/data-tables');
    let raw = requireRecord(response.data, 'data table list response');
    let data = requireRecord(raw.data, 'data table list');
    if (!Array.isArray(data.tables) || !data.tables.every(isApiErrorRecord))
      throw malformed('an invalid data table list');
    return { tables: data.tables, raw };
  }

  async getDataTable(tableKey: string) {
    let response = await this.api.get(
      `/v2/data-tables/${requireIdentifier(tableKey, 'Table key or ID')}`
    );
    let raw = requireRecord(response.data, 'data table response');
    return { table: requireRecord(raw.data, 'data table'), raw };
  }

  async manageDataRecord(
    tableKey: string,
    action: 'create' | 'update' | 'delete',
    params: {
      recordId?: string;
      data?: Record<string, unknown>;
      memberId?: string;
    }
  ) {
    let path = `/v2/data-tables/${requireIdentifier(tableKey, 'Table key or ID')}/records`;
    if (action !== 'create') {
      if (!params.recordId)
        throw createApiServiceError(`recordId is required to ${action} a data record.`);
      path += `/${requireIdentifier(params.recordId, 'Record ID')}`;
    } else if (params.recordId !== undefined) {
      throw createApiServiceError(
        'Do not supply recordId when creating a record; Memberstack generates it.'
      );
    }
    if (action !== 'create' && params.memberId !== undefined)
      throw createApiServiceError('memberId can only be assigned when creating a record.');
    if (action === 'delete' && params.data !== undefined)
      throw createApiServiceError('Do not supply data when deleting a record.');
    if (
      action !== 'delete' &&
      (!params.data || (action === 'update' && Object.keys(params.data).length === 0))
    ) {
      throw createApiServiceError(
        `Provide ${action === 'update' ? 'a non-empty' : 'a'} data object to ${action} a record.`
      );
    }
    if (params.memberId !== undefined) requireIdentifier(params.memberId, 'Member owner ID');
    let response =
      action === 'create'
        ? await this.api.post(
            path,
            pickDefined({ data: params.data, memberId: params.memberId })
          )
        : action === 'update'
          ? await this.api.put(path, { data: params.data })
          : await this.api.delete(path);
    let raw = requireRecord(response.data, 'data record response');
    let data = requireRecord(raw.data, 'data record');
    let parsed = dataRecordSchema.safeParse({
      id: data.id,
      data: data.data,
      ...optionalSummaries(data, ['tableKey', 'createdAt', 'updatedAt', 'internalOrder']),
      ...(data.createdByMemberId === undefined
        ? {}
        : { createdByMemberId: data.createdByMemberId }),
      raw: data
    });
    if (!parsed.success || !parsed.data.id.trim()) throw malformed('an invalid data record');
    return { record: parsed.data, raw };
  }

  async queryDataRecords(tableKey: string, params: DataQueryParams) {
    if (params.include && params.select)
      throw createApiServiceError('Use either include or select, not both.');
    if (
      params.mode === 'unique' &&
      (params.where ||
        params.take !== undefined ||
        params.skip !== undefined ||
        params.after !== undefined ||
        params.orderBy ||
        params.recordId === undefined)
    ) {
      throw createApiServiceError(
        'Unique queries require recordId and do not accept where, take, skip, after, or orderBy.'
      );
    }
    if (params.mode !== 'unique' && params.recordId !== undefined)
      throw createApiServiceError('recordId is only used for unique queries.');
    if (params.skip !== undefined && params.after !== undefined)
      throw createApiServiceError('Use either skip or after, not both.');
    if (
      params.after !== undefined &&
      (typeof params.orderBy !== 'object' ||
        Array.isArray(params.orderBy) ||
        params.orderBy === null ||
        Object.keys(params.orderBy).length !== 1 ||
        params.orderBy.internalOrder !== 'asc')
    ) {
      throw createApiServiceError(
        'Cursor queries require orderBy: { internalOrder: "asc" } on every page.'
      );
    }
    if (params.mode === 'count' && (params.include || params.select))
      throw createApiServiceError('Count queries do not support include or select.');
    if (params.mode === 'unique') requireIdentifier(params.recordId ?? '', 'Record ID');
    let options =
      params.mode === 'unique'
        ? pickDefined({
            where: { id: params.recordId },
            include: params.include,
            select: params.select
          })
        : pickDefined({
            where: params.where,
            include: params.include,
            select: params.select,
            orderBy: params.orderBy,
            take: params.take,
            skip: params.skip,
            after: params.after,
            _count: params.mode === 'count' ? true : undefined
          });
    let response = await this.api.post(
      `/v2/data-tables/${requireIdentifier(tableKey, 'Table key or ID')}/records/query`,
      {
        query: { [params.mode === 'unique' ? 'findUnique' : 'findMany']: options }
      }
    );
    let raw = requireRecord(response.data, 'data query response');
    return { result: requireRecord(raw.data, 'data query result'), raw };
  }
}
