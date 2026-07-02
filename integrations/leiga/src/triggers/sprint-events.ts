import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sprintEventsTrigger = SlateTrigger.create(spec, {
  name: 'Sprint Events',
  key: 'sprint_events',
  description:
    'Triggered when sprints are created, started, completed, or deleted in a Leiga project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g. Sprint.Create, Sprint.Start, Sprint.Complete, Sprint.Delete)'
        ),
      eventTimestamp: z.number().describe('Event timestamp'),
      sprintData: z.any().describe('Full sprint payload'),
      triggerUser: z.any().optional().describe('User who triggered the event'),
      tenantId: z.number().optional().describe('Tenant ID')
    })
  )
  .output(
    z.object({
      sprintId: z.number().optional().describe('Sprint ID'),
      sprintName: z.string().optional().describe('Sprint name'),
      sprintGoal: z.string().optional().describe('Sprint goal'),
      startDate: z.string().optional().describe('Sprint start date'),
      endDate: z.string().optional().describe('Sprint end date'),
      status: z.string().optional().describe('Sprint status'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      assigneeName: z.string().optional().describe('Sprint assignee name'),
      triggeredByName: z.string().optional().describe('User who triggered the event'),
      triggeredByEmail: z.string().optional().describe('Email of user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let projects = await client.listProjects();
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let project of projects.data || []) {
        let eventsResponse = await client.listWebhookEvents(project.id);
        let events = eventsResponse.data || [];

        let sprintEventIds = events
          .filter((e: any) => e.typeCode === 'sprint')
          .map((e: any) => e.eventId);

        if (sprintEventIds.length === 0) continue;

        let webhookResponse = await client.createWebhook({
          name: `Slates - Sprint Events (${project.pkey})`,
          state: 'enabled',
          type: 'ligaAI',
          projectId: project.id,
          eventIds: sprintEventIds,
          url: ctx.input.webhookBaseUrl
        });

        if (webhookResponse.data?.webhookId) {
          registrations.push({
            projectId: project.id,
            webhookId: webhookResponse.data.webhookId
          });
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = (ctx.input.registrationDetails as any)?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type || 'Sprint.Unknown',
            eventTimestamp: data.date || Date.now(),
            sprintData: data.data?.sprint || data.data,
            triggerUser: data.trigger?.user,
            tenantId: data.tenant?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let sprint = ctx.input.sprintData;
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        'Sprint.Create': 'sprint.created',
        'Sprint.Start': 'sprint.started',
        'Sprint.Restart': 'sprint.restarted',
        'Sprint.Complete': 'sprint.completed',
        'Sprint.Delete': 'sprint.deleted'
      };

      return {
        type: typeMap[eventType] || `sprint.${eventType.toLowerCase().replace('sprint.', '')}`,
        id: `sprint-${sprint?.id || 'unknown'}-${ctx.input.eventTimestamp}`,
        output: {
          sprintId: sprint?.id,
          sprintName: sprint?.name,
          sprintGoal: sprint?.goal,
          startDate: sprint?.startDate ? String(sprint.startDate) : undefined,
          endDate: sprint?.endDate ? String(sprint.endDate) : undefined,
          status: sprint?.status,
          projectId: sprint?.project?.id,
          projectName: sprint?.project?.name,
          assigneeName: sprint?.assignee?.name,
          triggeredByName: ctx.input.triggerUser?.name,
          triggeredByEmail: ctx.input.triggerUser?.email
        }
      };
    }
  })
  .build();
