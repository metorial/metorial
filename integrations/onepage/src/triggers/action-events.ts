import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { actionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let actionEvents = SlateTrigger.create(spec, {
  name: 'Action Events',
  key: 'action_events',
  description:
    'Triggered when an action is created, updated, deleted, completed, or reopened in OnePageCRM. Configure the webhook URL in OnePageCRM Apps settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of action event'),
      actionId: z.string().describe('ID of the affected action'),
      timestamp: z.string().describe('Timestamp of the event'),
      rawData: z.any().describe('Raw action data from the webhook payload')
    })
  )
  .output(actionSchema)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.type !== 'action') {
        return { inputs: [] };
      }

      let actionData = body.data ?? {};

      return {
        inputs: [
          {
            eventType: body.reason ?? 'unknown',
            actionId: actionData.id ?? '',
            timestamp: body.timestamp ?? new Date().toISOString(),
            rawData: actionData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let a = ctx.input.rawData;

      let output = {
        actionId: a.id ?? ctx.input.actionId,
        contactId: a.contact_id ?? '',
        assigneeId: a.assignee_id,
        text: a.text ?? '',
        date: a.date,
        exactTime: a.exact_time,
        status: a.status,
        done: a.done,
        createdAt: a.created_at,
        modifiedAt: a.modified_at
      };

      return {
        type: `action.${ctx.input.eventType}`,
        id: `action-${ctx.input.actionId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
