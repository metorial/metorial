import { randomUUID } from 'node:crypto';
import {
  channelRenewAfter,
  createVerifiedChannel,
  type GoogleWatchChannel,
  isChannelLive,
  newGoogleWatchChannelToken,
  registrationChannelId,
  renewalChannelIdentity,
  rotateChannels,
  stopLiveChannels,
  verifyChannelNotification
} from '@slates/google-push-channels';
import {
  createApiServiceError,
  getApiErrorStatus,
  getServiceErrorData,
  type SlateWebhookExpandHandler,
  type SlateWebhookProcessHandler,
  type SlateWebhookRegisterHandler,
  type SlateWebhookRenewHandler,
  type SlateWebhookTargetListHandler,
  type SlateWebhookUnregisterHandler,
  skipWebhook,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { spec } from '../spec';
import {
  DRIVE_FOLDER_MAX_CHILDREN,
  type DriveSavedFolderState,
  type DriveTarget,
  driveChannelRegistrationSchema,
  driveFileEventSchema,
  driveFolderSelectionSchema,
  driveFolderStateSchema,
  driveRegistrationSchema,
  driveSavedFolderStateSchema,
  driveTargetId,
  driveTargetIdOwner,
  driveTargetSchema,
  parseDriveContract
} from './event-schemas';
import {
  baselineDriveFolder,
  drainDriveChanges,
  driveAccountId,
  driveFolderTooLarge,
  resolveDriveTarget
} from './sync';

type Auth = { token: string };
const CHANNEL_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const RENEW_WINDOW = { lifetimeFraction: 0.8 };
const CHANNEL_LABELS = { integration: 'google_drive', label: 'Google Drive' };
const TARGETS_PER_PAGE = 20;
const savedStateSchema = z
  .object({ driveFolders: z.record(z.string(), z.unknown()).optional() })
  .passthrough();

function selectedTarget(target: DriveTarget, selection: unknown) {
  const selected = parseDriveContract(
    driveFolderSelectionSchema,
    selection,
    'folder selection'
  );
  if (!selected.folderIds.includes(target.folderId))
    throw createApiServiceError('The registered Google Drive folder is no longer selected.', {
      reason: 'google_drive_folder_not_selected'
    });
}

async function assertTarget(
  client: GoogleDriveClient,
  target: DriveTarget,
  identifier: string,
  selection: unknown
) {
  selectedTarget(target, selection);
  if (
    driveTargetId(target) !== identifier ||
    driveTargetId(await resolveDriveTarget(client, target.folderId)) !== identifier
  ) {
    throw createApiServiceError(
      'The selected Google Drive folder, account, or change-log identity has changed. Refresh the folder selection.',
      {
        reason: 'google_drive_target_mismatch'
      }
    );
  }
}

const targetList: SlateWebhookTargetListHandler<{}, Auth> = async ctx => {
  const selection = parseDriveContract(
    driveFolderSelectionSchema,
    ctx.input.selection,
    'folder selection'
  );
  const folderIds = [...new Set(selection.folderIds)];
  const offset = ctx.input.pageToken == null ? 0 : ctx.input.pageToken;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= folderIds.length) {
    throw createApiServiceError('Invalid Google Drive folder discovery page token.', {
      reason: 'google_drive_target_page_invalid'
    });
  }
  const client = new GoogleDriveClient(ctx.auth.token);
  const targets: Awaited<ReturnType<SlateWebhookTargetListHandler<{}, Auth>>>['targets'] = [];
  for (const folderId of folderIds.slice(offset, offset + TARGETS_PER_PAGE)) {
    try {
      const { name, ...target } = await resolveDriveTarget(client, folderId);
      if (folderId !== target.folderId)
        throw createApiServiceError(
          'Use the folder ID returned by Search Files, rather than a folder alias.',
          {
            reason: 'google_drive_folder_alias'
          }
        );
      targets.push({
        webhookTargetIdentifier: driveTargetId(target),
        webhookTargetPayload: target,
        name,
        metadata: { folderId: target.folderId, driveId: target.driveId },
        targetOwnership: 'single_user' as const
      });
    } catch (error) {
      const reason = getServiceErrorData(error)?.reason;
      if (
        reason === 'google_drive_folder_required' ||
        reason === 'google_drive_folder_alias'
      ) {
        ctx.warn({
          message:
            'The selected ID is not the ID of an untrashed Google Drive folder; no channel will be registered.',
          reason,
          folderId
        });
        continue;
      }
      // Drive also uses 403 for quota and policy failures; keep those retryable.
      if (Number(getApiErrorStatus(error)) !== 404) throw error;
      ctx.warn({
        message: 'Google Drive folder is inaccessible; no channel will be registered.',
        reason: 'google_drive_folder_inaccessible',
        folderId
      });
    }
  }
  const nextOffset = offset + TARGETS_PER_PAGE;
  return { targets, nextPageToken: nextOffset < folderIds.length ? nextOffset : null };
};

