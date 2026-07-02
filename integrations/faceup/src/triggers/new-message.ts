import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    'Triggers when a new message from a report sender (whistleblower) is received on an existing case. Configure the webhook in FaceUp admin under Integrations > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      messageId: z.string().describe('Unique identifier for the message'),
      messageCreatedAt: z.string().describe('ISO 8601 timestamp of message creation'),
      authorType: z.string().describe('Type of the message author (e.g., "member")'),
      reportId: z.string().describe('ID of the associated report')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier for the message'),
      messageCreatedAt: z
        .string()
        .describe('ISO 8601 timestamp of when the message was created'),
      authorType: z.string().describe('Type of the message author (e.g., "member")'),
      reportId: z.string().describe('ID of the report this message belongs to')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body?.event !== 'MessageCreated') {
        return { inputs: [] };
      }

      let message = body.data?.message ?? {};
      let author = body.data?.author ?? {};
      let report = body.data?.report ?? {};

      return {
        inputs: [
          {
            eventType: body.event,
            messageId: message.id ?? '',
            messageCreatedAt: message.created_at ?? '',
            authorType: author.type ?? '',
            reportId: report.id ?? ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.created',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          messageCreatedAt: ctx.input.messageCreatedAt,
          authorType: ctx.input.authorType,
          reportId: ctx.input.reportId
        }
      };
    }
  })
  .build();
