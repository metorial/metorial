import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let userObjectSchema = z.object({
  userId: z.string().describe('Internal Userlist user ID.'),
  identifier: z
    .string()
    .optional()
    .nullable()
    .describe('Application-provided user identifier.'),
  email: z.string().optional().nullable().describe('User email address.'),
  signedUpAt: z.string().optional().nullable().describe('When the user signed up.'),
  lastSeenAt: z.string().optional().nullable().describe('When the user was last seen.'),
  unsubscribedAt: z
    .string()
    .optional()
    .nullable()
    .describe('When the user unsubscribed, if applicable.'),
  optedInAt: z.string().optional().nullable().describe('When the user opted in.'),
  properties: z.record(z.string(), z.unknown()).optional().describe('Custom user properties.'),
  createdAt: z.string().optional().describe('When the user record was created.'),
  updatedAt: z.string().optional().describe('When the user record was last updated.')
});

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when a user is created, updated, subscribes, or unsubscribes in Userlist.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name.'),
      eventId: z.string().describe('Unique event ID for deduplication.'),
      user: z
        .record(z.string(), z.unknown())
        .describe('Raw user object from the webhook payload.'),
      topicId: z
        .string()
        .optional()
        .nullable()
        .describe('Topic ID for subscribe/unsubscribe events.'),
      topicName: z
        .string()
        .optional()
        .nullable()
        .describe('Topic name for subscribe/unsubscribe events.'),
      occurredAt: z.string().describe('When the event occurred.')
    })
  )
  .output(
    userObjectSchema.extend({
      topicId: z
        .string()
        .optional()
        .nullable()
        .describe('Topic ID for subscribe/unsubscribe events.'),
      topicName: z
        .string()
        .optional()
        .nullable()
        .describe('Topic name for subscribe/unsubscribe events.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventName = data.name as string;

      let validEvents = [
        'user_created',
        'user_updated',
        'user_subscribed',
        'user_unsubscribed'
      ];
      if (!validEvents.includes(eventName)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            eventId: data.id,
            user: data.user || {},
            topicId: data.properties?.topic_id || null,
            topicName: data.properties?.topic_name || null,
            occurredAt: data.occurred_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.user as any;

      return {
        type: ctx.input.eventName,
        id: ctx.input.eventId,
        output: {
          userId: user.id || '',
          identifier: user.identifier || null,
          email: user.email || null,
          signedUpAt: user.signed_up_at || null,
          lastSeenAt: user.last_seen_at || null,
          unsubscribedAt: user.unsubscribed_at || null,
          optedInAt: user.opted_in_at || null,
          properties: user.properties || {},
          createdAt: user.created_at || undefined,
          updatedAt: user.updated_at || undefined,
          topicId: ctx.input.topicId,
          topicName: ctx.input.topicName
        }
      };
    }
  })
  .build();