function leaseResult(registration: z.infer<typeof driveRegistrationSchema>) {
  const active = registration.channels[0]!;
  return {
    webhookRegistrationIdentifier: active.id,
    webhookRegistrationPayload: registration,
    expiresAt: active.expiresAt,
    renewAfter: channelRenewAfter(active.expiresAt, RENEW_WINDOW)
  };
}

function createChannel(
  client: GoogleDriveClient,
  target: DriveTarget,
  cursor: string,
  webhookUrl: string,
  identity: { id: string; token: string }
): Promise<GoogleWatchChannel> {
  return createVerifiedChannel({
    ...CHANNEL_LABELS,
    webhookUrl,
    ...identity,
    maxLifetimeMs: CHANNEL_LIFETIME_MS,
    watch: async () => {
      const response = await client.watchChanges(cursor, webhookUrl, identity.id, {
        token: identity.token,
        driveId: target.cursorDriveId ?? undefined,
        expiration: String(Date.now() + CHANNEL_LIFETIME_MS)
      });
      return { ...response, id: response.channelId };
    },
    stop: (channelId, resourceId) => client.stopChannel(channelId, resourceId)
  });
}

const register: SlateWebhookRegisterHandler<{}, Auth> = async ctx => {
  const target = parseDriveContract(
    driveTargetSchema,
    ctx.input.webhookTargetPayload,
    'target'
  );
  const client = new GoogleDriveClient(ctx.auth.token);
  await assertTarget(client, target, ctx.input.webhookTargetIdentifier, ctx.input.selection);
  const initialState = await baselineDriveFolder(client, target);
  if (!initialState) throw driveFolderTooLarge();
  const channel = await createChannel(
    client,
    target,
    initialState.cursor,
    ctx.input.webhookUrl,
    {
      id: ctx.input.operationId
        ? registrationChannelId(
            ctx.input.webhookTargetIdentifier,
            ctx.input.webhookUrl,
            ctx.input.operationId
          )
        : randomUUID(),
      token: newGoogleWatchChannelToken()
    }
  );
  return leaseResult({
    target,
    initialState,
    tokenSeed: newGoogleWatchChannelToken(),
    channels: [channel]
  });
};

