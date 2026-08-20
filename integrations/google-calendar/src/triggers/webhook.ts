import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  type SlateWebhookHttpOptions,
  type WebhookWireRequest
} from 'slates';
import { GoogleCalendarClient } from '../lib/client';

let SECRET_NAMES = [
  'google_channel_id',
  'google_resource_id',
  'google_channel_token',
  'google_retiring_channel_id',
  'google_retiring_resource_id',
  'google_retiring_channel_token',
  'google_retiring_valid_until'
] as const;

export let googleCalendarWebhookHttp = {
  methods: ['POST'],
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'provider',
      baseline: 'receiver_path_secret',
      reason: 'Google Calendar binds notifications to channel, resource, and channel token.',
      allowedSecretRefs: [
        {
          source: 'registration',
          name: 'google_channel_id',
          registrationKey: 'channelId',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'google_resource_id',
          registrationKey: 'resourceId',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'google_channel_token',
          registrationKey: 'channelToken',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'google_retiring_channel_id',
          registrationKey: 'retiringChannelId',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'google_retiring_resource_id',
          registrationKey: 'retiringResourceId',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'google_retiring_channel_token',
          registrationKey: 'retiringChannelToken',
          encoding: 'utf8'
        },
        {
          source: 'registration',
          name: 'google_retiring_valid_until',
          registrationKey: 'retiringValidUntil',
          encoding: 'utf8'
        }
      ],
      rules: [
        {
          id: 'google-calendar.delivery.v1',
          phase: 'delivery',
          when: { methods: ['POST'], registrationStatuses: ['registered', 'renewing'] },
          verify: {
            type: 'provider',
            verifierId: 'google_calendar.delivery.v1',
            allowedSecretRefs: [...SECRET_NAMES],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'dispatch', scope: 'receiver_trigger' },
          replay: {
            kind: 'enforced',
            deduplicate: {
              source: 'preset',
              presetField: 'event_id',
              ttlSeconds: 604_800,
              scope: 'request'
            }
          }
        }
      ]
    }
  }
} satisfies SlateWebhookHttpOptions;

let exactHeader = (request: WebhookWireRequest, name: string) => {
  let values = getWebhookHeaderValues(request, name);
  return values.length === 1 && values[0]!.length > 0 ? values[0]! : null;
};

let safeEqual = (first: string, second: string) => {
  let firstBytes = Buffer.from(first, 'utf8');
  let secondBytes = Buffer.from(second, 'utf8');
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
};

