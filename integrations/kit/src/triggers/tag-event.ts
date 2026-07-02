import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let tagEvent = SlateTrigger.create(spec, {
  name: 'Tag Event',
  key: 'tag_event',
  description:
    'Triggers when a tag is added to or removed from a subscriber. Requires specifying the tag ID to monitor.'
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe('The Kit event name (subscriber.tag_add or subscriber.tag_remove)'),
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      tagId: z.number().describe('The tag ID involved'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      tagId: z.number().describe('The tag ID involved')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let subscriber = data.subscriber || {};
      let eventName = data.event_name || data.name || 'subscriber.tag_add';

      return {
        inputs: [
          {
            eventName,
            subscriberId: subscriber.id ?? 0,
            emailAddress: subscriber.email_address ?? '',
            firstName: subscriber.first_name ?? null,
            state: subscriber.state ?? 'unknown',
            tagId: data.tag?.id ?? data.tag_id ?? 0,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let action = ctx.input.eventName.includes('tag_remove') ? 'tag_remove' : 'tag_add';

      return {
        type: `subscriber.${action}`,
        id: `${ctx.input.eventName}-${ctx.input.subscriberId}-${ctx.input.tagId}-${Date.now()}`,
        output: {
          subscriberId: ctx.input.subscriberId,
          emailAddress: ctx.input.emailAddress,
          firstName: ctx.input.firstName,
          state: ctx.input.state,
          tagId: ctx.input.tagId
        }
      };
    }
  })
  .build();
