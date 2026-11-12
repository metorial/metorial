import { randomUUID } from 'node:crypto';
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
  type SlateTriggerGroupWebhookAutoRegistrationParameters,
  type SlateWebhookTarget
} from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import {
  type CalendarRegistration,
  calendarRegistrationSchema,
  calendarTargetSchema
} from './event-schemas';
import { drainCalendarChanges } from './sync';

const CHANNEL_TTL_SECONDS = 7 * 24 * 60 * 60;
const RENEW_WINDOW = { beforeExpiryMs: 24 * 60 * 60 * 1000 };
const CHANNEL_LABELS = { integration: 'google_calendar', label: 'Google Calendar' };
const readableRoles = new Set(['reader', 'writer', 'writerWithoutPrivateAccess', 'owner']);
// Holidays, contacts' birthdays and week numbers reject watches with pushNotSupportedForRequestedResource.
const googleGeneratedCalendar = /@group\.v\.calendar\.google\.com$/i;
const targetId = (calendarId: string) => `calendar:${calendarId}`;

export const currentCalendarOwner = async (client: GoogleCalendarClient) => {
  const user = await client.getCurrentUser();
  if (!user.id)
    throw createApiServiceError('Google did not return the connected account identity.');
  return user.id;
};

const assertOwner = async (client: GoogleCalendarClient, ownerId: string) => {
  if ((await currentCalendarOwner(client)) !== ownerId) {
    throw createApiServiceError(
      'The calendar channel must be managed by the Google account that created it.'
    );
  }
};

const validateTarget = async (
  client: GoogleCalendarClient,
  identifier: string,
  payload: unknown
) => {
  const target = parseWithServiceError(
    calendarTargetSchema,
    payload,
    'The calendar notification target is invalid.'
  );
  if (identifier !== targetId(target.calendarId))
    throw createApiServiceError('The calendar notification target identity does not match.');
  await assertOwner(client, target.ownerId);
  const calendar = await client.getCalendarListEntry(target.calendarId);
  if (
    calendar.id !== target.calendarId ||
    calendar.deleted ||
    !readableRoles.has(calendar.accessRole ?? '')
  ) {
    throw createApiServiceError(
      'The connected account can no longer read events on this calendar.'
    );
  }
  return target;
};

const createChannel = (
  client: GoogleCalendarClient,
  calendarId: string,
  webhookUrl: string,
  id: string,
  token: string
) =>
  createVerifiedChannel({
    ...CHANNEL_LABELS,
    webhookUrl,
    id,
    token,
    watch: () =>
      client.watchEvents(calendarId, {
        id,
        token,
        type: 'web_hook',
        address: webhookUrl,
        params: { ttl: String(CHANNEL_TTL_SECONDS) }
      }),
    resourceUriMatches: uri =>
      uri.origin === 'https://www.googleapis.com' &&
      decodeURIComponent(uri.pathname) === `/calendar/v3/calendars/${calendarId}/events`,
    stop: (channelId, resourceId) => client.stopChannel(channelId, resourceId)
  });

const registrationResult = (saved: CalendarRegistration) => ({
  webhookRegistrationIdentifier: saved.channel.id,
  webhookRegistrationPayload: saved,
  expiresAt: saved.channel.expiresAt,
  renewAfter: channelRenewAfter(saved.channel.expiresAt, RENEW_WINDOW)
});

