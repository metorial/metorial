import { googleWatchChannelSchema } from '@slates/google-push-channels';
import { z } from 'zod';

export const lifecycleNames = ['CREATE_USER', 'SUSPEND_USER', 'DELETE_USER'] as const;
export const lifecycleNameSchema = z.enum(lifecycleNames);
export const selectionSchema = z.object({
  customerId: z
    .string()
    .min(1)
    .describe('Workspace customer ID returned by get_customer_info.')
});
export const identitySchema = selectionSchema.extend({
  ownerId: z.string().min(1),
  customerDomain: z.string().optional()
});
const channelSchema = googleWatchChannelSchema.extend({ resourceUri: z.url() });
export const registrationSchema = identitySchema.extend({
  startedAt: z.iso.datetime(),
  channel: channelSchema,
  previousChannels: z.array(channelSchema),
  renewalOperationId: z.string().optional(),
  tokenSeed: z.string().min(1).optional()
});
export type AdminRegistration = z.infer<typeof registrationSchema>;

export const auditEventSchema = z
  .object({
    type: z.string().min(1),
    name: z.string().min(1),
    status: z.object({ eventStatus: z.string().optional() }).passthrough().optional(),
    parameters: z
      .array(z.object({ name: z.string(), value: z.string().optional() }).passthrough())
      .default([])
  })
  .passthrough();
export const activitySchema = z
  .object({
    kind: z.literal('admin#reports#activity'),
    id: z
      .object({
        time: z.iso.datetime({ offset: true }),
        uniqueQualifier: z.string().min(1),
        applicationName: z.literal('admin'),
        customerId: z.string().min(1)
      })
      .passthrough(),
    actor: z
      .object({ email: z.string().optional(), profileId: z.string().optional() })
      .passthrough()
      .optional(),
    events: z.array(auditEventSchema)
  })
  .passthrough();
// Records and their events are validated one at a time during reconciliation.
export const activityRecordSchema = activitySchema.extend({ events: z.array(z.unknown()) });
export const activityPageSchema = z.object({
  kind: z.literal('admin#reports#activities'),
  items: z.array(z.unknown()).default([]),
  nextPageToken: z.string().min(1).optional()
});
export const lifecycleEventSchema = z.object({
  kind: z.literal('admin_user_lifecycle'),
  eventId: z.string().min(1),
  customerId: z.string().min(1),
  eventName: lifecycleNameSchema,
  occurredAt: z.iso.datetime({ offset: true }),
  userEmail: z.string().min(1),
  actorEmail: z.string().optional(),
  actorProfileId: z.string().optional()
});
export const stateSchema = z.object({
  version: z.literal(1),
  customerId: z.string().min(1),
  ownerId: z.string().min(1),
  watermark: z.iso.datetime(),
  seen: z.record(z.string(), z.number().finite()),
  // The window and position of an audit read that ran out of budget.
  pending: z
    .object({
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      eventName: lifecycleNameSchema,
      pageToken: z.string().min(1).optional()
    })
    .optional()
});
export const wakeupSchema = z.object({
  kind: z.literal('admin_audit_sync'),
  customerId: z.string().min(1)
});
