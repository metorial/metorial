import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let partnerEvents = SlateTrigger.create(spec, {
  name: 'Partner Events',
  key: 'partner_events',
  description:
    'Triggers for partner/affiliate program events including partner enrollment, application submissions, commission creation, and payout confirmations.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of partner event'),
      eventId: z.string().describe('Unique event ID'),
      partnerData: z.any().describe('Partner event data from the webhook payload'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      partnerId: z.string().nullable().describe('ID of the partner'),
      partnerName: z.string().nullable().describe('Name of the partner'),
      partnerEmail: z.string().nullable().describe('Email of the partner'),
      programId: z.string().nullable().describe('ID of the program'),
      commissionAmount: z
        .number()
        .nullable()
        .describe('Commission amount (for commission events)'),
      payoutAmount: z.number().nullable().describe('Payout amount (for payout events)'),
      timestamp: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates - Partner Events',
        triggers: [
          'partner.enrolled',
          'partner.application_submitted',
          'commission.created',
          'payout.confirmed'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        id: string;
        event: string;
        createdAt: string;
        data: any;
      };

      return {
        inputs: [
          {
            eventType: body.event,
            eventId: body.id,
            partnerData: body.data,
            timestamp: body.createdAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.partnerData;
      let partner = data.partner ?? data;
      let commission = data.commission ?? {};
      let payout = data.payout ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          partnerId: partner.id ?? null,
          partnerName: partner.name ?? null,
          partnerEmail: partner.email ?? null,
          programId: data.programId ?? partner.programId ?? null,
          commissionAmount: commission.amount ?? null,
          payoutAmount: payout.amount ?? null,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
