import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workflowActionOutputSchema = z.object({
  workflowId: z.string().optional().describe('Workflow identifier'),
  workflowName: z.string().optional().describe('Workflow name'),
  actionType: z.string().optional().describe('Type of action triggered'),
  eventId: z.string().optional().describe('Related event ID'),
  triggeredAt: z.string().optional().describe('When the action was triggered'),
  actionPayload: z.record(z.string(), z.any()).optional().describe('Full action payload data')
});

export let workflowActionTrigger = SlateTrigger.create(spec, {
  name: 'Workflow Action Triggered',
  key: 'workflow_action',
  description:
    'Triggers when a workflow action is triggered in SavvyCal (e.g., sending emails, creating CRM records, automation hooks).'
})
  .input(
    z.object({
      webhookEventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Webhook payload ID'),
      occurredAt: z.string().describe('When the event occurred'),
      actionPayload: z.any().describe('Raw workflow action payload')
    })
  )
  .output(workflowActionOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({ url: ctx.input.webhookBaseUrl });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.type !== 'workflow.action.triggered') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookEventType: data.type,
            webhookEventId: data.id,
            occurredAt: data.occurred_at,
            actionPayload: data.payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.actionPayload;

      return {
        type: 'workflow.action.triggered',
        id: ctx.input.webhookEventId,
        output: {
          workflowId: p.workflow?.id ?? p.workflow_id,
          workflowName: p.workflow?.name,
          actionType: p.action_type ?? p.type,
          eventId: p.event?.id ?? p.event_id,
          triggeredAt: ctx.input.occurredAt,
          actionPayload: p
        }
      };
    }
  })
  .build();
