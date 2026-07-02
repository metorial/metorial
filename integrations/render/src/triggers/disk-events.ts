import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let diskEvents = SlateTrigger.create(spec, {
  name: 'Disk Events',
  key: 'disk_events',
  description: 'Triggers when persistent disks are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      eventId: z.string().describe('Event ID'),
      timestamp: z.string().describe('Event timestamp'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      diskId: z.string().optional().describe('Disk ID'),
      serviceId: z.string().optional().describe('Service the disk is attached to'),
      serviceName: z.string().optional().describe('Service name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);

      let workspaces = await client.listWorkspaces({ limit: 1 });
      let ownerId = (workspaces as any[])?.[0]?.owner?.id;
      if (!ownerId) throw new Error('No workspace found to register webhook');

      let webhook = await client.createWebhook({
        ownerId,
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Disk Events',
        eventTypes: ['disk_created', 'disk_updated', 'disk_deleted']
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type,
            eventId: data.data?.id || `${data.type}-${data.timestamp}`,
            timestamp: data.timestamp,
            payload: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload || {};

      return {
        type: `disk.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          diskId: payload.id,
          serviceId: payload.serviceId,
          serviceName: payload.serviceName
        }
      };
    }
  })
  .build();
