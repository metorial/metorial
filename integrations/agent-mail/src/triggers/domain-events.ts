import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let domainEvents = SlateTrigger.create(spec, {
  name: 'Domain Events',
  key: 'domain_events',
  description:
    'Triggered when a custom domain is successfully verified and ready to use for sending emails.'
})
  .input(
    z.object({
      eventType: z.literal('domain.verified').describe('Type of domain event'),
      eventId: z.string().describe('Unique event identifier'),
      domainId: z.string().describe('ID of the verified domain'),
      domain: z.string().describe('Domain name'),
      status: z.string().describe('Domain verification status')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the verified domain'),
      domain: z.string().describe('Domain name'),
      status: z.string().describe('Domain verification status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, ['domain.verified']);

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        type: string;
        event_type: string;
        event_id: string;
        domain?: {
          domain_id: string;
          domain: string;
          status: string;
        };
      };

      if (body.event_type !== 'domain.verified') {
        return { inputs: [] };
      }

      let domain = body.domain;

      return {
        inputs: [
          {
            eventType: 'domain.verified' as const,
            eventId: body.event_id,
            domainId: domain?.domain_id || '',
            domain: domain?.domain || '',
            status: domain?.status || 'VERIFIED'
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'domain.verified',
        id: ctx.input.eventId,
        output: {
          domainId: ctx.input.domainId,
          domain: ctx.input.domain,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
