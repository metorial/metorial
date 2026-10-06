import { isDeepStrictEqual } from 'node:util';
import { buildApiServiceError, createApiServiceError, requestAxios } from 'slates';
import { z } from 'zod';
import {
  type associationSchema,
  bound,
  collectionSchema,
  eventSchema,
  fail,
  groupSchema,
  ids,
  legacyAccess,
  memberSchema,
  parse,
  permissionsSchema,
  policySchema,
  policyType,
  requireVisible,
  role,
  text,
  uuid
} from './contracts';
import { apiHosts, guard, http, token } from './http';

type Association = z.infer<typeof associationSchema>;
type GroupInput = {
  name: string;
  accessAll: boolean;
  externalId?: string | null;
  collections?: Association[];
  memberIds?: string[];
};
type MemberInput = {
  type: number;
  accessAll: boolean;
  externalId?: string | null;
  collections?: Association[];
  groupIds?: string[];
  permissions?: z.infer<typeof permissionsSchema>;
};
type EventQuery = {
  start?: string;
  end?: string;
  actingUserId?: string;
  itemId?: string;
  continuationToken?: string;
};
function associations(input: Association[], previous: Association[] = []) {
  ids(input.map(a => a.id));
  return input.map(value => {
    const current = previous.find(p => uuid(p.id) === uuid(value.id));
    return {
      id: uuid(value.id),
      readOnly: value.readOnly,
      hidePasswords: value.hidePasswords ?? current?.hidePasswords ?? false,
      manage: value.manage ?? current?.manage ?? false
    };
  });
}
function needsPrevious(input: Association[] | undefined) {
  return (
    input === undefined ||
    input.some(value => value.hidePasswords == null || value.manage == null)
  );
}
function sameAssociations(actual: Association[] | undefined, expected: Association[]) {
  if (actual === undefined) return false;
  const canonical = (values: Association[]) =>
    values
      .map(value => ({
        id: uuid(value.id),
        readOnly: value.readOnly,
        hidePasswords: value.hidePasswords ?? false,
        manage: value.manage ?? false
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  return isDeepStrictEqual(canonical(actual), canonical(expected));
}
function receipt(matches: boolean, kind: string, id: string) {
  uuid(id);
  if (!matches)
    fail(
      `Bitwarden returned a ${kind} receipt that does not match the requested state. Reconcile ${kind} ${id} before retrying; no dependent change was sent.`
    );
}
function groupReceipt(
  result: z.infer<typeof groupSchema>,
  body: { name: string; externalId: string | null; collections: Association[] }
) {
  receipt(
    result.name === body.name &&
      result.externalId === body.externalId &&
      sameAssociations(result.collections, body.collections),
    'group',
    result.id
  );
}
function memberReceipt(
  result: z.infer<typeof memberSchema>,
  body: {
    type: number;
    externalId: string | null;
    collections: Association[];
    permissions?: z.infer<typeof permissionsSchema>;
  },
  email: string
) {
  receipt(
    result.email.toLowerCase() === email.toLowerCase() &&
      result.type === body.type &&
      result.externalId === body.externalId &&
      sameAssociations(result.collections, body.collections) &&
      (!body.permissions ||
        (result.permissions != null &&
          Object.keys(permissionsSchema.shape).every(
            key =>
              (result.permissions?.[key as keyof typeof result.permissions] ?? false) ===
              (body.permissions?.[key as keyof typeof body.permissions] ?? false)
          ))),
    'member',
    result.id
  );
}
function partial(kind: string, id: string): never {
  throw createApiServiceError(
    `The ${kind} ${id} change was acknowledged, but its member-association stage or readback failed. Reconcile that exact resource before retrying; no automatic rollback was attempted.`,
    { reason: 'bitwarden_partial_effect' }
  );
}
export class Client {
  private readonly transport: ReturnType<typeof http>;
  private readonly credential: string;
  constructor(config: { token: string; serverUrl: string; expiresAt?: string }) {
    this.credential = token(config.token);
    if (!apiHosts.includes(config.serverUrl as (typeof apiHosts)[number]))
      fail('Reconnect with the organization US or EU cloud region.');
    if (
      config.expiresAt &&
      (!Number.isFinite(Date.parse(config.expiresAt)) ||
        Date.parse(config.expiresAt) <= Date.now())
    )
      fail('The organization access token expired. Renew the connection before continuing.');
    this.transport = http(config.serverUrl, [this.credential], this.credential);
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: unknown,
    params?: EventQuery
  ) {
    guard({ data, params }, [this.credential]);
    const response = await requestAxios(
      'organization request',
      () =>
        this.transport.request({
          method,
          url: `/public${path}`,
          ...(data !== undefined ? { data } : {}),
          ...(params ? { params } : {})
        }),
      error =>
        buildApiServiceError(error, {
          providerLabel: 'Bitwarden',
          reason: 'bitwarden_request',
          operation: 'organization request',
          parent: {},
          extractMessage: () =>
            'The organization request failed. Check authorization and reconcile any uncertain mutation before retrying.'
        })
    );
    return response.data as unknown;
  }
  private async empty(method: 'post' | 'put' | 'delete', path: string, data?: unknown) {
    const result = await this.request(method, path, data);
    if (result !== '' && result !== undefined)
      fail(
        'Bitwarden returned an unexpected mutation receipt. Reconcile the exact resource before retrying; no success was inferred.'
      );
  }
  private async list<T extends { id: string }>(
    path: string,
    schema: z.ZodType<T>
  ): Promise<T[]> {
    const raw = parse(
      z.object({
        object: z.literal('list'),
        data: z.array(z.unknown()),
        continuationToken: z.string().nullable().optional()
      }),
      await this.request('get', path)
    );
    if (raw.continuationToken)
      fail(
        'This non-paged inventory unexpectedly requires continuation. No incomplete result was returned; verify the deployed API contract.'
      );
    const values = raw.data.map(item => parse(schema, item));
    if (values.length > 10000)
      fail('The organization inventory exceeds the bounded 10,000-resource limit.');
    ids(values.map(value => value.id));
    return values;
  }
  listMembers() {
    return this.list('/members', memberSchema);
  }
  async getMember(id: string, fields: string[] = []) {
    id = uuid(id);
    const raw = await this.request('get', `/members/${id}`);
    requireVisible(raw, fields);
    return bound(parse(memberSchema, raw), id);
  }
  async inviteMember(data: MemberInput & { email: string }) {
    legacyAccess(data.accessAll);
    role(data.type);
    text(data.email, 256, 'Email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      fail('Provide a valid member email address.');
    if (data.externalId != null) text(data.externalId, 300, 'External ID', true);
    if (data.type === 4 && !data.permissions)
      fail('Inviting a Custom-role member requires explicit permissions.');
    if (data.type !== 4 && data.permissions)
      fail('Custom permissions are only valid for role 4.');
    const body = {
      email: data.email,
      type: data.type,
      externalId: data.externalId ?? null,
      collections: associations(data.collections ?? []),
      ...(data.permissions ? { permissions: parse(permissionsSchema, data.permissions) } : {})
    };
    const result = parse(memberSchema, await this.request('post', '/members', body));
    memberReceipt(result, body, data.email);
    return result;
  }
  async updateMember(id: string, data: MemberInput) {
    id = uuid(id);
    legacyAccess(data.accessAll);
    role(data.type);
    if (data.externalId != null) text(data.externalId, 300, 'External ID', true);
    if (data.collections) associations(data.collections);
    if (data.groupIds) ids(data.groupIds);
    if (data.permissions && data.type !== 4)
      fail('Custom permissions are only valid for role 4.');
    const current = await this.getMember(id, [
      ...(data.externalId === undefined ? ['externalId'] : []),
      ...(needsPrevious(data.collections) ? ['collections'] : [])
    ]);
    const groupIds =
      data.groupIds === undefined ? await this.getMemberGroupIds(id) : ids(data.groupIds);
    const permissions =
      data.type === 4 ? (data.permissions ?? current.permissions) : undefined;
    if (data.type === 4 && !permissions)
      fail(
        'The full existing Custom permissions are unavailable. Supply explicit permissions before changing this member.'
      );
    const body = {
      type: data.type,
      externalId: data.externalId === undefined ? current.externalId : data.externalId,
      collections: associations(
        data.collections ?? current.collections ?? [],
        current.collections ?? []
      ),
      groups: groupIds,
      ...(permissions ? { permissions: parse(permissionsSchema, permissions) } : {})
    };
    const result = bound(
      parse(memberSchema, await this.request('put', `/members/${id}`, body)),
      id
    );
    memberReceipt(result, body, current.email);
    return result;
  }
  async removeMember(id: string) {
    await this.empty('delete', `/members/${uuid(id)}`);
  }
  async reinviteMember(id: string) {
    await this.empty('post', `/members/${uuid(id)}/reinvite`);
  }
  async getMemberGroupIds(id: string) {
    return ids(
      parse(z.array(z.string()), await this.request('get', `/members/${uuid(id)}/group-ids`))
    );
  }
  async updateMemberGroupIds(id: string, groupIds: string[]) {
    const body = { groupIds: ids(groupIds) };
    await this.empty('put', `/members/${uuid(id)}/group-ids`, body);
  }
  async revokeMember(id: string) {
    await this.empty('post', `/members/${uuid(id)}/revoke`);
  }
  async restoreMember(id: string) {
    await this.empty('post', `/members/${uuid(id)}/restore`);
  }
  listGroups() {
    return this.list('/groups', groupSchema);
  }
  async getGroup(id: string, fields: string[] = []) {
    id = uuid(id);
    const raw = await this.request('get', `/groups/${id}`);
    requireVisible(raw, fields);
    return bound(parse(groupSchema, raw), id);
  }
  async createGroup(data: GroupInput) {
    legacyAccess(data.accessAll);
    text(data.name, 100, 'Group name');
    if (data.externalId != null) text(data.externalId, 300, 'External ID', true);
    const memberIds = data.memberIds === undefined ? undefined : ids(data.memberIds);
    const body = {
      name: data.name,
      externalId: data.externalId ?? null,
      collections: associations(data.collections ?? [])
    };
    const result = parse(groupSchema, await this.request('post', '/groups', body));
    groupReceipt(result, body);
    if (memberIds !== undefined) {
      try {
        groupReceipt(await this.getGroup(result.id, ['collections', 'externalId']), body);
        await this.updateGroupMemberIds(result.id, memberIds);
        const actual = await this.getGroupMemberIds(result.id);
        if (JSON.stringify(actual.sort()) !== JSON.stringify(memberIds.sort()))
          partial('group', result.id);
      } catch {
        partial('group', result.id);
      }
    }
    return result;
  }
  async updateGroup(id: string, data: GroupInput) {
    id = uuid(id);
    legacyAccess(data.accessAll);
    text(data.name, 100, 'Group name');
    if (data.externalId != null) text(data.externalId, 300, 'External ID', true);
    if (data.collections) associations(data.collections);
    const memberIds = data.memberIds === undefined ? undefined : ids(data.memberIds);
    const current = await this.getGroup(id, [
      ...(data.externalId === undefined ? ['externalId'] : []),
      ...(needsPrevious(data.collections) ? ['collections'] : [])
    ]);
    const body = {
      name: data.name,
      externalId: data.externalId === undefined ? current.externalId : data.externalId,
      collections: associations(
        data.collections ?? current.collections ?? [],
        current.collections ?? []
      )
    };
    const result = bound(
      parse(groupSchema, await this.request('put', `/groups/${id}`, body)),
      id
    );
    groupReceipt(result, body);
    if (memberIds !== undefined) {
      try {
        groupReceipt(await this.getGroup(id, ['collections', 'externalId']), body);
        await this.updateGroupMemberIds(id, memberIds);
        const actual = await this.getGroupMemberIds(id);
        if (JSON.stringify(actual.sort()) !== JSON.stringify(memberIds.sort()))
          partial('group', id);
      } catch {
        partial('group', id);
      }
    }
    return result;
  }
  async deleteGroup(id: string) {
    await this.empty('delete', `/groups/${uuid(id)}`);
  }
  async getGroupMemberIds(id: string) {
    return ids(
      parse(z.array(z.string()), await this.request('get', `/groups/${uuid(id)}/member-ids`))
    );
  }
  async updateGroupMemberIds(id: string, memberIds: string[]) {
    const body = { memberIds: ids(memberIds) };
    await this.empty('put', `/groups/${uuid(id)}/member-ids`, body);
  }
  listCollections() {
    return this.list('/collections', collectionSchema);
  }
  async getCollection(id: string, fields: string[] = []) {
    id = uuid(id);
    const raw = await this.request('get', `/collections/${id}`);
    requireVisible(raw, fields);
    return bound(parse(collectionSchema, raw), id);
  }
  async updateCollection(
    id: string,
    data: { externalId?: string | null; groups?: Association[] }
  ) {
    id = uuid(id);
    if (data.externalId != null) text(data.externalId, 300, 'External ID', true);
    if (data.groups) associations(data.groups);
    const current = await this.getCollection(id, [
      ...(data.externalId === undefined ? ['externalId'] : []),
      ...(needsPrevious(data.groups) ? ['groups'] : [])
    ]);
    const body = {
      externalId: data.externalId === undefined ? current.externalId : data.externalId,
      groups: associations(data.groups ?? current.groups ?? [], current.groups ?? [])
    };
    const result = bound(
      parse(collectionSchema, await this.request('put', `/collections/${id}`, body)),
      id
    );
    receipt(
      result.externalId === body.externalId && sameAssociations(result.groups, body.groups),
      'collection',
      id
    );
    return result;
  }
  async deleteCollection(id: string) {
    await this.empty('delete', `/collections/${uuid(id)}`);
  }
  listPolicies() {
    return this.list('/policies', policySchema);
  }
  async getPolicy(type: number, preserveData = false) {
    type = policyType(type);
    const raw = await this.request('get', `/policies/${type}`);
    if (preserveData) requireVisible(raw, ['data']);
    const result = parse(policySchema, raw);
    uuid(result.id);
    if (result.type !== type)
      fail('Bitwarden returned another policy type. No further change was sent.');
    return result;
  }
  async updatePolicy(
    id: string,
    data: { enabled: boolean; data?: Record<string, unknown> | null }
  ) {
    let type: number;
    if (/^(0|[1-9][0-9]*)$/.test(id)) type = policyType(Number(id));
    else {
      const requested = uuid(id);
      const found = (await this.listPolicies()).filter(p => uuid(p.id) === requested);
      if (found.length !== 1)
        fail('The exact policy ID is not present in list_policies. No change was sent.');
      type = policyType(found[0]!.type);
    }
    const current = await this.getPolicy(type, data.data === undefined);
    if (!/^(0|[1-9][0-9]*)$/.test(id)) bound(current, id);
    const body = {
      enabled: data.enabled,
      data: data.data === undefined ? current.data : data.data
    };
    const result = parse(policySchema, await this.request('put', `/policies/${type}`, body));
    if (result.type !== type)
      fail('The policy update returned another type; reconcile before retrying.');
    bound(result, current.id);
    receipt(
      result.enabled === body.enabled && isDeepStrictEqual(result.data, body.data),
      'policy',
      current.id
    );
    return result;
  }
  private eventQuery(params: EventQuery) {
    const query: EventQuery = {};
    if (params.actingUserId !== undefined && params.itemId !== undefined)
      fail(
        'Choose actingUserId or itemId, not both; the native API gives the acting user filter precedence.'
      );
    if (params.start !== undefined) {
      if (
        !z.iso.datetime({ offset: true }).safeParse(params.start).success ||
        !Number.isFinite(Date.parse(params.start))
      )
        fail('Provide start as a valid ISO timestamp with timezone.');
      query.start = params.start;
    }
    if (params.end !== undefined) {
      if (
        !z.iso.datetime({ offset: true }).safeParse(params.end).success ||
        !Number.isFinite(Date.parse(params.end))
      )
        fail('Provide end as a valid ISO timestamp with timezone.');
      query.end = params.end;
    }
    const endMs = query.end ? Date.parse(query.end) : Date.now();
    const startMs = query.start ? Date.parse(query.start) : endMs - 30 * 86400000;
    if (startMs >= endMs || endMs - startMs > 367 * 86400000)
      fail('Event start must precede end and the range must not exceed 367 days.');
    query.start = new Date(startMs).toISOString();
    query.end = new Date(endMs).toISOString();
    if (params.actingUserId !== undefined) query.actingUserId = uuid(params.actingUserId);
    if (params.itemId !== undefined) query.itemId = uuid(params.itemId);
    if (params.continuationToken !== undefined)
      query.continuationToken = text(
        params.continuationToken,
        4096,
        'Event continuation token'
      );
    return query;
  }
  async listEvents(params: EventQuery = {}) {
    const query = this.eventQuery(params);
    const result = parse(
      z.object({
        object: z.literal('list'),
        data: z.array(eventSchema),
        continuationToken: z.string().nullable().optional()
      }),
      await this.request('get', '/events', undefined, query)
    );
    return { events: result.data, continuationToken: result.continuationToken ?? null };
  }
  async listAllEvents(params: EventQuery = {}) {
    const fixed = this.eventQuery(params);
    const results: z.infer<typeof eventSchema>[] = [];
    const seen = new Set<string>();
    let cursor = fixed.continuationToken;
    for (let page = 0; page < 100; page++) {
      const result = await this.listEvents({ ...fixed, continuationToken: cursor });
      results.push(...result.events);
      if (results.length > 10000)
        fail(
          'Event query exceeds 10,000 records. Narrow the date range; no truncated result was returned.'
        );
      if (!result.continuationToken) return results;
      if (seen.has(result.continuationToken) || result.continuationToken === cursor)
        fail('Bitwarden repeated an event cursor. No incomplete result was returned.');
      seen.add(result.continuationToken);
      cursor = result.continuationToken;
    }
    return fail(
      'Event query exceeds 100 pages. Narrow the date range; no truncated result was returned.'
    );
  }
  async importOrganization(data: {
    groups: Array<{ name: string; externalId: string; memberExternalIds: string[] }>;
    members: Array<{ email: string | null; externalId: string; deleted: boolean }>;
    overwriteExisting: boolean;
  }) {
    if (data.groups.length > 2000 || data.members.filter(m => !m.deleted).length > 2000)
      fail('The cloud Public API import is bounded to 2,000 groups and 2,000 active members.');
    for (const group of data.groups) {
      text(group.name, 100, 'Group name');
      text(group.externalId, 300, 'Group external ID');
      for (const id of group.memberExternalIds) text(id, 300, 'Member external ID');
      if (new Set(group.memberExternalIds).size !== group.memberExternalIds.length)
        fail('Duplicate imported member external IDs are ambiguous.');
    }
    for (const member of data.members) {
      text(member.externalId, 300, 'Member external ID');
      if (
        !member.deleted &&
        (!member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email))
      )
        fail('Non-deleted imported members require a valid email address.');
      if (member.email !== null) text(member.email, 256, 'Member email', member.deleted);
    }
    for (const values of [data.groups, data.members])
      if (new Set(values.map(v => v.externalId)).size !== values.length)
        fail('Duplicate external IDs are ambiguous.');
    await this.empty('post', '/organization/import', data);
  }
}
