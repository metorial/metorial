import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let issueEventsTrigger = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description: 'Triggered when issues are created, updated, or deleted in a Leiga project.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The type of event (e.g. Issue.Create, Issue.Update, Issue.Delete)'),
      eventTimestamp: z.number().describe('Event timestamp'),
      issueId: z.number().describe('The issue ID'),
      issueSummary: z.string().optional().describe('The issue summary'),
      issueData: z.any().describe('Full issue payload'),
      triggerUser: z.any().optional().describe('User who triggered the event'),
      tenantId: z.number().optional().describe('Tenant ID')
    })
  )
  .output(
    z.object({
      issueId: z.number().describe('Issue ID'),
      issueNumber: z.number().optional().describe('Issue number'),
      summary: z.string().optional().describe('Issue summary'),
      description: z.string().optional().describe('Issue description'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      typeName: z.string().optional().describe('Issue type name'),
      typeCode: z.string().optional().describe('Issue type code'),
      statusName: z.string().optional().describe('Status name'),
      statusCategory: z
        .string()
        .optional()
        .describe('Status category (e.g. Todo, In Progress, Done)'),
      createdByName: z.string().optional().describe('Creator name'),
      createdByEmail: z.string().optional().describe('Creator email'),
      updatedByName: z.string().optional().describe('Last updater name'),
      updatedByEmail: z.string().optional().describe('Last updater email'),
      triggeredByName: z.string().optional().describe('User who triggered the event'),
      triggeredByEmail: z
        .string()
        .optional()
        .describe('Email of user who triggered the event'),
      url: z.string().optional().describe('URL to the issue in Leiga'),
      createdAt: z.string().optional().describe('Issue creation timestamp'),
      updatedAt: z.string().optional().describe('Issue last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // We need a projectId for webhook registration - get all projects and register for each
      // For now, we register webhooks per project. The user must configure which project.
      // Since we don't have project-level config, we'll discover events and register
      let projects = await client.listProjects();
      let registrations: Array<{ projectId: number; webhookId: number }> = [];

      for (let project of projects.data || []) {
        let eventsResponse = await client.listWebhookEvents(project.id);
        let events = eventsResponse.data || [];

        let issueEventIds = events
          .filter((e: any) => e.typeCode === 'issue')
          .map((e: any) => e.eventId);

        if (issueEventIds.length === 0) continue;

        let webhookResponse = await client.createWebhook({
          name: `Slates - Issue Events (${project.pkey})`,
          state: 'enabled',
          type: 'ligaAI',
          projectId: project.id,
          eventIds: issueEventIds,
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

      let issue = data?.data?.issue;
      if (!issue) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.type || 'Issue.Unknown',
            eventTimestamp: data.date || Date.now(),
            issueId: issue.id,
            issueSummary: issue.summary,
            issueData: issue,
            triggerUser: data.trigger?.user,
            tenantId: data.tenant?.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let issue = ctx.input.issueData;
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        'Issue.Create': 'issue.created',
        'Issue.Update': 'issue.updated',
        'Issue.Delete': 'issue.deleted'
      };

      return {
        type: typeMap[eventType] || `issue.${eventType.toLowerCase().replace('issue.', '')}`,
        id: `${ctx.input.issueId}-${ctx.input.eventTimestamp}`,
        output: {
          issueId: issue.id,
          issueNumber: issue.number,
          summary: issue.summary,
          description: issue.description,
          projectId: issue.project?.id,
          projectName: issue.project?.name,
          typeName: issue.type?.name,
          typeCode: issue.type?.code,
          statusName: issue.status?.name,
          statusCategory: issue.status?.category?.name,
          createdByName: issue.createBy?.name,
          createdByEmail: issue.createBy?.email,
          updatedByName: issue.updateBy?.name,
          updatedByEmail: issue.updateBy?.email,
          triggeredByName: ctx.input.triggerUser?.name,
          triggeredByEmail: ctx.input.triggerUser?.email,
          url: issue.url,
          createdAt: issue.createTime ? String(issue.createTime) : undefined,
          updatedAt: issue.updateTime ? String(issue.updateTime) : undefined
        }
      };
    }
  })
  .build();
