import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description: 'Triggered when an email address is unsubscribed from referral communications.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of email event'),
      eventId: z.string().describe('Unique event identifier'),
      emailData: z
        .record(z.string(), z.unknown())
        .describe('Email event data from webhook payload')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Unsubscribed email address')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, 'EmailUnsubscribed');
      return { registrationDetails: { EmailUnsubscribed: result.web_hook_id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds = ctx.input.registrationDetails as Record<string, string>;

      for (let id of Object.values(webhookIds)) {
        try {
          await client.unregisterWebhook(id);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.Event || 'EmailUnsubscribed') as string;
      let emailData = (data.data || data.Data || data) as Record<string, unknown>;
      let email = (emailData.email || emailData.Email || '') as string;

      let eventId = `${eventType}-${email}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            emailData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.emailData;
      let email = (d.email || d.Email || '') as string;

      return {
        type: 'email.unsubscribed',
        id: ctx.input.eventId,
        output: {
          email
        }
      };
    }
  })
  .build();
