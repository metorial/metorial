import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'project_created',
  'project_updated',
  'project_deleted',
  'project_soft_deleted',
  'project_restored_deleted',
  'project_archived',
  'project_restored_archived'
] as const;

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggers when a project is created, updated, deleted, trashed, restored, archived, or unarchived.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      projectId: z.string().describe('The project ID.'),
      projectKey: z.string().describe('The project key.'),
      projectName: z.string().optional().describe('The project name.'),
      projectType: z.string().optional().describe('The project type key.'),
      leadAccountId: z.string().optional().describe('Project lead account ID.'),
      leadDisplayName: z.string().optional().describe('Project lead display name.')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('The project ID.'),
      projectKey: z.string().describe('The project key.'),
      projectName: z.string().optional().describe('The project name.'),
      projectType: z.string().optional().describe('The project type.'),
      leadAccountId: z.string().optional().describe('Project lead account ID.'),
      leadDisplayName: z.string().optional().describe('Project lead display name.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [...webhookEvents]);

      let webhookIds = (result.webhookRegistrationResult ?? [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let webhookIds = ctx.input.registrationDetails?.webhookIds ?? [];
      if (webhookIds.length > 0) {
        await client.deleteWebhook(webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let project = data.project ?? {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent ?? '',
            timestamp: data.timestamp,
            projectId: String(project.id ?? ''),
            projectKey: project.key ?? '',
            projectName: project.name,
            projectType: project.projectTypeKey,
            leadAccountId: project.lead?.accountId,
            leadDisplayName: project.lead?.displayName
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let typeMap: Record<string, string> = {
        project_created: 'project.created',
        project_updated: 'project.updated',
        project_deleted: 'project.deleted',
        project_soft_deleted: 'project.trashed',
        project_restored_deleted: 'project.restored',
        project_archived: 'project.archived',
        project_restored_archived: 'project.unarchived'
      };
      let eventType = typeMap[eventName] ?? 'project.updated';

      return {
        type: eventType,
        id: `project-${ctx.input.projectKey}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          projectId: ctx.input.projectId,
          projectKey: ctx.input.projectKey,
          projectName: ctx.input.projectName,
          projectType: ctx.input.projectType,
          leadAccountId: ctx.input.leadAccountId,
          leadDisplayName: ctx.input.leadDisplayName
        }
      };
    }
  })
  .build();
