import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let componentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Component Events',
  key: 'component_events',
  description:
    'Triggered when components in the product hierarchy change. Components are organizational units within products.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of component event'),
      eventId: z.string().describe('Unique event identifier'),
      componentId: z.string().describe('ID of the affected component'),
      componentName: z.string().optional().describe('Name of the component'),
      raw: z.record(z.string(), z.any()).optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      componentId: z.string().describe('ID of the affected component'),
      componentName: z.string().optional().describe('Name of the component'),
      component: z
        .record(z.string(), z.any())
        .optional()
        .describe('Raw component data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let eventTypes = ['component.created', 'component.updated', 'component.deleted'];
      let webhookIds: string[] = [];

      for (let eventType of eventTypes) {
        try {
          let webhook = await client.createWebhook({
            notificationUrl: ctx.input.webhookBaseUrl,
            eventType
          });
          webhookIds.push(webhook.id);
        } catch {
          // Some event types may not be available
        }
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;

      if (body.type === 'probe' || body.eventType === 'probe') {
        return { inputs: [] };
      }

      let eventType = body.eventType || body.type || 'component.updated';
      let componentData = body.data || body;
      let componentId = componentData?.id || componentData?.component?.id || '';
      let componentName = componentData?.name || componentData?.component?.name;

      return {
        inputs: [
          {
            eventType,
            eventId: body.id || `${eventType}-${componentId}-${Date.now()}`,
            componentId,
            componentName,
            raw: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rawData = ctx.input.raw as Record<string, any> | undefined;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          componentId: ctx.input.componentId,
          componentName: ctx.input.componentName,
          component: rawData?.data as Record<string, any> | undefined
        }
      };
    }
  })
  .build();
