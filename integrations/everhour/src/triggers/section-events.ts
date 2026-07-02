import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let sectionEvents = SlateTrigger.create(spec, {
  name: 'Section Events',
  key: 'section_events',
  description: 'Triggers when a section is created, updated, or removed in a project.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'removed']).describe('Type of section event'),
      eventId: z.string().describe('Unique event identifier'),
      section: z.any().describe('Section data from the webhook payload')
    })
  )
  .output(
    z.object({
      sectionId: z.number().describe('Section ID'),
      name: z.string().optional().describe('Section name'),
      projectId: z.string().optional().describe('Parent project ID'),
      position: z.number().optional().describe('Section position'),
      status: z.string().optional().describe('Section status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:section:created', 'api:section:updated', 'api:section:removed']
      });
      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let hookSecret = ctx.request.headers.get('X-Hook-Secret');
      if (hookSecret) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'X-Hook-Secret': hookSecret }
          })
        };
      }

      let data = (await ctx.request.json()) as any;
      let eventMap: Record<string, string> = {
        'api:section:created': 'created',
        'api:section:updated': 'updated',
        'api:section:removed': 'removed'
      };
      let eventType = eventMap[data.event] || 'updated';
      let section = data.payload?.section || data.payload || {};

      return {
        inputs: [
          {
            eventType: eventType as any,
            eventId: `section-${section.id || 'unknown'}-${data.event}-${Date.now()}`,
            section
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let section = ctx.input.section || {};
      return {
        type: `section.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          sectionId: section.id || 0,
          name: section.name,
          projectId: section.project,
          position: section.position,
          status: section.status
        }
      };
    }
  });
