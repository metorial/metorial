import { googlePubSubInfrastructureSchema } from '@slates/google-pubsub';
import { z } from 'zod';
import { artifactEventTypes, subscriptionNameSchema } from '../lib/events-client';

export const targetSchema = z.object({ ownerId: z.string().regex(/^\d+$/) });
// At most 16 routing keys: the current subscription plus still-accepted previous ones.
export const MAX_PREVIOUS_SUBSCRIPTIONS = 15;
export const savedRegistrationSchema = targetSchema.extend({
  subscriptionName: subscriptionNameSchema,
  infrastructure: googlePubSubInfrastructureSchema,
  startedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  previousSubscriptions: z
    .array(
      z.object({
        name: subscriptionNameSchema,
        acceptUntil: z.iso.datetime({ offset: true })
      })
    )
    .max(MAX_PREVIOUS_SUBSCRIPTIONS)
    .default([])
});
export type MeetRegistration = z.infer<typeof savedRegistrationSchema>;

export const notificationSchema = z.object({
  kind: z.literal('meet_artifact_notification'),
  ownerId: z.string().regex(/^\d+$/),
  eventId: z.string().min(1),
  eventTime: z.iso.datetime({ offset: true }),
  eventType: z.enum(artifactEventTypes),
  subject: z.string().min(1).max(2048),
  artifactName: z
    .string()
    .regex(/^conferenceRecords\/[A-Za-z0-9_-]+\/(transcripts|recordings)\/[A-Za-z0-9_-]+$/)
});

export const artifactSchema = z.object({
  kind: z.enum(['transcript_ready', 'recording_ready']),
  eventId: z.string(),
  eventTime: z.iso.datetime({ offset: true }),
  ownerId: z.string(),
  artifactName: z.string(),
  conferenceRecordName: z.string(),
  spaceName: z.string(),
  state: z.literal('FILE_GENERATED'),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  documentId: z.string().nullable(),
  recordingFileId: z.string().nullable(),
  url: z.string().url().nullable()
});

export const stateSchema = z.object({
  version: z.literal(1),
  ownerId: z.string(),
  seen: z.record(z.string(), z.iso.datetime({ offset: true }))
});

export const targetIdentifier = (ownerId: string) => `meet-user:${ownerId}`;
