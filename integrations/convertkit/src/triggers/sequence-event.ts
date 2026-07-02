import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sequenceEvent = SlateTrigger.create(spec, {
  name: 'Sequence Event',
  key: 'sequence_event',
  description:
    'Fires when a subscriber is added to or completes a sequence. Registers webhooks for all sequences.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      sequenceId: z.number().describe('Sequence ID'),
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
      sequenceId: z.number().describe('Sequence ID'),
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
      let sequencesResult = await client.listSequences({ perPage: 500 });
      let webhookIds: number[] = [];

      for (let seq of sequencesResult.sequences) {
        let subscribeWebhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
          name: 'subscriber.course_subscribe',
          sequenceId: seq.id
        });
        webhookIds.push(subscribeWebhook.id);

        let completeWebhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
          name: 'subscriber.course_complete',
          sequenceId: seq.id
        });
        webhookIds.push(completeWebhook.id);
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

      let eventName = body.event_name || body.name || 'subscriber.course_subscribe';
      let sequenceId = body.course?.id || body.sequence?.id || body.sequence_id || 0;

      return {
        inputs: [
          {
            eventName,
            sequenceId,
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
      let eventType = ctx.input.eventName.includes('complete')
        ? 'sequence.completed'
        : 'sequence.subscribed';

      return {
        type: eventType,
        id: `${eventType}-${ctx.input.sequenceId}-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          sequenceId: ctx.input.sequenceId,
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
