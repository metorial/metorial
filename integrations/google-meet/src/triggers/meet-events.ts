import {
  googlePubSubDeliveryConfig,
  verifyGooglePubSubPushForProcessing
} from '@slates/google-pubsub';
import {
  anyOf,
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError,
  pruneSeenEntries,
  SlateTrigger,
  skipWebhook,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { isMeetResourceInaccessible } from '../lib/errors';
import { artifactEventTypes, MeetEventsClient, userTarget } from '../lib/events-client';
import type { ConferenceRecord, Recording, Transcript } from '../lib/types';
import { googleMeetScopes } from '../scopes';
import { spec } from '../spec';
import {
  artifactSchema,
  notificationSchema,
  savedRegistrationSchema,
  stateSchema
} from './event-schemas';
import {
  assertMeetOwner,
  meetAutoRegistration,
  reconcileMeetSubscription
} from './registration';

const DEDUPE_RETENTION_MS = 31 * 86400_000;
export const MAX_REMEMBERED_ARTIFACTS = 10_000;
// Artifact name to event time: entries inside the retention window, newest first up to the limit.
const remembered = (seen: Record<string, string>) =>
  Object.fromEntries(
    pruneSeenEntries(
      Object.entries(seen).map(([key, time]) => ({ key, at: Date.parse(time) })),
      { cutoff: Date.now() - DEDUPE_RETENTION_MS, maxEntries: MAX_REMEMBERED_ARTIFACTS }
    ).map(({ key }) => [key, seen[key]!])
  );
const attributesSchema = z.object({
  'ce-specversion': z.literal('1.0'),
  'ce-datacontenttype': z.literal('application/json'),
  'ce-id': z.string().min(1),
  'ce-source': z.string().min(1),
  'ce-subject': z.string().min(1),
  'ce-time': z.iso.datetime({ offset: true }),
  'ce-type': z.string().min(1)
});

export const meetArtifactEvents = triggerGroup(spec, {
  key: 'meet_artifacts',
  name: 'Meeting artifacts',
  description:
    'Transcripts and recordings generated for meetings the connected user owns, and transcripts of meetings the user was invited to when the user can access them.',
  eventSchema: z
    .object({
      kind: z.enum(['meet_artifact_notification', 'transcript_ready', 'recording_ready'])
    })
    .passthrough()
})
  .webhook({
    googlePubSub: { product: 'meet' },
    deliveryConfig: googlePubSubDeliveryConfig('meet'),
    autoRegistration: meetAutoRegistration,
    reconcileIntervalSeconds: 900,
    process: async ctx => {
      const registration = savedRegistrationSchema.safeParse(
        ctx.input.webhookRegistrationPayload
      );
      if (!registration.success)
        return skipWebhook('invalid_meet_registration', { status: 500 });
      const saved = registration.data;
      const verified = await verifyGooglePubSubPushForProcessing(
        ctx.input.request,
        saved.infrastructure
      );
      if (!verified.ok) return verified.skipped;
      const attributes = attributesSchema.safeParse(verified.message.attributes);
      if (!attributes.success) return skipWebhook('invalid_meet_cloudevent', { status: 400 });
      const ce = attributes.data;
      const acceptedSources = [
        saved.subscriptionName,
        ...saved.previousSubscriptions
          .filter(item => Date.parse(item.acceptUntil) > Date.now())
          .map(item => item.name)
      ];
      if (
        !acceptedSources.some(
          name => ce['ce-source'] === `//workspaceevents.googleapis.com/${name}`
        )
      )
        return skipWebhook('meet_subscription_mismatch', { status: 403 });
      const type = ce['ce-type'];
      // Lifecycle events are delivered automatically; never call them artifacts.
      if (!artifactEventTypes.some(candidate => candidate === type)) return { events: [] };
      const transcript = type === artifactEventTypes[0];
      const data = z
        .object({
          transcript: z.object({ name: z.string() }).optional(),
          recording: z.object({ name: z.string() }).optional()
        })
        .safeParse(verified.message.data);
      if (!data.success) return skipWebhook('invalid_meet_artifact', { status: 400 });
      const artifactName = transcript ? data.data.transcript?.name : data.data.recording?.name;
      const notification = notificationSchema.safeParse({
        kind: 'meet_artifact_notification',
        ownerId: saved.ownerId,
        eventId: ce['ce-id'],
        eventTime: ce['ce-time'],
        eventType: type,
        subject: ce['ce-subject'],
        artifactName
      });
      if (
        !notification.success ||
        !artifactName?.includes(transcript ? '/transcripts/' : '/recordings/')
      )
        return skipWebhook('invalid_meet_artifact', { status: 400 });
      if (Date.parse(notification.data.eventTime) > Date.now() + 5 * 60_000)
        return skipWebhook('future_meet_event', { status: 400 });
      if (
        Date.parse(notification.data.eventTime) < Date.parse(saved.startedAt) ||
        Date.parse(notification.data.eventTime) < Date.now() - DEDUPE_RETENTION_MS
      )
        return { events: [] };
      return {
        events: [
          {
            payload: notification.data,
            matchers: [],
            idempotencyKey: `${saved.ownerId}:${notification.data.eventId}`
          }
        ]
      };
    },
    expandWebhook: async ctx => {
      const saved = parseWithServiceError(
        savedRegistrationSchema,
        ctx.input.webhookRegistrationPayload,
        'The saved meeting subscription is invalid.'
      );
      const eventsClient = new MeetEventsClient(ctx.auth.token);
      await assertMeetOwner(eventsClient, saved.ownerId);
      const state = parseWithServiceError(
        stateSchema,
        ctx.input.state ?? { version: 1, ownerId: saved.ownerId, seen: {} },
        'The saved meeting event state is invalid.'
      );
      if (state.ownerId !== saved.ownerId)
        throw createApiServiceError(
          'The saved meeting event state belongs to a different Google account.'
        );
      const seen = remembered(state.seen);
      if (ctx.input.payload === null) {
        // Conference history includes every meeting this user attended, with no
        // event to pair it with. Checking the subscription cannot broaden the scope.
        if (!(await reconcileMeetSubscription(eventsClient, saved)))
          ctx.warn({
            message:
              'The saved meeting event subscription no longer exists. The next renewal replaces it.',
            data: { reason: 'meet_subscription_missing' }
          });
        return { events: [], updatedState: { ...state, seen } };
      }
      const notification = parseWithServiceError(
        notificationSchema,
        ctx.input.payload,
        'The meeting artifact notification is invalid.'
      );
      if (notification.ownerId !== saved.ownerId)
        throw createApiServiceError(
          'The meeting artifact notification belongs to a different Google account.'
        );
      const eventTime = Date.parse(notification.eventTime);
      if (
        eventTime < Date.parse(saved.startedAt) ||
        eventTime < Date.now() - DEDUPE_RETENTION_MS ||
        seen[notification.artifactName]
      )
        return { events: [], updatedState: { ...state, seen } };
      if (eventTime > Date.now() + 5 * 60_000)
        throw createApiServiceError('The meeting artifact timestamp is in the future.');
      const transcript = notification.eventType === artifactEventTypes[0];
      if (!notification.artifactName.includes(transcript ? '/transcripts/' : '/recordings/'))
        throw createApiServiceError(
          'The meeting artifact resource type does not match its event.'
        );
      const client = new MeetClient({ token: ctx.auth.token });
      // Events also arrive for meetings the user was only invited to, whose details may stay unreadable.
      const skipInaccessible = (error: unknown) => {
        if (!isMeetResourceInaccessible(error)) throw error;
        ctx.warn({
          message: 'Skipped a meeting artifact the connected account cannot access.',
          data: {
            reason: 'meet_artifact_inaccessible',
            upstreamStatus: getUpstreamErrorStatus(error),
            eventType: notification.eventType
          }
        });
        return { events: [], updatedState: { ...state, seen } };
      };
      let artifact: Transcript | Recording;
      try {
        artifact = transcript
          ? await client.getTranscript(notification.artifactName)
          : await client.getRecording(notification.artifactName);
      } catch (error) {
        return skipInaccessible(error);
      }
      if (artifact.name !== notification.artifactName || artifact.state !== 'FILE_GENERATED')
        throw createApiServiceError(
          'Google has not confirmed the generated meeting artifact. Retry when the artifact is ready.'
        );
      const conferenceRecordName = notification.artifactName.split('/').slice(0, 2).join('/');
      let conference: ConferenceRecord;
      try {
        conference = await client.getConferenceRecord(conferenceRecordName);
      } catch (error) {
        return skipInaccessible(error);
      }
      if (
        conference.name !== conferenceRecordName ||
        !conference.space ||
        !/^spaces\/[A-Za-z0-9_-]+$/.test(conference.space)
      )
        throw createApiServiceError(
          'Google returned an unexpected conference for the meeting artifact.'
        );
      const acceptedSubjects = [
        userTarget(saved.ownerId),
        `//meet.googleapis.com/${conference.space}`,
        `//meet.googleapis.com/${conferenceRecordName}`,
        `//meet.googleapis.com/${notification.artifactName}`
      ];
      if (!acceptedSubjects.includes(notification.subject))
        throw createApiServiceError(
          'The meeting event subject does not match its artifact or meeting space.'
        );
      const document = 'docsDestination' in artifact ? artifact.docsDestination : undefined;
      const recording = 'driveDestination' in artifact ? artifact.driveDestination : undefined;
      const url = document?.exportUri ?? recording?.exportUri ?? null;
      const output = parseWithServiceError(
        artifactSchema,
        {
          kind: transcript ? 'transcript_ready' : 'recording_ready',
          eventId: notification.eventId,
          eventTime: notification.eventTime,
          ownerId: saved.ownerId,
          artifactName: artifact.name,
          conferenceRecordName,
          spaceName: conference.space,
          state: 'FILE_GENERATED',
          startTime: artifact.startTime ?? null,
          endTime: artifact.endTime ?? null,
          documentId: document?.document ?? null,
          recordingFileId: recording?.file ?? null,
          url
        },
        'Google returned invalid meeting artifact metadata.'
      );
      return {
        events: [{ payload: output, idempotencyKey: `${saved.ownerId}:${artifact.name}` }],
        updatedState: {
          ...state,
          seen: remembered({ ...seen, [notification.artifactName]: notification.eventTime })
        }
      };
    }
  })
  .routingMatchers(async () => [])
  .build();

const artifactTrigger = (
  kind: 'transcript_ready' | 'recording_ready',
  name: string,
  description: string
) =>
  SlateTrigger.create(spec, { key: kind, name, description })
    .triggerGroup(meetArtifactEvents)
    .input(artifactSchema)
    .output(artifactSchema)
    .scopes(anyOf(googleMeetScopes.spaceReadonly))
    .matches(value => {
      const parsed = artifactSchema.safeParse(value);
      return parsed.success && parsed.data.kind === kind;
    })
    .map(async ctx => ({
      type: `meet.${kind}`,
      id: `${ctx.input.ownerId}:${ctx.input.artifactName}`,
      output: ctx.input
    }))
    .build();

export const transcriptReady = artifactTrigger(
  'transcript_ready',
  'Transcript ready',
  'A transcript file is generated for a meeting you own, or for a meeting you were invited to when you can access its transcript. Returns its document link and identifiers.'
);
export const recordingReady = artifactTrigger(
  'recording_ready',
  'Recording ready',
  'A recording file is generated for a meeting you own. Returns its video link and identifiers.'
);
