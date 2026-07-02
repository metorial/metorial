import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let ORGANIZATION_EVENTS = [
  'organization.created',
  'organization.updated',
  'organization.deleted'
] as const;

export let organizationEvents = SlateTrigger.create(spec, {
  name: 'Organization Events',
  key: 'organization_events',
  description: 'Triggered when organizations are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Help Scout event type'),
      organizationId: z.number().describe('Organization ID'),
      name: z.string().nullable().describe('Organization name'),
      webhookId: z.string().describe('Webhook delivery identifier')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('Organization ID'),
      name: z.string().nullable().describe('Organization name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HelpScoutClient(ctx.auth.token);
      let secret = crypto.randomUUID();
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...ORGANIZATION_EVENTS],
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
      let eventType = data?.event ?? data?.eventType ?? '';
      let org = data?.payload?.organization ?? data?.organization ?? data ?? {};

      let organizationId = org.id ?? 0;
      let name = org.name ?? null;

      let webhookId = `${eventType}-${organizationId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            organizationId,
            name,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'organization.created': 'organization.created',
        'organization.updated': 'organization.updated',
        'organization.deleted': 'organization.deleted'
      };

      return {
        type: typeMap[ctx.input.eventType] ?? `organization.${ctx.input.eventType}`,
        id: ctx.input.webhookId,
        output: {
          organizationId: ctx.input.organizationId,
          name: ctx.input.name
        }
      };
    }
  })
  .build();
