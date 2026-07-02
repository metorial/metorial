import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description: 'Triggers on task events: created, updated, destroyed, or completed.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action (created, updated, destroyed, completed)'),
      resourceId: z.string().describe('ID of the affected task'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Task attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      state: z.string().optional(),
      taskType: z.string().optional(),
      action: z.string().optional(),
      subject: z.string().optional(),
      dueAt: z.string().optional(),
      completedAt: z.string().optional(),
      prospectId: z.string().optional(),
      ownerId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resource: 'task',
        action: '*'
      });
      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let data = body?.data;
      if (!data) return { inputs: [] };

      let meta = body?.meta ?? {};

      return {
        inputs: [
          {
            eventAction: meta.eventName?.split('.')?.[1] ?? 'unknown',
            resourceId: data.id?.toString() ?? '',
            resourceAttributes: data.attributes ?? {},
            relationships: data.relationships,
            timestamp: meta.deliveredAt ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.resourceAttributes as Record<string, any>;
      let rels = (ctx.input.relationships ?? {}) as Record<string, any>;

      return {
        type: `task.${ctx.input.eventAction}`,
        id: `task-${ctx.input.resourceId}-${ctx.input.eventAction}-${ctx.input.timestamp}`,
        output: {
          taskId: ctx.input.resourceId,
          state: attrs.state,
          taskType: attrs.taskType,
          action: attrs.action,
          subject: attrs.subject,
          dueAt: attrs.dueAt,
          completedAt: attrs.completedAt,
          prospectId: rels.prospect?.data?.id?.toString(),
          ownerId: rels.owner?.data?.id?.toString(),
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
