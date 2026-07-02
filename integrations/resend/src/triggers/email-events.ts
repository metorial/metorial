import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailEventTypes = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.complained',
  'email.bounced',
  'email.opened',
  'email.clicked',
  'email.received',
  'email.failed'
] as const;

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Triggers when email events occur such as sent, delivered, bounced, opened, clicked, complained, delivery delayed, received, or failed.'
})
  .input(
    z.object({
      eventType: z.enum(emailEventTypes).describe('Type of email event.'),
      eventId: z.string().describe('Unique event identifier.'),
      emailId: z.string().describe('ID of the email.'),
      from: z.string().optional().describe('Sender address.'),
      to: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Recipient address(es).'),
      subject: z.string().optional().describe('Email subject.'),
      createdAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('ID of the email.'),
      from: z.string().optional().describe('Sender address.'),
      to: z.array(z.string()).optional().describe('Recipient address(es).'),
      subject: z.string().optional().describe('Email subject.'),
      createdAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: [...emailEventTypes]
      });

      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type as string;
      if (!emailEventTypes.includes(eventType as any)) {
        return { inputs: [] };
      }

      let emailData = data.data || {};
      let to = emailData.to;
      if (typeof to === 'string') {
        to = [to];
      }

      return {
        inputs: [
          {
            eventType: eventType as (typeof emailEventTypes)[number],
            eventId: data.data?.email_id
              ? `${eventType}_${data.data.email_id}_${data.created_at || Date.now()}`
              : `${eventType}_${Date.now()}`,
            emailId: emailData.email_id || emailData.id || '',
            from: emailData.from,
            to: to,
            subject: emailData.subject,
            createdAt: data.created_at || emailData.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let to = ctx.input.to;
      let toArray = Array.isArray(to) ? to : to ? [to] : undefined;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          emailId: ctx.input.emailId,
          from: ctx.input.from,
          to: toArray,
          subject: ctx.input.subject,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
