import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageAlert = SlateTool.create(spec, {
  name: 'Manage Alert',
  key: 'manage_alert',
  description: `Create, update, retrieve, list, or delete alerts on questions in Metabase.
Alerts trigger when specific conditions are met on a question's results — such as when results exist,
a time series crosses a goal line, or a progress bar reaches a goal.
Alerts can be delivered via email, Slack, or webhook.`,
  instructions: [
    'alertCondition "rows" triggers when the question returns any results.',
    'alertCondition "goal" triggers when a goal line is crossed (use alertAboveGoal to control direction).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'list_for_question', 'delete'])
        .describe('The action to perform'),
      alertId: z
        .number()
        .optional()
        .describe('ID of the alert (required for get, update, delete)'),
      cardId: z
        .number()
        .optional()
        .describe('ID of the question/card (required for create and list_for_question)'),
      alertCondition: z
        .enum(['rows', 'goal'])
        .optional()
        .describe('Condition that triggers the alert'),
      alertFirstOnly: z
        .boolean()
        .optional()
        .describe('Only trigger the alert the first time the condition is met'),
      alertAboveGoal: z
        .boolean()
        .optional()
        .describe('For goal alerts: true if alert triggers when above goal'),
      channels: z
        .array(z.any())
        .optional()
        .describe('Notification channels configuration (email, slack, webhook)'),
      archived: z.boolean().optional().describe('Set to true to archive the alert')
    })
  )
  .output(
    z.object({
      alertId: z.number().optional().describe('ID of the alert'),
      cardId: z.number().optional().describe('ID of the associated question/card'),
      alertCondition: z.string().optional().describe('Alert condition type'),
      creatorId: z.number().optional().describe('ID of the alert creator'),
      alerts: z
        .array(
          z.object({
            alertId: z.number().describe('Alert ID'),
            cardId: z.number().optional().describe('Card/Question ID'),
            alertCondition: z.string().describe('Alert condition'),
            creatorId: z.number().optional().describe('Creator user ID')
          })
        )
        .optional()
        .describe('List of alerts'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let alerts = await client.listAlerts();
      let items = (Array.isArray(alerts) ? alerts : []).map((a: any) => ({
        alertId: a.id,
        cardId: a.card?.id,
        alertCondition: a.alert_condition,
        creatorId: a.creator?.id ?? a.creator_id
      }));

      return {
        output: { alerts: items },
        message: `Found **${items.length}** alert(s)`
      };
    }

    if (ctx.input.action === 'list_for_question') {
      let alerts = await client.getAlertsForQuestion(ctx.input.cardId!);
      let items = (Array.isArray(alerts) ? alerts : []).map((a: any) => ({
        alertId: a.id,
        cardId: a.card?.id ?? ctx.input.cardId,
        alertCondition: a.alert_condition,
        creatorId: a.creator?.id ?? a.creator_id
      }));

      return {
        output: { alerts: items, cardId: ctx.input.cardId },
        message: `Found **${items.length}** alert(s) for question ${ctx.input.cardId}`
      };
    }

    if (ctx.input.action === 'get') {
      let alert = await client.getAlert(ctx.input.alertId!);
      return {
        output: {
          alertId: alert.id,
          cardId: alert.card?.id,
          alertCondition: alert.alert_condition,
          creatorId: alert.creator?.id ?? alert.creator_id
        },
        message: `Retrieved alert ${alert.id} (condition: ${alert.alert_condition})`
      };
    }

    if (ctx.input.action === 'create') {
      let alert = await client.createAlert({
        cardId: ctx.input.cardId!,
        alertCondition: ctx.input.alertCondition!,
        alertFirstOnly: ctx.input.alertFirstOnly,
        alertAboveGoal: ctx.input.alertAboveGoal,
        channels: ctx.input.channels || []
      });

      return {
        output: {
          alertId: alert.id,
          cardId: alert.card?.id ?? ctx.input.cardId,
          alertCondition: alert.alert_condition,
          creatorId: alert.creator?.id ?? alert.creator_id
        },
        message: `Created alert ${alert.id} on question ${ctx.input.cardId}`
      };
    }

    if (ctx.input.action === 'update') {
      let alert = await client.updateAlert(ctx.input.alertId!, {
        alertCondition: ctx.input.alertCondition,
        alertFirstOnly: ctx.input.alertFirstOnly,
        alertAboveGoal: ctx.input.alertAboveGoal,
        channels: ctx.input.channels,
        archived: ctx.input.archived
      });

      return {
        output: {
          alertId: alert.id,
          cardId: alert.card?.id,
          alertCondition: alert.alert_condition,
          creatorId: alert.creator?.id ?? alert.creator_id
        },
        message: `Updated alert ${alert.id}`
      };
    }

    // delete
    await client.deleteAlert(ctx.input.alertId!);
    return {
      output: { alertId: ctx.input.alertId, success: true },
      message: `Deleted alert ${ctx.input.alertId}`
    };
  })
  .build();
