import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientEventTypes = ['NEW_CLIENT', 'CLIENT_UPDATED', 'CLIENT_DELETED'] as const;

let eventTypeMap: Record<string, string> = {
  NEW_CLIENT: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted'
};

export let clientEvents = SlateTrigger.create(spec, {
  name: 'Client Events',
  key: 'client_events',
  description: 'Triggered when clients are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      clientData: z.any().describe('Client data from webhook payload')
    })
  )
  .output(
    z.object({
      clientId: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      archived: z.boolean().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of clientEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            clientData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.clientData;
      let clientId = c.id || c.clientId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `client.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${clientId}_${c.changeDate || Date.now()}`,
        output: {
          clientId,
          name: c.name || undefined,
          email: c.email || undefined,
          address: c.address || undefined,
          archived: c.archived,
          workspaceId: c.workspaceId || undefined
        }
      };
    }
  })
  .build();