const renew: SlateWebhookRenewHandler<{}, Auth> = async ctx => {
  const registration = parseDriveContract(
    driveRegistrationSchema,
    ctx.input.webhookRegistrationPayload,
    'registration'
  );
  const target = parseDriveContract(
    driveTargetSchema,
    ctx.input.webhookTargetPayload,
    'target'
  );
  const client = new GoogleDriveClient(ctx.auth.token);
  await assertTarget(client, target, ctx.input.webhookTargetIdentifier, ctx.input.selection);
  const active = registration.channels[0]!;
  if (
    driveTargetId(target) !== driveTargetId(registration.target) ||
    active.id !== ctx.input.webhookRegistrationIdentifier
  ) {
    throw createApiServiceError(
      'The Google Drive channel renewal identity does not match its saved registration.',
      { reason: 'google_drive_renewal_mismatch' }
    );
  }
  if (registration.operationId === ctx.input.operationId && isChannelLive(active))
    return leaseResult(registration);
  // Renewal only wakes the saved cursor; never replace the baseline or advance the cursor.
  const watchCursor = await client.getStartPageToken(target.cursorDriveId ?? undefined);
  const channel = await createChannel(
    client,
    target,
    watchCursor,
    ctx.input.webhookUrl,
    renewalChannelIdentity(active, ctx.input.operationId, registration.tokenSeed)
  );
  return leaseResult({
    ...registration,
    operationId: ctx.input.operationId,
    tokenSeed: registration.tokenSeed ?? newGoogleWatchChannelToken(),
    channels: [channel, ...rotateChannels(registration.channels.slice(1), active)]
  });
};

const unregister: SlateWebhookUnregisterHandler<{}, Auth> = async ctx => {
  const registration = parseDriveContract(
    driveRegistrationSchema,
    ctx.input.webhookRegistrationPayload,
    'registration'
  );
  const client = new GoogleDriveClient(ctx.auth.token);
  if ((await driveAccountId(client)) !== registration.target.accountId)
    throw createApiServiceError(
      'Only the Google account that created this channel can stop it.',
      {
        reason: 'google_drive_channel_creator_mismatch'
      }
    );
  // No channel get/list API: a 404 proves nothing, so cleanup stays retryable until stop or expiry.
  try {
    await stopLiveChannels(registration.channels, channel =>
      client.stopChannel(channel.id, channel.resourceId)
    );
  } catch (error) {
    throw createApiServiceError(
      'Google Drive could not confirm that every notification channel was stopped.',
      {
        reason: 'google_drive_channel_cleanup_unconfirmed',
        parent: error
      }
    );
  }
};

const processWebhook: SlateWebhookProcessHandler = async ctx => {
  // Only channel fields are read here; the folder baseline is validated when expansion needs it.
  const parsed = driveChannelRegistrationSchema.safeParse(
    ctx.input.webhookRegistrationPayload
  );
  if (!parsed.success)
    return skipWebhook('google_drive_webhook_registration_invalid', { status: 500 });
  const verified = await verifyChannelNotification({
    integration: 'google_drive',
    request: ctx.input.request,
    channels: parsed.data.channels
  });
  if (!verified.ok) return verified.skip;
  const { channel, messageNumber, resourceState } = verified;
  if (resourceState !== 'change' && resourceState !== 'changed')
    return { events: [], response: { status: 200, body: '' } };
  return {
    events: [
      {
        payload: { targetId: driveTargetId(parsed.data.target) },
        matchers: [{ driveAccountId: parsed.data.target.accountId }],
        idempotencyKey: `${channel.id}:${messageNumber}`
      }
    ],
    response: { status: 200, body: '' }
  };
};

