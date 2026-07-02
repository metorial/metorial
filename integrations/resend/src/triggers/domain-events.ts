import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let domainEventTypes = ['domain.created', 'domain.updated', 'domain.deleted'] as const;

export let domainEvents = SlateTrigger.create(spec, {
  name: 'Domain Events',
  key: 'domain_events',
  description:
    'Triggers when domain events occur such as created, updated (including verification status changes), or deleted.'
})
  .input(
    z.object({
      eventType: z.enum(domainEventTypes).describe('Type of domain event.'),
      eventId: z.string().describe('Unique event identifier.'),
      domainId: z.string().describe('ID of the domain.'),
      name: z.string().optional().describe('Domain name.'),
      status: z.string().optional().describe('Domain verification status.'),
      region: z.string().optional().describe('AWS region.'),
      createdAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .output(
    z.object({
      domainId: z.string().describe('ID of the domain.'),
      name: z.string().optional().describe('Domain name.'),
      status: z.string().optional().describe('Domain verification status.'),
      region: z.string().optional().describe('AWS region.'),
      createdAt: z.string().optional().describe('Event timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: [...domainEventTypes]
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
      if (!domainEventTypes.includes(eventType as any)) {
        return { inputs: [] };
      }

      let domainData = data.data || {};

      return {
        inputs: [
          {
            eventType: eventType as (typeof domainEventTypes)[number],
            eventId: domainData.id
              ? `${eventType}_${domainData.id}_${data.created_at || Date.now()}`
              : `${eventType}_${Date.now()}`,
            domainId: domainData.id || '',
            name: domainData.name,
            status: domainData.status,
            region: domainData.region,
            createdAt: data.created_at || domainData.created_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          domainId: ctx.input.domainId,
          name: ctx.input.name,
          status: ctx.input.status,
          region: ctx.input.region,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
