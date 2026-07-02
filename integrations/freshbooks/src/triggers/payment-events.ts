import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { handleWebhookVerification, parseWebhookRequest } from '../lib/webhook-helpers';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description: 'Triggered when payments are created, updated, or deleted in FreshBooks.'
})
  .input(
    z.object({
      eventName: z.string(),
      objectId: z.string(),
      accountId: z.string(),
      businessId: z.string().optional(),
      identityId: z.string().optional()
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('ID of the affected payment'),
      accountId: z.string().describe('FreshBooks account ID'),
      eventName: z.string().describe('Full event name (e.g. payment.create)'),
      identityId: z.string().optional().describe('User who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FreshBooksClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        businessId: ctx.config.businessId
      });
      let callback = await client.createWebhook('payment', ctx.input.webhookBaseUrl);
      return { registrationDetails: { callbackId: callback.callbackid } };
    },
    autoUnregisterWebhook: async ctx => {
      let client = new FreshBooksClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        businessId: ctx.config.businessId
      });
      await client.deleteWebhook(ctx.input.registrationDetails.callbackId);
    },
    handleRequest: async ctx => {
      let client = new FreshBooksClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId,
        businessId: ctx.config.businessId
      });
      let parsed = await parseWebhookRequest(ctx.request);
      if (parsed.isVerification) {
        await handleWebhookVerification(client, parsed);
        return { inputs: [] };
      }
      if (!parsed.eventName) return { inputs: [] };
      return {
        inputs: [
          {
            eventName: parsed.eventName,
            objectId: parsed.objectId,
            accountId: parsed.accountId,
            businessId: parsed.businessId,
            identityId: parsed.identityId
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let action = ctx.input.eventName.split('.')[1] || 'unknown';
      return {
        type: `payment.${action}`,
        id: `${ctx.input.eventName}-${ctx.input.objectId}-${Date.now()}`,
        output: {
          paymentId: ctx.input.objectId,
          accountId: ctx.input.accountId,
          eventName: ctx.input.eventName,
          identityId: ctx.input.identityId
        }
      };
    }
  })
  .build();
