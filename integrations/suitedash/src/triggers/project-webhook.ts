import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let projectWebhook = SlateTrigger.create(spec, {
  name: 'Project Webhook',
  key: 'project_webhook',
  description:
    'Triggers on project lifecycle events: created, updated, or deleted. Configure the webhook URL in SuiteDash under Integrations > Webhooks > Projects.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of project event'),
      projectId: z.string().describe('Unique identifier for the event'),
      payload: z.record(z.string(), z.unknown()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of project event (e.g. created, updated, deleted)'),
      projectId: z.string().describe('Project identifier'),
      payload: z.record(z.string(), z.unknown()).describe('Full project event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, unknown>;

      let eventType = (data.event as string) ?? (data.type as string) ?? 'unknown';
      let projectId =
        (data.project_id as string) ??
        (data.uid as string) ??
        (data.id as string) ??
        `project_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            projectId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `project.${ctx.input.eventType}`,
        id: ctx.input.projectId,
        output: {
          eventType: ctx.input.eventType,
          projectId: ctx.input.projectId,
          payload: ctx.input.payload
        }
      };
    }
  })
  .build();
