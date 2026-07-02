import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when a project is created, updated, or deleted in CentralStationCRM.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that triggered the event (create, update, destroy)'),
      projectId: z.number().describe('ID of the affected project'),
      projectName: z.string().optional().describe('Name of the project'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the project'),
      projectName: z.string().optional().describe('Name of the project'),
      description: z.string().optional().describe('Project description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let createHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/create`,
        object_type: 'Project',
        action: 'create'
      });

      let updateHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/update`,
        object_type: 'Project',
        action: 'update'
      });

      let deleteHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/destroy`,
        object_type: 'Project',
        action: 'destroy'
      });

      return {
        registrationDetails: {
          createHookId: (createHook?.hook ?? createHook)?.id,
          updateHookId: (updateHook?.hook ?? updateHook)?.id,
          deleteHookId: (deleteHook?.hook ?? deleteHook)?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let details = ctx.input.registrationDetails as Record<string, number>;
      if (details.createHookId) await client.deleteWebhook(details.createHookId);
      if (details.updateHookId) await client.deleteWebhook(details.updateHookId);
      if (details.deleteHookId) await client.deleteWebhook(details.deleteHookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let actionFromPath = pathParts[pathParts.length - 1] ?? 'unknown';

      let project = data?.project ?? data;

      return {
        inputs: [
          {
            eventAction: actionFromPath,
            projectId: project?.id ?? 0,
            projectName: project?.name,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let project = ctx.input.rawPayload?.project ?? ctx.input.rawPayload;

      return {
        type: `project.${ctx.input.eventAction === 'destroy' ? 'deleted' : ctx.input.eventAction === 'create' ? 'created' : 'updated'}`,
        id: `project_${ctx.input.projectId}_${ctx.input.eventAction}_${Date.now()}`,
        output: {
          projectId: ctx.input.projectId,
          projectName: project?.name ?? ctx.input.projectName,
          description: project?.description,
          createdAt: project?.created_at,
          updatedAt: project?.updated_at
        }
      };
    }
  })
  .build();