export let verifyGoogleCalendarWebhook = async (ctx: {
  input: { originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let request = ctx.input.originalRequest;
  if (decodeWebhookWireBody(request.body) === null) {
    return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }
  let channelId = exactHeader(request, 'x-goog-channel-id');
  let resourceId = exactHeader(request, 'x-goog-resource-id');
  let channelToken = exactHeader(request, 'x-goog-channel-token');
  let messageNumber = exactHeader(request, 'x-goog-message-number');
  if (!channelId || !resourceId || !channelToken || !messageNumber) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let value = (name: string) => ctx.secrets[name]?.value ?? '';
  let active =
    safeEqual(channelId, value('google_channel_id')) &&
    safeEqual(resourceId, value('google_resource_id')) &&
    safeEqual(channelToken, value('google_channel_token'));
  let retiringUntil = Number(value('google_retiring_valid_until'));
  let retiring =
    Number.isFinite(retiringUntil) &&
    retiringUntil >= Date.now() &&
    safeEqual(channelId, value('google_retiring_channel_id')) &&
    safeEqual(resourceId, value('google_retiring_resource_id')) &&
    safeEqual(channelToken, value('google_retiring_channel_token'));
  if (!active && !retiring) {
    return { status: 'rejected' as const, code: 'credential_invalid' as const };
  }
  return {
    status: 'accepted' as const,
    selection: { scope: 'receiver_trigger' as const },
    authenticatedFields: { event_id: `${channelId}:${messageNumber}` }
  };
};

type GoogleRegistrationDetails = {
  channelId: string;
  resourceId: string;
  channelToken: string;
  expiration: string;
  calendarId?: string;
  retiringChannelId: string;
  retiringResourceId: string;
  retiringChannelToken: string;
  retiringValidUntil: string;
};

let channelToken = () => randomBytes(32).toString('base64url');

export let registerGoogleCalendarWebhook = async (
  ctx: {
    auth: { token: string };
    input: {
      webhookBaseUrl: string;
      registrationDetails?: GoogleRegistrationDetails | null;
      capturedSecretVersions: Readonly<Record<string, number>>;
    };
  },
  kind: 'events' | 'calendar_list'
) => {
  let client = new GoogleCalendarClient(ctx.auth.token);
  let prior = ctx.input.registrationDetails;
  if (
    prior?.retiringChannelId &&
    prior.retiringResourceId &&
    prior.retiringChannelId !== prior.channelId
  ) {
    await client.stopChannel(prior.retiringChannelId, prior.retiringResourceId);
  }
  let id = randomUUID();
  let token = channelToken();
  let expiration = String(Date.now() + 6 * 24 * 60 * 60 * 1000);
  let response =
    kind === 'events'
      ? await client.watchEvents('primary', {
          id,
          type: 'web_hook',
          address: ctx.input.webhookBaseUrl,
          token,
          expiration
        })
      : await client.watchCalendarList({
          id,
          type: 'web_hook',
          address: ctx.input.webhookBaseUrl,
          token,
          expiration
        });
  let channelId = response.id || id;
  let resourceId = response.resourceId;
  if (!resourceId) throw new Error('Google Calendar watch response omitted resourceId');
  let details: GoogleRegistrationDetails = {
    channelId,
    resourceId,
    channelToken: token,
    expiration: response.expiration || expiration,
    ...(kind === 'events' ? { calendarId: 'primary' } : {}),
    retiringChannelId: prior?.channelId ?? channelId,
    retiringResourceId: prior?.resourceId ?? resourceId,
    retiringChannelToken: prior?.channelToken ?? token,
    retiringValidUntil: prior ? String(Date.now() + 5 * 60 * 1000) : '0'
  };
  let capturedSecrets = Object.fromEntries(
    [
      ['google_channel_id', details.channelId],
      ['google_resource_id', details.resourceId],
      ['google_channel_token', details.channelToken],
      ['google_retiring_channel_id', details.retiringChannelId],
      ['google_retiring_resource_id', details.retiringResourceId],
      ['google_retiring_channel_token', details.retiringChannelToken],
      ['google_retiring_valid_until', details.retiringValidUntil]
    ].map(([name, value]) => {
      let version = ctx.input.capturedSecretVersions[name!];
      if (!version)
        throw new Error(`Google Calendar secret-version authority is missing: ${name}`);
      return [name, { value, version }];
    })
  );
  if (prior) return { registrationDetails: details, capturedSecrets };
  let sync =
    kind === 'events'
      ? await client.listEvents({ calendarId: 'primary', maxResults: 1, showDeleted: true })
      : await client.listCalendarList({ maxResults: 1 });
  return {
    registrationDetails: details,
    capturedSecrets,
    state: {
      syncToken: sync.nextSyncToken,
      ...(kind === 'events' ? { calendarId: 'primary' } : {})
    }
  };
};

export let unregisterGoogleCalendarWebhook = async (ctx: {
  auth: { token: string };
  input: { registrationDetails?: Partial<GoogleRegistrationDetails> | null };
}) => {
  let client = new GoogleCalendarClient(ctx.auth.token);
  let details = ctx.input.registrationDetails;
  let channels = [
    [details?.channelId, details?.resourceId],
    [details?.retiringChannelId, details?.retiringResourceId]
  ].filter(
    (entry, index, entries): entry is [string, string] =>
      Boolean(entry[0] && entry[1]) &&
      entries.findIndex(other => other[0] === entry[0] && other[1] === entry[1]) === index
  );
  for (let [id, resourceId] of channels) {
    try {
      await client.stopChannel(id, resourceId);
    } catch (error) {
      if ((error as any)?.response?.status !== 404 && (error as any)?.status !== 404) {
        throw error;
      }
    }
  }
};
