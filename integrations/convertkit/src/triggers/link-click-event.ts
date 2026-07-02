import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let linkClickEvent = SlateTrigger.create(spec, {
  name: 'Link Click',
  key: 'link_click_event',
  description:
    'Fires when a subscriber clicks a specific link in an email. The webhook must be registered manually or the link URL must be configured in Kit, as this event requires a specific link URL.'
})
  .input(
    z.object({
      linkUrl: z.string().describe('The URL that was clicked'),
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      emailAddress: z.string().describe('Subscriber email address'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('Subscriber creation timestamp'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .output(
    z.object({
      linkUrl: z.string().describe('The clicked link URL'),
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('First name'),
      emailAddress: z.string().describe('Email address'),
      state: z.string().describe('Current subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let subscriber = body.subscriber;

      if (!subscriber) {
        return { inputs: [] };
      }

      let linkUrl = body.initiator_value || body.link_url || body.url || '';

      return {
        inputs: [
          {
            linkUrl,
            subscriberId: subscriber.id,
            firstName: subscriber.first_name || null,
            emailAddress: subscriber.email_address,
            state: subscriber.state,
            createdAt: subscriber.created_at,
            fields: subscriber.fields || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'link.clicked',
        id: `link-clicked-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          linkUrl: ctx.input.linkUrl,
          subscriberId: ctx.input.subscriberId,
          firstName: ctx.input.firstName,
          emailAddress: ctx.input.emailAddress,
          state: ctx.input.state,
          createdAt: ctx.input.createdAt,
          fields: ctx.input.fields
        }
      };
    }
  });
