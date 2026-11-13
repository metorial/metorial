import {
  channelRenewAfter,
  createVerifiedChannel,
  newGoogleWatchChannelToken,
  registrationChannelId,
  renewalChannelIdentity,
  rotateChannels,
  stopLiveChannels
} from '@slates/google-push-channels';
import {
  createApiServiceError,
  parseWithServiceError,
  type SlateTriggerGroupWebhookAutoRegistrationParameters
} from 'slates';
import { Client } from '../lib/client';
import {
  type AdminRegistration,
  identitySchema,
  registrationSchema,
  selectionSchema
} from './event-schemas';

const CHANNEL_TTL_MS = 6 * 60 * 60 * 1000;
const RENEW_WINDOW = { beforeExpiryMs: 60 * 60 * 1000 };
const CHANNEL_LABELS = { integration: 'google_admin', label: 'Google Admin Reports' };
export const adminTargetId = (customerId: string, ownerId: string) =>
  `admin:${customerId}:${ownerId}`;

async function currentAdminIdentity(client: Client) {
  return parseWithServiceError(
    identitySchema,
    await client.getTriggerIdentity(),
    'Google did not return the connected administrator and customer identity.'
  );
}

export async function assertAdminIdentity(
  client: Client,
  expected: { ownerId: string; customerId: string }
) {
  const actual = await currentAdminIdentity(client);
  if (actual.ownerId !== expected.ownerId || actual.customerId !== expected.customerId) {
    throw createApiServiceError(
      'The administrator activity subscription belongs to a different Google account or customer.'
    );
  }
}

function assertSelection(selection: unknown, customerId: string) {
  const selected = parseWithServiceError(
    selectionSchema,
    selection,
    'Select the Workspace customer returned by get_customer_info before enabling user lifecycle events.'
  );
  if (selected.customerId !== customerId)
    throw createApiServiceError(
      'The selected Workspace customer does not match the connected administrator.'
    );
}

async function validateTarget(
  client: Client,
  identifier: string,
  payload: unknown,
  selection: unknown
) {
  const target = parseWithServiceError(
    identitySchema,
    payload,
    'The administrator activity target is invalid.'
  );
  if (identifier !== adminTargetId(target.customerId, target.ownerId))
    throw createApiServiceError('The administrator activity target identity does not match.');
  assertSelection(selection, target.customerId);
  await assertAdminIdentity(client, target);
  return target;
}

const RESOURCE_ORIGINS = ['https://admin.googleapis.com', 'https://www.googleapis.com'];
const RESOURCE_PATHS = [
  '/admin/reports/v1/activity/users/all/applications/admin',
  '/admin/reports/v1/activity/all/applications/admin'
];

function createAdminChannel(
  client: Client,
  customerId: string,
  webhookUrl: string,
  id: string,
  token: string
) {
  return createVerifiedChannel({
    ...CHANNEL_LABELS,
    webhookUrl,
    id,
    token,
    maxLifetimeMs: CHANNEL_TTL_MS,
    watch: () =>
      client.watchActivities({
        userKey: 'all',
        applicationName: 'admin',
        customerId,
        channelId: id,
        channelAddress: webhookUrl,
        channelToken: token,
        expiration: String(Date.now() + CHANNEL_TTL_MS),
        payload: true
      }),
    resourceUriMatches: uri =>
      RESOURCE_ORIGINS.includes(uri.origin) && RESOURCE_PATHS.includes(uri.pathname),
    stop: (channelId, resourceId) => client.stopReportsChannel(channelId, resourceId)
  });
}

function registrationResult(saved: AdminRegistration) {
  return {
    webhookRegistrationIdentifier: saved.channel.id,
    webhookRegistrationPayload: saved,
    expiresAt: saved.channel.expiresAt,
    renewAfter: channelRenewAfter(saved.channel.expiresAt, RENEW_WINDOW)
  };
}