export const calendarAutoRegistration = {
  webhookTargetList: async ctx => {
    const page =
      ctx.input.pageToken === null
        ? undefined
        : parseWithServiceError(
            z.string().min(1),
            ctx.input.pageToken,
            'The calendar target page token is invalid.'
          );
    const client = new GoogleCalendarClient(ctx.auth.token);
    const ownerId = await currentCalendarOwner(client);
    const result = await client.listCalendarList({
      maxResults: 250,
      pageToken: page,
      minAccessRole: 'reader',
      showHidden: true
    });
    const seen = new Set<string>();
    const targets: SlateWebhookTarget[] = [];
    for (const calendar of result.items ?? []) {
      if (
        !calendar.id ||
        calendar.id === 'primary' ||
        calendar.deleted ||
        !readableRoles.has(calendar.accessRole ?? '') ||
        googleGeneratedCalendar.test(calendar.id) ||
        seen.has(calendar.id)
      )
        continue;
      seen.add(calendar.id);
      targets.push({
        webhookTargetIdentifier: targetId(calendar.id),
        webhookTargetPayload: { calendarId: calendar.id, ownerId },
        name: calendar.summaryOverride ?? calendar.summary ?? calendar.id,
        metadata: { calendarId: calendar.id, accessRole: calendar.accessRole },
        targetOwnership: 'single_user'
      });
    }
    return { targets, nextPageToken: result.nextPageToken ?? null };
  },
  webhookRegister: async ctx => {
    const client = new GoogleCalendarClient(ctx.auth.token);
    const target = await validateTarget(
      client,
      ctx.input.webhookTargetIdentifier,
      ctx.input.webhookTargetPayload
    );
    // An oversized calendar keeps its page position; later runs finish the silent baseline.
    const baseline = await drainCalendarChanges(client, target.calendarId, {}, true);
    const channel = await createChannel(
      client,
      target.calendarId,
      ctx.input.webhookUrl,
      ctx.input.operationId
        ? registrationChannelId(
            ctx.input.webhookTargetIdentifier,
            ctx.input.webhookUrl,
            ctx.input.operationId
          )
        : randomUUID(),
      newGoogleWatchChannelToken()
    );
    return registrationResult({
      ...target,
      ...(baseline.syncToken
        ? { initialSyncToken: baseline.syncToken }
        : { initialPageToken: baseline.pageToken }),
      tokenSeed: newGoogleWatchChannelToken(),
      channel,
      previousChannels: []
    });
  },
  webhookRenew: async ctx => {
    const client = new GoogleCalendarClient(ctx.auth.token);
    const saved = parseWithServiceError(
      calendarRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved calendar channel is invalid.'
    );
    const target = await validateTarget(
      client,
      ctx.input.webhookTargetIdentifier,
      ctx.input.webhookTargetPayload
    );
    if (
      saved.calendarId !== target.calendarId ||
      saved.ownerId !== target.ownerId ||
      (ctx.input.webhookRegistrationIdentifier &&
        ctx.input.webhookRegistrationIdentifier !== saved.channel.id)
    ) {
      throw createApiServiceError(
        'The saved calendar channel does not match the renewal target.'
      );
    }
    if (!ctx.input.operationId)
      throw createApiServiceError('Calendar channel renewal requires an operation identity.');
    if (saved.renewalOperationId === ctx.input.operationId) return registrationResult(saved);
    // Retries reuse the same channel; a conflict after a lost response stays retryable (no readback).
    const { id, token } = renewalChannelIdentity(
      saved.channel,
      ctx.input.operationId,
      saved.tokenSeed
    );
    const channel = await createChannel(
      client,
      target.calendarId,
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
      calendarRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved calendar channel is invalid.'
    );
    if (
      ctx.input.webhookRegistrationIdentifier &&
      ctx.input.webhookRegistrationIdentifier !== saved.channel.id
    )
      throw createApiServiceError('The saved calendar channel identity does not match.');
    const client = new GoogleCalendarClient(ctx.auth.token);
    await assertOwner(client, saved.ownerId);
    // No channel get/list API: an unconfirmed 404 stays a cleanup failure until expiry.
    await stopLiveChannels([saved.channel, ...saved.previousChannels], channel =>
      client.stopChannel(channel.id, channel.resourceId)
    );
  }
} satisfies SlateTriggerGroupWebhookAutoRegistrationParameters<{}, { token: string }>;
