import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectEventTypes = ['NEW_PROJECT', 'PROJECT_UPDATED', 'PROJECT_DELETED'] as const;

let eventTypeMap: Record<string, string> = {
  NEW_PROJECT: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted'
};

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggered when projects are created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      project: z.any().describe('Project data from webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      name: z.string().optional(),
      clientId: z.string().optional(),
      billable: z.boolean().optional(),
      archived: z.boolean().optional(),
      isPublic: z.boolean().optional(),
      color: z.string().optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of projectEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            project: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let project = ctx.input.project;
      let projectId = project.id || project.projectId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `project.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${projectId}_${project.changeDate || Date.now()}`,
        output: {
          projectId,
          name: project.name || undefined,
          clientId: project.clientId || undefined,
          billable: project.billable,
          archived: project.archived,
          isPublic: project.public,
          color: project.color || undefined,
          workspaceId: project.workspaceId || undefined
        }
      };
    }
  })
  .build();
