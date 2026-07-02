import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

export let projectEventsTrigger = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when projects are created, updated, or removed in Linear.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove']).describe('The action that occurred'),
      webhookId: z.string().describe('Delivery ID from the webhook'),
      projectId: z.string().describe('Project ID'),
      projectData: z.any().describe('Full project data from webhook payload'),
      updatedFrom: z.any().optional().describe('Previous values for updated fields')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      name: z.string().nullable().describe('Project name'),
      description: z.string().nullable().describe('Project description'),
      url: z.string().nullable().describe('Project URL'),
      state: z
        .string()
        .nullable()
        .describe('Project state (planned, started, paused, completed, canceled)'),
      progress: z.number().nullable().describe('Completion progress (0-1)'),
      leadId: z.string().nullable().describe('Project lead user ID'),
      startDate: z.string().nullable().describe('Start date'),
      targetDate: z.string().nullable().describe('Target date'),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      previousValues: z.any().nullable().describe('Previous field values (on update)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resourceTypes: ['Project'],
        allPublicTeams: true
      });

      if (!result.success) {
        throw linearServiceError('Failed to register webhook');
      }

      return {
        registrationDetails: {
          webhookId: result.webhook.id,
          secret: result.webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('Linear-Delivery') || body.webhookId || '';
      let eventType = ctx.request.headers.get('Linear-Event') || '';

      if (eventType !== 'Project' && body.type !== 'Project') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: body.action,
            webhookId: deliveryId,
            projectId: body.data?.id || '',
            projectData: body.data,
            updatedFrom: body.updatedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.projectData || {};

      return {
        type: `project.${ctx.input.action}`,
        id: ctx.input.webhookId,
        output: {
          projectId: data.id || ctx.input.projectId,
          name: data.name || null,
          description: data.description || null,
          url: data.url || null,
          state: data.state || null,
          progress: data.progress ?? null,
          leadId: data.leadId || data.lead?.id || null,
          startDate: data.startDate || null,
          targetDate: data.targetDate || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          previousValues: ctx.input.updatedFrom || null
        }
      };
    }
  })
  .build();
