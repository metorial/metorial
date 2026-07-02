import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let projectEventTypes = ['projects:created', 'projects:updated', 'projects:deleted'] as const;

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description: 'Triggers when projects are created, updated, or deleted in Timely.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().nullable().describe('Project name'),
      description: z.string().nullable().describe('Project description'),
      active: z.boolean().nullable().describe('Whether the project is active'),
      billable: z.boolean().nullable().describe('Whether the project is billable'),
      clientId: z.number().nullable().describe('Associated client ID'),
      clientName: z.string().nullable().describe('Associated client name'),
      hourRate: z.number().nullable().describe('Hourly rate'),
      budget: z.number().nullable().describe('Budget amount'),
      budgetType: z.string().nullable().describe('Budget type'),
      color: z.string().nullable().describe('Color hex code')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...projectEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(webhook.id) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event ?? data.event_type ?? 'projects:updated',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let project = payload.data ?? payload;

      let eventType = ctx.input.eventType;
      let typeMap: Record<string, string> = {
        'projects:created': 'project.created',
        'projects:updated': 'project.updated',
        'projects:deleted': 'project.deleted'
      };

      return {
        type: typeMap[eventType] ?? 'project.updated',
        id: `project-${project.id ?? 'unknown'}-${eventType}`,
        output: {
          projectId: project.id ?? 0,
          name: project.name ?? null,
          description: project.description ?? null,
          active: project.active ?? null,
          billable: project.billable ?? null,
          clientId: project.client?.id ?? project.client_id ?? null,
          clientName: project.client?.name ?? null,
          hourRate: project.hour_rate ?? null,
          budget: project.budget ?? null,
          budgetType: project.budget_type || null,
          color: project.color ?? null
        }
      };
    }
  })
  .build();
