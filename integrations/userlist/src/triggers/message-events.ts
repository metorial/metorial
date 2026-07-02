import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when a message is enqueued, opened, or clicked in Userlist. Covers email and in-app message delivery lifecycle events.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name.'),
      eventId: z.string().describe('Unique event ID for deduplication.'),
      user: z
        .record(z.string(), z.unknown())
        .describe('Raw user object from the webhook payload.'),
      messageId: z.string().describe('Message instance identifier.'),
      subject: z
        .string()
        .optional()
        .nullable()
        .describe('Message subject, omitted for transactional messages.'),
      clickedUrl: z
        .string()
        .optional()
        .nullable()
        .describe(
          'Clicked URL for message_clicked events, omitted for transactional messages.'
        ),
      occurredAt: z.string().describe('When the event occurred.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message instance identifier.'),
      subject: z
        .string()
        .optional()
        .nullable()
        .describe('Message subject, omitted for transactional messages.'),
      clickedUrl: z
        .string()
        .optional()
        .nullable()
        .describe('Clicked URL, only present for message_clicked events.'),
      userId: z.string().describe('Internal Userlist user ID of the recipient.'),
      userIdentifier: z
        .string()
        .optional()
        .nullable()
        .describe('Application-provided user identifier.'),
      userEmail: z.string().optional().nullable().describe('User email address.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventName = data.name as string;

      let validEvents = ['message_enqueued', 'message_opened', 'message_clicked'];
      if (!validEvents.includes(eventName)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            eventId: data.id,
            user: data.user || {},
            messageId: data.properties?.message_id || data.message_id || '',
            subject: data.properties?.subject || data.subject || null,
            clickedUrl: data.properties?.url || data.url || null,
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
          messageId: ctx.input.messageId,
          subject: ctx.input.subject,
          clickedUrl: ctx.input.clickedUrl,
          userId: user.id || '',
          userIdentifier: user.identifier || null,
          userEmail: user.email || null
        }
      };
    }
  })
  .build();
