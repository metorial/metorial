import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let satisfactionEvents = SlateTrigger.create(spec, {
  name: 'Satisfaction Rating',
  key: 'satisfaction_events',
  description: 'Triggered when a customer submits a satisfaction rating for a conversation.'
})
  .input(
    z.object({
      eventType: z.string().describe('Help Scout event type'),
      ratingId: z.number().describe('Rating ID'),
      rating: z.string().nullable().describe('Rating value (great, okay, not-good)'),
      comment: z.string().nullable().describe('Customer comment'),
      conversationId: z.number().nullable().describe('Related conversation ID'),
      customerEmail: z.string().nullable().describe('Customer email'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      ratingId: z.number().describe('Rating ID'),
      rating: z.string().nullable().describe('Rating value'),
      comment: z.string().nullable().describe('Customer comment'),
      conversationId: z.number().nullable().describe('Related conversation ID'),
      customerEmail: z.string().nullable().describe('Customer email')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: ['satisfaction.ratings'],
        secret,
        payloadVersion: 'V2'
      });

      return {
        registrationDetails: {
          webhookId: result.webhookId,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(Number(webhookId));
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;
      let eventType = data?.event ?? data?.eventType ?? 'satisfaction.ratings';
      let rating = data?.payload?.rating ?? data?.rating ?? data ?? {};

      let ratingId = rating.id ?? 0;
      let ratingValue = rating.rating ?? null;
      let comment = rating.comments ?? rating.comment ?? null;
      let conversationId = rating.conversationId ?? rating.threadId ?? null;
      let customerEmail = rating.customer?.email ?? null;

      let webhookId = `${eventType}-${ratingId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            ratingId,
            rating: ratingValue,
            comment,
            conversationId,
            customerEmail,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'satisfaction.rating_received',
        id: ctx.input.webhookId,
        output: {
          ratingId: ctx.input.ratingId,
          rating: ctx.input.rating,
          comment: ctx.input.comment,
          conversationId: ctx.input.conversationId,
          customerEmail: ctx.input.customerEmail
        }
      };
    }
  })
  .build();
