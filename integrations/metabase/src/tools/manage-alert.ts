import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

let alertOutput = (alert: any) => ({
  alertId: alert.id,
  cardId: alert.payload?.card_id ?? alert.card?.id,
  alertCondition: alert.payload?.send_condition ?? alert.alert_condition,
  sendCondition: alert.payload?.send_condition,
  creatorId: alert.creator_id ?? alert.creator?.id,
  active: alert.active,
  subscriptions: alert.subscriptions,
  handlers: alert.handlers
});

export let manageAlert = SlateTool.create(spec, {
  name: 'Manage Question Alert',
  key: 'manage_alert',
  description: `Create, update, retrieve, list, or archive scheduled alerts for saved questions.
Alerts use Metabase notification handlers for email, Slack, or HTTP delivery and Quartz cron schedules.`,
  instructions: [
    'Use sendCondition "has_result" when any result row should trigger delivery.',
    'Use "goal_above" or "goal_below" only for questions with a goal configured.',
    'A handler channelType is channel/email, channel/slack, or channel/http. Recipients use Metabase notification-recipient objects.',
    'Cron schedules use Quartz syntax, for example "0 0 8 * * ? *" for daily at 08:00.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'list_for_question', 'delete'])
        .describe('Operation to perform; delete archives the alert'),
      alertId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Alert ID for get, update, or delete'),
      cardId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Question ID for create or list_for_question'),
      sendCondition: z
        .enum(['has_result', 'goal_above', 'goal_below'])
        .optional()
        .describe('Current Metabase alert condition'),
      sendOnce: z
        .boolean()
        .optional()
        .describe('Deactivate after the first successful trigger'),
      handlers: z
        .array(z.any())
        .optional()
        .describe('Notification handlers with channel_type and recipients'),
      subscriptions: z
        .array(z.any())
        .optional()
        .describe('Schedule subscriptions containing cron_schedule'),
      cronSchedule: z
        .string()
        .optional()
        .describe('Convenience Quartz cron schedule used when subscriptions is omitted'),
      active: z.boolean().optional().describe('Whether the alert is active'),
      includeInactive: z.boolean().optional().describe('Include archived alerts when listing'),
      alertCondition: z
        .enum(['rows', 'goal'])
        .optional()
        .describe('Legacy condition alias; prefer sendCondition'),
      alertFirstOnly: z.boolean().optional().describe('Legacy alias for sendOnce'),
      alertAboveGoal: z
        .boolean()
        .optional()
        .describe('Direction for the legacy goal condition'),
      channels: z.array(z.any()).optional().describe('Legacy alias for handlers'),
      archived: z
        .boolean()
        .optional()
        .describe('Legacy update field; true sets active to false')
    })
  )
  .output(
    z.object({
      alertId: z.number().optional(),
      cardId: z.number().optional(),
      alertCondition: z.string().optional(),
      sendCondition: z.string().optional(),
      creatorId: z.number().optional(),
      active: z.boolean().optional(),
      subscriptions: z.array(z.any()).optional(),
      handlers: z.array(z.any()).optional(),
      alerts: z
        .array(
          z.object({
            alertId: z.number(),
            cardId: z.number().optional(),
            alertCondition: z.string().optional(),
            sendCondition: z.string().optional(),
            creatorId: z.number().optional(),
            active: z.boolean().optional(),
            subscriptions: z.array(z.any()).optional(),
            handlers: z.array(z.any()).optional()
          })
        )
        .optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ['get', 'update', 'delete'].includes(ctx.input.action) &&
      ctx.input.alertId === undefined
    ) {
      throw createApiServiceError(`${ctx.input.action} requires alertId.`, {
        reason: 'metabase_alert_id_missing'
      });
    }
    if (
      ['create', 'list_for_question'].includes(ctx.input.action) &&
      ctx.input.cardId === undefined
    ) {
      throw createApiServiceError(`${ctx.input.action} requires cardId.`, {
        reason: 'metabase_alert_card_id_missing'
      });
    }

    let client = new MetabaseClient(ctx.auth);

    if (ctx.input.action === 'list' || ctx.input.action === 'list_for_question') {
      let alerts = await client.listAlerts({
        cardId: ctx.input.action === 'list_for_question' ? ctx.input.cardId : undefined,
        includeInactive: ctx.input.includeInactive
      });
      let items = alerts.map(alertOutput);
      return {
        output: { alerts: items, cardId: ctx.input.cardId },
        message: `Found **${items.length}** question alert(s)`
      };
    }

    if (ctx.input.action === 'get') {
      let alert = await client.getAlert(ctx.input.alertId!);
      return { output: alertOutput(alert), message: `Retrieved alert ${alert.id}` };
    }

    if (ctx.input.action === 'create') {
      let sendCondition = ctx.input.sendCondition;
      if (!sendCondition && ctx.input.alertCondition === 'rows') sendCondition = 'has_result';
      if (!sendCondition && ctx.input.alertCondition === 'goal') {
        sendCondition = ctx.input.alertAboveGoal === false ? 'goal_below' : 'goal_above';
      }
      if (!sendCondition) {
        throw createApiServiceError('Creating an alert requires sendCondition.', {
          reason: 'metabase_alert_condition_missing'
        });
      }
      let handlers = ctx.input.handlers ?? ctx.input.channels;
      if (!handlers?.length) {
        throw createApiServiceError('Creating an alert requires at least one handler.', {
          reason: 'metabase_alert_handler_missing'
        });
      }
      let subscriptions = ctx.input.subscriptions ?? [
        { cron_schedule: ctx.input.cronSchedule ?? '0 0 8 * * ? *' }
      ];
      let alert = await client.createAlert({
        cardId: ctx.input.cardId!,
        sendCondition,
        sendOnce: ctx.input.sendOnce ?? ctx.input.alertFirstOnly,
        handlers,
        subscriptions
      });
      return { output: alertOutput(alert), message: `Created alert ${alert.id}` };
    }

    if (ctx.input.action === 'update') {
      let sendCondition = ctx.input.sendCondition;
      if (!sendCondition && ctx.input.alertCondition === 'rows') sendCondition = 'has_result';
      if (!sendCondition && ctx.input.alertCondition === 'goal') {
        sendCondition = ctx.input.alertAboveGoal === false ? 'goal_below' : 'goal_above';
      }
      let payload: Record<string, unknown> = {};
      if (sendCondition !== undefined) payload.send_condition = sendCondition;
      if (ctx.input.sendOnce !== undefined || ctx.input.alertFirstOnly !== undefined) {
        payload.send_once = ctx.input.sendOnce ?? ctx.input.alertFirstOnly;
      }
      let subscriptions = ctx.input.subscriptions;
      if (!subscriptions && ctx.input.cronSchedule) {
        subscriptions = [{ cron_schedule: ctx.input.cronSchedule }];
      }
      let alert = await client.updateAlert(ctx.input.alertId!, {
        payload: Object.keys(payload).length > 0 ? payload : undefined,
        handlers: ctx.input.handlers ?? ctx.input.channels,
        subscriptions,
        active: ctx.input.archived === true ? false : ctx.input.active
      });
      return { output: alertOutput(alert), message: `Updated alert ${alert.id}` };
    }

    let alert = await client.deleteAlert(ctx.input.alertId!);
    return {
      output: {
        ...alertOutput(alert),
        alertId: ctx.input.alertId,
        active: false,
        success: true
      },
      message: `Archived alert ${ctx.input.alertId}`
    };
  })
  .build();