export const adminAutoRegistration = {
  webhookTargetList: async ctx => {
    if (ctx.input.pageToken !== null && ctx.input.pageToken !== undefined)
      throw createApiServiceError('Administrator activity targets do not have another page.');
    const identity = await currentAdminIdentity(new Client({ token: ctx.auth.token }));
    assertSelection(ctx.input.selection, identity.customerId);
    return {
      targets: [
        {
          webhookTargetIdentifier: adminTargetId(identity.customerId, identity.ownerId),
          name: identity.customerDomain ?? identity.customerId,
          metadata: { customerId: identity.customerId },
          webhookTargetPayload: identity,
          targetOwnership: 'single_user' as const
        }
      ],
      nextPageToken: null
    };
  },
  webhookRegister: async ctx => {
    if (!ctx.input.operationId)
      throw createApiServiceError(
        'Administrator activity registration requires an operation identity.'
      );
    const client = new Client({ token: ctx.auth.token });
    const identity = await validateTarget(
      client,
      ctx.input.webhookTargetIdentifier,
      ctx.input.webhookTargetPayload,
      ctx.input.selection
    );
    const startedAt = new Date(Date.now()).toISOString();
    // Retries reuse the operation's channel ID; with no readback a duplicate-ID conflict stays
    // an error instead of creating untracked channels.
    const channel = await createAdminChannel(
      client,
      identity.customerId,
      ctx.input.webhookUrl,
      registrationChannelId(
        ctx.input.webhookTargetIdentifier,
        ctx.input.webhookUrl,
        ctx.input.operationId
      ),
      newGoogleWatchChannelToken()
    );
    return registrationResult({
      ...identity,
      startedAt,
      tokenSeed: newGoogleWatchChannelToken(),
      channel,
      previousChannels: []
    });
  },
  webhookRenew: async ctx => {
    const saved = parseWithServiceError(
      registrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved administrator activity channel is invalid.'
    );
    const client = new Client({ token: ctx.auth.token });
    const target = await validateTarget(
      client,
      ctx.input.webhookTargetIdentifier,
      ctx.input.webhookTargetPayload,
      ctx.input.selection
    );
    if (
      saved.ownerId !== target.ownerId ||
      saved.customerId !== target.customerId ||
      (ctx.input.webhookRegistrationIdentifier &&
        ctx.input.webhookRegistrationIdentifier !== saved.channel.id)
    )
      throw createApiServiceError(
        'The saved administrator activity channel does not match the renewal target.'
      );
    if (!ctx.input.operationId)
      throw createApiServiceError(
        'Administrator activity renewal requires an operation identity.'
      );
    if (saved.renewalOperationId === ctx.input.operationId) return registrationResult(saved);
    const { id, token } = renewalChannelIdentity(
      saved.channel,
      ctx.input.operationId,
      saved.tokenSeed
    );
    const channel = await createAdminChannel(
      client,
      target.customerId,
      ctx.input.webhookUrl,
      id,
      token
    );
    return registrationResult({
      ...saved,
      tokenSeed: saved.tokenSeed ?? newGoogleWatchChannelToken(),
      channel,
      renewalOperationId: ctx.input.operationId,
      previousChannels: rotateChannels(saved.previousChannels, saved.channel)
    });
  },
  webhookUnregister: async ctx => {
    const saved = parseWithServiceError(
      registrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved administrator activity channel is invalid.'
    );
    if (
      ctx.input.webhookRegistrationIdentifier &&
      ctx.input.webhookRegistrationIdentifier !== saved.channel.id
    )
      throw createApiServiceError(
        'The saved administrator activity channel identity does not match.'
      );
    const client = new Client({ token: ctx.auth.token });
    await assertAdminIdentity(client, saved);
    // Reports has no channel read/list API. A 404 cannot prove removal; expiry can.
    await stopLiveChannels([saved.channel, ...saved.previousChannels], channel =>
      client.stopReportsChannel(channel.id, channel.resourceId)
    );
  }
} satisfies SlateTriggerGroupWebhookAutoRegistrationParameters<{}, { token: string }>;