const expand: SlateWebhookExpandHandler<{}, Auth> = async ctx => {
  const registration = parseDriveContract(
    driveChannelRegistrationSchema,
    ctx.input.webhookRegistrationPayload,
    'registration'
  );
  const targetId = driveTargetId(registration.target);
  const wakeup =
    ctx.input.payload == null
      ? null
      : parseDriveContract(
          z.object({ targetId: z.string() }),
          ctx.input.payload,
          'notification'
        );
  if (wakeup && wakeup.targetId !== targetId)
    throw createApiServiceError(
      'Google Drive notification does not belong to the saved folder.',
      {
        reason: 'google_drive_notification_target_mismatch'
      }
    );
  const state = parseDriveContract(savedStateSchema, ctx.input.state ?? {}, 'saved state');
  const saved = state.driveFolders?.[targetId];
  // The registration baseline only seeds the first expansion; saved state wins afterwards.
  const previous =
    saved === undefined
      ? parseDriveContract(
          driveFolderStateSchema,
          ctx.input.webhookRegistrationPayload.initialState,
          'registration baseline'
        )
      : parseDriveContract(driveSavedFolderStateSchema, saved, 'saved state');
  // One entry per selected folder, so state from unwatched folders does not pile up.
  const save = (folder: DriveSavedFolderState) => {
    const selected = new Set(
      parseDriveContract(driveFolderSelectionSchema, ctx.input.selection, 'folder selection')
        .folderIds
    );
    const kept = new Map<string, [string, unknown]>();
    for (const [key, value] of Object.entries(state.driveFolders ?? {})) {
      const owner = driveTargetIdOwner(key);
      if (owner?.accountId === registration.target.accountId && selected.has(owner.folderId))
        kept.set(owner.folderId, [key, value]);
    }
    kept.set(registration.target.folderId, [targetId, folder]);
    return { ...state, driveFolders: Object.fromEntries(kept.values()) };
  };
  const client = new GoogleDriveClient(ctx.auth.token);
  if ('overLimit' in previous) {
    if (previous.targetId !== targetId)
      throw createApiServiceError(
        'The saved Drive cursor belongs to another folder or account.',
        { reason: 'google_drive_cursor_identity_mismatch' }
      );
    // Only scheduled reconciliation rechecks an over-limit folder; notifications cost no request.
    if (wakeup) {
      selectedTarget(registration.target, ctx.input.selection);
      return { events: [] };
    }
    await assertTarget(client, registration.target, targetId, ctx.input.selection);
    const baseline = await baselineDriveFolder(client, registration.target);
    if (!baseline) throw driveFolderTooLarge();
    ctx.warn({
      message:
        'The Google Drive folder is back within the child limit and is watched again. Changes made while it was over the limit were not delivered.',
      reason: 'google_drive_folder_limit_recovered'
    });
    return { events: [], updatedState: save(baseline) };
  }
  // Notifications only read the change log; scheduled reconciliation rechecks folder and account.
  if (wakeup) selectedTarget(registration.target, ctx.input.selection);
  else await assertTarget(client, registration.target, targetId, ctx.input.selection);
  let result: Awaited<ReturnType<typeof drainDriveChanges>>;
  try {
    result = await drainDriveChanges(client, registration.target, previous, true);
  } catch (error) {
    // Tokens should not expire; this recovers an invalidated cursor without reporting every file as new.
    if (Number(getApiErrorStatus(error)) !== 410) throw error;
    ctx.warn({
      message:
        'Google Drive invalidated the change cursor. Rebuilding the folder baseline without replaying existing files.',
      reason: 'google_drive_cursor_reset'
    });
    const baseline = await baselineDriveFolder(client, registration.target);
    result = baseline
      ? { overLimit: false, events: [], state: baseline }
      : { overLimit: true };
  }
  if (result.overLimit) {
    ctx.warn({
      message: `The Google Drive folder now has more than ${DRIVE_FOLDER_MAX_CHILDREN.toLocaleString('en-US')} immediate children, the most a watched folder can have. No events are delivered for it until it is back within the limit.`,
      reason: 'google_drive_folder_too_large'
    });
    return { events: [], updatedState: save({ targetId, overLimit: true }) };
  }
  return { events: result.events, updatedState: save(result.state) };
};

export const driveFolderEvents = triggerGroup(spec, {
  key: 'folder_events',
  name: 'Folder Events',
  description:
    'Observe immediate children of explicitly selected folders using Google Drive change notifications.',
  selectionSchema: driveFolderSelectionSchema,
  eventSchema: driveFileEventSchema
})
  .webhook({
    autoRegistration: {
      webhookTargetList: targetList,
      webhookRegister: register,
      webhookRenew: renew,
      webhookUnregister: unregister
    },
    process: processWebhook,
    expandWebhook: expand,
    reconcileIntervalSeconds: 900
  })
  .routingMatchers(async ctx => [
    { driveAccountId: await driveAccountId(new GoogleDriveClient(ctx.auth.token)) }
  ])
  .build();
