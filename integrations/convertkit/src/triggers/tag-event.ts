import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let tagEvent = SlateTrigger.create(spec, {
  name: 'Tag Event',
  key: 'tag_event',
  description:
    'Fires when a tag is added to or removed from a subscriber. Requires specifying a tag ID to monitor.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      tagId: z.number().describe('Tag ID that was added or removed'),
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
      tagId: z.number().describe('The tag ID that was added or removed'),
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('First name'),
      emailAddress: z.string().describe('Email address'),
      state: z.string().describe('Current subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // We need to register for all tags. Since the API requires a specific tag_id,
      // we list all tags and register webhooks for each.
      // In practice, users would typically want to monitor specific tags.
      // We register both add and remove events.
      let tagsResult = await client.listTags({ perPage: 500 });
      let webhookIds: number[] = [];

      for (let tag of tagsResult.tags) {
        let addWebhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
          name: 'subscriber.tag_add',
          tagId: tag.id
        });
        webhookIds.push(addWebhook.id);

        let removeWebhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
          name: 'subscriber.tag_remove',
          tagId: tag.id
        });
        webhookIds.push(removeWebhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: number[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let subscriber = body.subscriber;

      if (!subscriber) {
        return { inputs: [] };
      }

      let eventName = body.event_name || body.name || 'subscriber.tag_add';
      let tagId = body.tag?.id || body.tag_id || 0;

      return {
        inputs: [
          {
            eventName,
            tagId,
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
      let eventType = ctx.input.eventName.includes('tag_remove') ? 'tag.removed' : 'tag.added';

      return {
        type: eventType,
        id: `${eventType}-${ctx.input.tagId}-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          tagId: ctx.input.tagId,
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
