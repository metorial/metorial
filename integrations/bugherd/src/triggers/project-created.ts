import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let projectCreated = SlateTrigger.create(spec, {
  name: 'Project Created',
  key: 'project_created',
  description: 'Fires when a new project is created in BugHerd.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      projectId: z.number().describe('Project ID'),
      name: z.string().describe('Project name'),
      devurl: z.string().describe('Website URL'),
      isActive: z.boolean().describe('Whether the project is active'),
      isPublic: z.boolean().describe('Whether public feedback is enabled')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().describe('Project name'),
      devurl: z.string().describe('Website URL'),
      isActive: z.boolean().describe('Whether the project is active'),
      isPublic: z.boolean().describe('Whether public feedback is enabled')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, 'project_create');

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let project = data.project ?? data;

      return {
        inputs: [
          {
            eventId: `project_created_${project.id}_${Date.now()}`,
            projectId: project.id,
            name: project.name ?? '',
            devurl: project.devurl ?? '',
            isActive: project.is_active ?? true,
            isPublic: project.is_public ?? false
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'project.created',
        id: ctx.input.eventId,
        output: {
          projectId: ctx.input.projectId,
          name: ctx.input.name,
          devurl: ctx.input.devurl,
          isActive: ctx.input.isActive,
          isPublic: ctx.input.isPublic
        }
      };
    }
  })
  .build();
