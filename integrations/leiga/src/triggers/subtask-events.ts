import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subtaskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Subtask Events',
  key: 'subtask_events',
  description:
    'Triggered when subtasks are added, updated, or deleted on issues in a Leiga project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g. Subtask.Add, Subtask.Update, Subtask.Delete)'),
      eventTimestamp: z.number().describe('Event timestamp'),
      subtaskData: z.any().describe('Full subtask payload'),
      issueData: z.any().optional().describe('Parent issue data'),
      triggerUser: z.any().optional().describe('User who triggered the event'),
      tenantId: z.number().optional().describe('Tenant ID')
    })
  )
  .output(
    z.object({
      subtaskId: z.number().optional().describe('Subtask ID'),
      subtaskSummary: z.string().optional().describe('Subtask summary'),
      subtaskStatus: z.string().optional().describe('Subtask status'),
      assigneeName: z.string().optional().describe('Subtask assignee name'),
      issueId: z.number().optional().describe('Parent issue ID'),
      issueSummary: z.string().optional().describe('Parent issue summary'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
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

        let subtaskEventIds = events
          .filter((e: any) => e.typeCode === 'subtask')
          .map((e: any) => e.eventId);

        if (subtaskEventIds.length === 0) continue;

        let webhookResponse = await client.createWebhook({
          name: `Slates - Subtask Events (${project.pkey})`,
          state: 'enabled',
          type: 'ligaAI',
          projectId: project.id,
          eventIds: subtaskEventIds,
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
            eventType: data.type || 'Subtask.Unknown',
            eventTimestamp: data.date || Date.now(),
            subtaskData: data.data?.subtask || data.data,
            issueData: data.data?.issue,
            triggerUser: data.trigger?.user,
            tenantId: data.tenant?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let subtask = ctx.input.subtaskData;
      let issue = ctx.input.issueData;
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        'Subtask.Add': 'subtask.added',
        'Subtask.Update': 'subtask.updated',
        'Subtask.Delete': 'subtask.deleted'
      };

      return {
        type:
          typeMap[eventType] || `subtask.${eventType.toLowerCase().replace('subtask.', '')}`,
        id: `subtask-${subtask?.id || 'unknown'}-${ctx.input.eventTimestamp}`,
        output: {
          subtaskId: subtask?.id,
          subtaskSummary: subtask?.summary,
          subtaskStatus: subtask?.status?.name || subtask?.status,
          assigneeName: subtask?.assignee?.name,
          issueId: issue?.id,
          issueSummary: issue?.summary,
          projectId: issue?.project?.id,
          projectName: issue?.project?.name,
          triggeredByName: ctx.input.triggerUser?.name,
          triggeredByEmail: ctx.input.triggerUser?.email
        }
      };
    }
  })
  .build();
