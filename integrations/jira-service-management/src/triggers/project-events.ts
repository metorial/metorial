import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when projects are created, updated, deleted, archived, or restored.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event type'),
      timestamp: z.number().optional().describe('Event timestamp'),
      projectId: z.string().describe('Project ID'),
      projectKey: z.string().describe('Project key'),
      projectName: z.string().optional().describe('Project name'),
      projectType: z.string().optional().describe('Project type'),
      leadAccountId: z.string().optional().describe('Project lead account ID'),
      leadName: z.string().optional().describe('Project lead display name')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectKey: z.string().describe('Project key'),
      projectName: z.string().optional().describe('Project name'),
      projectType: z.string().optional().describe('Project type'),
      leadAccountId: z.string().optional().describe('Project lead account ID'),
      leadName: z.string().optional().describe('Project lead display name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [
        'project_created',
        'project_updated',
        'project_deleted',
        'project_soft_deleted',
        'project_restored_deleted',
        'project_archived',
        'project_restored_archived'
      ]);

      let webhookIds = (result.webhookRegistrationResult || [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId
      });

      if (ctx.input.registrationDetails?.webhookIds?.length) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let project = data.project || {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent || 'project_updated',
            timestamp: data.timestamp,
            projectId: project.id || String(data.projectId || ''),
            projectKey: project.key || data.projectKey || '',
            projectName: project.name,
            projectType: project.projectTypeKey,
            leadAccountId: project.lead?.accountId,
            leadName: project.lead?.displayName
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'project.updated';
      let event = ctx.input.webhookEvent;
      if (event.includes('created')) eventType = 'project.created';
      else if (event === 'project_deleted' || event === 'project_soft_deleted')
        eventType = 'project.deleted';
      else if (event.includes('restored')) eventType = 'project.restored';
      else if (event.includes('archived')) eventType = 'project.archived';

      return {
        type: eventType,
        id: `${ctx.input.projectId}-${ctx.input.timestamp || Date.now()}`,
        output: {
          projectId: ctx.input.projectId,
          projectKey: ctx.input.projectKey,
          projectName: ctx.input.projectName,
          projectType: ctx.input.projectType,
          leadAccountId: ctx.input.leadAccountId,
          leadName: ctx.input.leadName
        }
      };
    }
  })
  .build();
