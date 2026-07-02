import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when a project is created or updated in Hub Planner.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The webhook event type (e.g. project.create, project.update)'),
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.string().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      status: z.string().optional().describe('Project status'),
      start: z.string().optional().describe('Project start date'),
      end: z.string().optional().describe('Project end date'),
      resources: z
        .array(z.string())
        .optional()
        .describe('Resource IDs assigned to the project'),
      projectManagers: z.array(z.string()).optional().describe('Project manager IDs'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      status: z.string().optional().describe('Project status'),
      start: z.string().optional().describe('Start date'),
      end: z.string().optional().describe('End date'),
      resources: z.array(z.string()).optional().describe('Resource IDs'),
      projectManagers: z.array(z.string()).optional().describe('Project manager IDs'),
      metadata: z.string().optional().describe('Custom metadata')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let events = ['project.create', 'project.update'];
      let registrations: Array<{ subscriptionId: string; event: string }> = [];

      for (let event of events) {
        let result = await client.createWebhook({
          event,
          target_url: ctx.input.webhookBaseUrl
        });
        registrations.push({ subscriptionId: result._id, event });
      }

      return { registrationDetails: { subscriptions: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions = ctx.input.registrationDetails?.subscriptions || [];
      for (let sub of subscriptions) {
        await client.deleteWebhook(sub.subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.event || '';
      let projectId = data._id || data.projectId || '';
      let eventId = `${eventType}-${projectId}-${data.updatedDate || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            projectId,
            name: data.name,
            status: data.status,
            start: data.start,
            end: data.end,
            resources: data.resources,
            projectManagers: data.projectManagers,
            metadata: data.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          projectId: ctx.input.projectId,
          name: ctx.input.name,
          status: ctx.input.status,
          start: ctx.input.start,
          end: ctx.input.end,
          resources: ctx.input.resources,
          projectManagers: ctx.input.projectManagers,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
