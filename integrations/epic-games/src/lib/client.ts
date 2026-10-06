import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';
import type { EpicAuth } from '../auth';
import { EpicHttp } from './http';
import {
  accountSchema,
  entitlementSchema,
  externalAccountSchema,
  ownershipSchema,
  page,
  parse,
  reportSchema,
  sanctions
} from './types';
import { identifier, identifiers, protect, segment, whole } from './validation';

type Context = { auth: EpicAuth; config: Record<string, unknown>; input: unknown };
function setup(ctx: Context, family: 'oauth' | 'client_credentials') {
  if (ctx.auth.authType !== family)
    throw createApiServiceError(
      family === 'oauth'
        ? 'Connect with Epic Account OAuth to use account and ecommerce actions.'
        : 'Connect with an EOS Game Services Client to use game-service actions.'
    );
  identifier(ctx.auth.token, 'Access token');
  protect(ctx.input, [ctx.auth.token, ctx.auth.refreshToken ?? '']);
  if (ctx.auth.expiresAt && Date.parse(ctx.auth.expiresAt) <= Date.now())
    throw createApiServiceError(
      'The Epic access token expired. Renew or reconnect the intended account or client.'
    );
}
export function resolvedDeployment(ctx: Pick<Context, 'auth' | 'config'>) {
  const value = ctx.auth.deploymentId ?? ctx.config.deploymentId;
  if (value !== undefined) identifier(value, 'Deployment ID');
  return value;
}
export function resolvedSandbox(ctx: Context, input?: string) {
  const value = input ?? ctx.auth.sandboxId ?? ctx.config.sandboxId;
  if (value === undefined)
    throw createApiServiceError('Supply the authorized sandbox ID from your developer setup.');
  identifier(value, 'Sandbox ID');
  return value;
}
export function gameClient(ctx: Context) {
  setup(ctx, 'client_credentials');
  return new EosGameServicesClient({ ...ctx.auth, deploymentId: resolvedDeployment(ctx) });
}
export function accountClient(ctx: Context) {
  setup(ctx, 'oauth');
  return new EosAccountServicesClient(ctx.auth);
}
export class EosGameServicesClient {
  private http;
  constructor(
    private params: { token: string; refreshToken?: string; deploymentId?: string }
  ) {
    identifier(params.token, 'Access token');
    this.http = new EpicHttp(
      [params.token, params.refreshToken ?? ''],
      `Bearer ${params.token}`
    );
  }
  private deployment() {
    if (!this.params.deploymentId)
      throw createApiServiceError(
        'Reconnect the EOS client with its authorized deployment ID; no deployment discovery route is available.'
      );
    return segment(this.params.deploymentId, 'Deployment ID');
  }
  async queryExternalAccounts(
    accountIds: string[],
    identityProviderId: string,
    environment?: string
  ) {
    identifiers(accountIds, 16, 'External account IDs');
    identifier(identityProviderId, 'Identity provider');
    const response = await this.http.request('GET', '/user/v1/accounts', {
      params: pickDefined({ accountId: accountIds, identityProviderId, environment })
    });
    const data = parse(
      z.object({ ids: z.record(z.string(), z.string()) }),
      response.data,
      'external-account map'
    );
    for (const [key, value] of Object.entries(data.ids)) {
      if (!accountIds.includes(key))
        throw createApiServiceError('Epic returned an unrequested external-account mapping.');
      identifier(value, 'Product User ID');
    }
    return data;
  }
  async queryProductUsers(productUserIds: string[]) {
    identifiers(productUserIds, 16, 'Product User IDs');
    const response = await this.http.request('GET', '/user/v1/product-users', {
      params: { productUserId: productUserIds }
    });
    const data = parse(
      z.object({
        productUsers: z.record(
          z.string(),
          z.object({ accounts: z.array(externalAccountSchema) })
        )
      }),
      response.data,
      'product-user map'
    );
    for (const key of Object.keys(data.productUsers))
      if (!productUserIds.includes(key))
        throw createApiServiceError('Epic returned an unrequested Product User mapping.');
    return data;
  }
  async getActiveSanctionsForPlayer(productUserId: string, actions?: string[]) {
    if (actions) identifiers(actions, 5, 'Action filters');
    const response = await this.http.request(
      'GET',
      `/sanctions/v1/productUser/${segment(productUserId)}/active`,
      { params: { action: actions } }
    );
    const elements = sanctions(response.data);
    if (actions && elements.some(row => !actions.includes(row.action)))
      throw createApiServiceError(
        'Epic returned an active sanction outside the requested action filter.'
      );
    return { elements };
  }
  async querySanctions(limit = 100, offset = 0) {
    return this.query(undefined, limit, offset);
  }
  async queryPlayerSanctions(productUserId: string, limit = 100, offset = 0) {
    return this.query(productUserId, limit, offset);
  }
  private async query(productUserId: string | undefined, limit: number, offset: number) {
    whole(limit, 1, 100, 'Limit');
    whole(offset, 0, Number.MAX_SAFE_INTEGER, 'Offset');
    const url = `/sanctions/v1/${this.deployment()}/${productUserId ? `users/${segment(productUserId)}` : 'sanctions'}`;
    const response = await this.http.request('GET', url, { params: { limit, offset } });
    const envelope = page(
      z.record(z.string(), z.unknown()),
      response.data,
      offset,
      limit,
      'sanction page'
    );
    const elements = sanctions({ elements: envelope.elements });
    for (const row of elements)
      if (
        (row.deploymentId && row.deploymentId !== this.params.deploymentId) ||
        (productUserId && row.productUserId && row.productUserId !== productUserId)
      )
        throw createApiServiceError(
          'Epic returned a sanction outside the requested deployment or player.'
        );
    return { elements, paging: envelope.paging };
  }
  async createSanctions(
    payload: Array<{
      productUserId: string;
      action: string;
      justification: string;
      source: string;
      duration?: number;
      tags?: string[];
      pending?: boolean;
      metadata?: Record<string, string>;
      displayName?: string;
      identityProvider?: string;
      accountId?: string;
    }>
  ) {
    const response = await this.http.request(
      'POST',
      `/sanctions/v1/${this.deployment()}/sanctions`,
      { data: payload }
    );
    const elements = sanctions(response.data);
    const unmatched = [...payload];
    const refs = new Set<string>();
    for (const row of elements) {
      try {
        identifier(row.referenceId, 'Native sanction reference');
      } catch {
        const safe = createApiServiceError(
          'Epic returned an unusable sanction reference. The action may already exist; reconcile retained sanctions before retrying. Do not retry blindly.'
        );
        safe.data.outcomeUncertain = true;
        safe.data.recoverableReferenceIds = [...refs];
        throw safe;
      }
      const index = unmatched.findIndex(
        input =>
          input.productUserId === row.productUserId &&
          input.action === row.action &&
          input.source === row.source &&
          input.justification === row.justification &&
          (input.pending === undefined || input.pending === row.pending)
      );
      if (
        index < 0 ||
        refs.has(row.referenceId) ||
        (row.deploymentId && row.deploymentId !== this.params.deploymentId)
      )
        throw createApiServiceError(
          'The sanction creation receipt did not match the requested records. Reconcile the retained sanctions before retrying.'
        );
      unmatched.splice(index, 1);
      refs.add(row.referenceId);
    }
    if (unmatched.length)
      throw createApiServiceError(
        'The sanction creation receipt is incomplete. Reconcile the retained sanctions before retrying.'
      );
    return { elements };
  }
  async updateSanctions(
    payload: Array<{
      referenceId: string;
      updates: {
        tags?: string[];
        metadata?: Record<string, string>;
        justification?: string;
        duration?: number;
      };
    }>
  ) {
    const response = await this.http.request(
      'PATCH',
      `/sanctions/v1/${this.deployment()}/sanctions`,
      { data: payload }
    );
    const elements = sanctions(response.data);
    const refs = new Set<string>();
    for (const row of elements) {
      const expected = payload.find(input => input.referenceId === row.referenceId);
      if (
        !expected ||
        refs.has(row.referenceId) ||
        (row.deploymentId && row.deploymentId !== this.params.deploymentId)
      )
        throw createApiServiceError(
          'The sanction update receipt did not match the requested identifiers. Reconcile changed state.'
        );
      refs.add(row.referenceId);
      for (const field of ['justification', 'metadata', 'tags'] as const) {
        const value = expected.updates[field];
        if (value !== undefined) {
          const normalize = (item: unknown) =>
            field === 'tags' && Array.isArray(item)
              ? [...item].map(value => String(value).toLowerCase()).sort()
              : field === 'metadata' && item && typeof item === 'object'
                ? Object.entries(item).sort(([a], [b]) => a.localeCompare(b))
                : item;
          if (JSON.stringify(normalize(value)) !== JSON.stringify(normalize(row[field])))
            throw createApiServiceError(
              'The sanction update receipt did not confirm an observable requested field. Reconcile changed state.'
            );
        }
      }
    }
    if (refs.size !== payload.length)
      throw createApiServiceError(
        'The sanction update receipt is incomplete. Reconcile changed state.'
      );
    return { elements };
  }
  async removeSanctions(referenceIds: string[], justification?: string) {
    identifiers(referenceIds, 100, 'Sanction reference IDs');
    await this.http.request('DELETE', `/sanctions/v1/${this.deployment()}/sanctions`, {
      data: pickDefined({ referenceIds, justification }),
      statuses: [204]
    });
    return { elements: [], removedReferenceIds: referenceIds };
  }
  async sendPlayerReport(report: {
    reportingPlayerId: string;
    reportedPlayerId: string;
    time: string;
    reasonId: number;
    message?: string;
    context?: string;
  }) {
    await this.http.request('POST', '/player-reports/v1/report', {
      data: report,
      statuses: [201]
    });
  }
  async findPlayerReports(params: {
    reportingPlayerId?: string;
    reportedPlayerId?: string;
    reasonId?: number;
    startTime?: string;
    endTime?: string;
    pagination?: boolean;
    offset?: number;
    limit?: number;
    order?: string;
  }) {
    const limit = params.limit ?? 50,
      offset = params.offset ?? 0;
    whole(limit, 1, 50, 'Limit');
    whole(offset, 0, Number.MAX_SAFE_INTEGER, 'Offset');
    const response = await this.http.request(
      'GET',
      `/player-reports/v1/report/${this.deployment()}`,
      { params: pickDefined({ ...params, pagination: true, limit, offset }) }
    );
    const data = page(reportSchema, response.data, offset, limit, 'report page');
    for (const row of data.elements)
      if (
        (row.deploymentId && row.deploymentId !== this.params.deploymentId) ||
        (params.reportingPlayerId && row.reportingPlayerId !== params.reportingPlayerId) ||
        (params.reportedPlayerId && row.reportedPlayerId !== params.reportedPlayerId) ||
        (params.reasonId !== undefined && row.reasonId !== params.reasonId) ||
        (params.startTime && Date.parse(row.time) < Date.parse(params.startTime)) ||
        (params.endTime && Date.parse(row.time) > Date.parse(params.endTime))
      )
        throw createApiServiceError('Epic returned a report outside the requested filters.');
    return data;
  }
  async getReportReasonDefinitions() {
    const response = await this.http.request(
      'GET',
      '/player-reports/v1/report/reason/definition'
    );
    return parse(
      z.object({
        elements: z.array(z.object({ reasonId: z.number().int(), reasonString: z.string() }))
      }),
      response.data,
      'report reasons'
    );
  }
  async getAntiCheatStatus() {
    const response = await this.http.request(
      'GET',
      `/anticheat/v1/${this.deployment()}/status`
    );
    return parse(
      z.object({ serverKick: z.boolean() }),
      response.data,
      'anti-cheat configuration'
    );
  }
  async createVoiceRoomTokens(
    roomId: string,
    participants: Array<{ puid: string; clientIp?: string; hardMuted?: boolean }>
  ) {
    const response = await this.http.request(
      'POST',
      `/rtc/v1/${this.deployment()}/room/${segment(roomId, 'Room ID')}`,
      { data: { participants } }
    );
    const data = parse(
      z.object({
        roomId: z.string(),
        deploymentId: z.string(),
        clientBaseUrl: z.string().url(),
        participants: z.array(
          z.object({ puid: z.string(), token: z.string().min(1), hardMuted: z.boolean() })
        )
      }),
      response.data,
      'voice-room token receipt'
    );
    if (
      data.roomId !== roomId ||
      data.deploymentId !== this.params.deploymentId ||
      data.participants.length !== participants.length ||
      new Set(data.participants.map(row => row.puid)).size !== participants.length ||
      data.participants.some(
        row =>
          !participants.some(
            input =>
              input.puid === row.puid &&
              (input.hardMuted === undefined || input.hardMuted === row.hardMuted)
          )
      )
    )
      throw createApiServiceError(
        'The voice token receipt did not match the exact room, deployment and participants. Reconcile room state before retrying.'
      );
    const media = new URL(data.clientBaseUrl);
    if (media.protocol !== 'https:' || media.username || media.password)
      throw createApiServiceError('Epic returned an invalid voice media endpoint.');
    return data;
  }
  async removeVoiceParticipant(roomId: string, productUserId: string) {
    await this.http.request(
      'DELETE',
      `/rtc/v1/${this.deployment()}/room/${segment(roomId)}/participants/${segment(productUserId)}`,
      { statuses: [204] }
    );
  }
  async modifyVoiceParticipant(roomId: string, productUserId: string, hardMuted: boolean) {
    await this.http.request(
      'POST',
      `/rtc/v1/${this.deployment()}/room/${segment(roomId)}/participants/${segment(productUserId)}`,
      { data: { hardMuted }, statuses: [204] }
    );
  }
}
export class EosAccountServicesClient {
  private http;
  constructor(
    private params: {
      token: string;
      refreshToken?: string;
      accountId?: string;
      clientId?: string;
    }
  ) {
    identifier(params.token, 'Access token');
    this.http = new EpicHttp(
      [params.token, params.refreshToken ?? ''],
      `Bearer ${params.token}`
    );
  }
  async getTokenInfo() {
    const response = await this.http.request('POST', '/epic/oauth/v2/tokenInfo', {
      data: new URLSearchParams({ token: this.params.token }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      confidentialBody: true
    });
    const data = parse(
      z.object({
        active: z.boolean(),
        account_id: z.string().optional(),
        client_id: z.string().optional(),
        application_id: z.string().optional(),
        scope: z.string().optional(),
        expires_at: z.string().optional(),
        expires_in: z.number().optional()
      }),
      response.data,
      'token context'
    );
    if (!data.active)
      throw createApiServiceError(
        'The Epic Account access token is inactive. Reconnect the intended account.'
      );
    if (
      (this.params.accountId && data.account_id !== this.params.accountId) ||
      (this.params.clientId && data.client_id !== this.params.clientId)
    )
      throw createApiServiceError(
        'The token context does not match the original account or client. Reconnect the intended account.'
      );
    return data;
  }
  async getAccounts(accountIds: string[]) {
    identifiers(accountIds, 50, 'Account IDs');
    const response = await this.http.request('GET', '/epic/id/v2/accounts', {
      params: { accountId: accountIds }
    });
    const data = parse(z.array(accountSchema), response.data, 'account records');
    if (
      new Set(data.map(row => row.accountId)).size !== data.length ||
      data.some(row => !accountIds.includes(row.accountId))
    )
      throw createApiServiceError('Epic returned duplicate or unrequested account records.');
    return data;
  }
  private ownAccount(accountId: string) {
    identifier(accountId, 'Account ID');
    if (!this.params.accountId || this.params.accountId !== accountId)
      throw createApiServiceError(
        'Use the authenticated Epic account ID returned by get_connection_context for this action.'
      );
  }
  async getFriendsAndBlockList(accountId: string) {
    this.ownAccount(accountId);
    const response = await this.http.request('GET', `/epic/friends/v1/${segment(accountId)}`);
    return parse(
      z.object({ friends: z.array(friendSchema), blockList: z.array(blockSchema) }),
      response.data,
      'legacy friends compatibility response'
    );
  }
  async getFriends(accountId: string) {
    this.ownAccount(accountId);
    const response = await this.http.request(
      'GET',
      `/epic/friends/v1/${segment(accountId)}/friends`
    );
    return parse(
      z.array(friendSchema),
      response.data,
      'legacy friends compatibility response'
    );
  }
  async getBlockList(accountId: string) {
    this.ownAccount(accountId);
    const response = await this.http.request(
      'GET',
      `/epic/friends/v1/${segment(accountId)}/blocklist`
    );
    return parse(
      z.array(blockSchema),
      response.data,
      'legacy block-list compatibility response'
    );
  }
  async checkOwnership(accountId: string, nsCatalogItemIds?: string[], sandboxId?: string) {
    identifier(accountId, 'Account ID');
    if (nsCatalogItemIds?.length) {
      identifiers(nsCatalogItemIds, 100, 'Catalog item IDs');
      for (const id of nsCatalogItemIds)
        if (id.split(':').length !== 2 || id.split(':').some(value => !value))
          throw createApiServiceError('Catalog item IDs must use sandboxId:catalogItemId.');
    } else if (!sandboxId)
      throw createApiServiceError('Supply catalog item IDs or an authorized sandbox ID.');
    const response = await this.http.request(
      'GET',
      `/epic/ecom/v3/platforms/EPIC/identities/${segment(accountId)}/ownership`,
      { params: pickDefined({ nsCatalogItemId: nsCatalogItemIds, sandboxId }) }
    );
    const data = parse(z.array(ownershipSchema), response.data, 'ownership records');
    if (
      new Set(data.map(row => `${row.namespace}:${row.itemId}`)).size !== data.length ||
      data.some(row =>
        nsCatalogItemIds?.length
          ? !nsCatalogItemIds.includes(`${row.namespace}:${row.itemId}`)
          : row.namespace !== sandboxId
      )
    )
      throw createApiServiceError('Epic returned duplicate or unrequested ownership records.');
    return data;
  }
  async getEntitlements(
    accountId: string,
    sandboxId: string,
    entitlementNames?: string[],
    includeRedeemed?: boolean
  ) {
    identifier(accountId, 'Account ID');
    identifier(sandboxId, 'Sandbox ID');
    if (entitlementNames) identifiers(entitlementNames, 100, 'Entitlement names');
    const response = await this.http.request(
      'GET',
      `/epic/ecom/v4/identities/${segment(accountId)}/entitlements`,
      {
        params: pickDefined({ sandboxId, entitlementName: entitlementNames, includeRedeemed })
      }
    );
    const data = parse(z.array(entitlementSchema), response.data, 'entitlements');
    if (
      new Set(data.map(row => row.id)).size !== data.length ||
      data.some(
        row =>
          row.namespace !== sandboxId ||
          (entitlementNames && !entitlementNames.includes(row.entitlementName))
      )
    )
      throw createApiServiceError('Epic returned duplicate or unrequested entitlements.');
    return data;
  }
  async redeemEntitlements(accountId: string, entitlementIds: string[], sandboxId: string) {
    identifier(accountId, 'Account ID');
    identifier(sandboxId, 'Sandbox ID');
    identifiers(entitlementIds, 100, 'Entitlement IDs');
    const response = await this.http.request(
      'PUT',
      `/epic/ecom/v3/identities/${segment(accountId)}/entitlements/redeem`,
      { data: { entitlementIds, sandboxId }, statuses: [200, 204] }
    );
    return { status: response.status };
  }
}
const friendSchema = z.object({
  accountId: z.string(),
  created: z.string(),
  favorite: z.boolean().optional(),
  nickname: z.string().optional()
});
const blockSchema = z.object({ accountId: z.string(), created: z.string() });
