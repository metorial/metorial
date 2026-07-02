import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let formSubscriptionEvent = SlateTrigger.create(spec, {
  name: 'Form Subscription',
  key: 'form_subscription_event',
  description:
    'Fires when a subscriber subscribes via a form. Registers webhooks for all active forms.'
})
  .input(
    z.object({
      formId: z.number().describe('Form ID that was subscribed to'),
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
      formId: z.number().describe('Form ID the subscriber signed up through'),
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
      let client = createClient(ctx.auth);
      let formsResult = await client.listForms({ status: 'active', perPage: 500 });
      let webhookIds: number[] = [];

      for (let form of formsResult.forms) {
        let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
          name: 'subscriber.form_subscribe',
          formId: form.id
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth);
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

      let formId = body.form?.id || body.form_id || 0;

      return {
        inputs: [
          {
            formId,
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
        type: 'form.subscribed',
        id: `form-subscribed-${ctx.input.formId}-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          formId: ctx.input.formId,
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
