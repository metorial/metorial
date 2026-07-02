import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when a project is created, updated, or removed in Everhour.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated', 'removed']).describe('Type of project event'),
      eventId: z.string().describe('Unique event identifier'),
      project: z.any().describe('Project data from the webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      type: z.string().optional().describe('Project type'),
      users: z.array(z.number()).optional().describe('Assigned user IDs'),
      billing: z.any().optional().describe('Billing configuration'),
      budget: z.any().optional().describe('Budget configuration')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EverhourClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        targetUrl: ctx.input.webhookBaseUrl,
        events: ['api:project:created', 'api:project:updated', 'api:project:removed']
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
        'api:project:created': 'created',
        'api:project:updated': 'updated',
        'api:project:removed': 'removed'
      };

      let eventType = eventMap[data.event] || 'updated';
      let project = data.payload?.project || data.payload || {};

      return {
        inputs: [
          {
            eventType: eventType as any,
            eventId: `project-${project.id || 'unknown'}-${data.event}-${Date.now()}`,
            project
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let project = ctx.input.project || {};
      return {
        type: `project.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          projectId: project.id || '',
          name: project.name,
          type: project.type,
          users: project.users,
          billing: project.billing,
          budget: project.budget
        }
      };
    }
  });
