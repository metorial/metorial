import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let scheduleAction = SlateTool.create(spec, {
  name: 'Schedule Action',
  key: 'schedule_action',
  description: `Schedule a future publish or unpublish action for an entry. Also supports listing and cancelling scheduled actions.`,
  instructions: [
    'The datetime must be an ISO 8601 timestamp in the future.',
    'The timezone defaults to UTC if not specified.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['schedule', 'list', 'cancel'])
        .describe('Whether to schedule a new action, list existing ones, or cancel one.'),
      entryId: z
        .string()
        .optional()
        .describe('Entry ID to schedule an action for. Required for "schedule".'),
      scheduledAction: z
        .enum(['publish', 'unpublish'])
        .optional()
        .describe('The action to schedule. Required for "schedule".'),
      datetime: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime for when the action should execute. Required for "schedule".'
        ),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the scheduled action (default: UTC).'),
      scheduledActionId: z
        .string()
        .optional()
        .describe('ID of the scheduled action to cancel. Required for "cancel".')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed.'),
      scheduledActionId: z.string().optional().describe('ID of the scheduled action.'),
      scheduledActions: z
        .array(
          z.object({
            scheduledActionId: z.string().describe('Scheduled action ID.'),
            entryId: z.string().optional().describe('Target entry ID.'),
            scheduledAction: z.string().optional().describe('Scheduled action type.'),
            datetime: z.string().optional().describe('Scheduled execution time.'),
            status: z.string().optional().describe('Current status.')
          })
        )
        .optional()
        .describe('List of scheduled actions (only for list action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    switch (ctx.input.action) {
      case 'schedule': {
        if (!ctx.input.entryId || !ctx.input.scheduledAction || !ctx.input.datetime) {
          throw new Error(
            'entryId, scheduledAction, and datetime are required for scheduling'
          );
        }
        let result = await client.createScheduledAction({
          entity: {
            sys: { type: 'Link', linkType: 'Entry', id: ctx.input.entryId }
          },
          environment: {
            sys: { type: 'Link', linkType: 'Environment', id: ctx.config.environmentId }
          },
          action: ctx.input.scheduledAction,
          scheduledFor: {
            datetime: ctx.input.datetime,
            timezone: ctx.input.timezone
          }
        });
        return {
          output: {
            action: 'schedule',
            scheduledActionId: result.sys?.id
          },
          message: `Scheduled **${ctx.input.scheduledAction}** for entry **${ctx.input.entryId}** at ${ctx.input.datetime}.`
        };
      }
      case 'list': {
        let result = await client.getScheduledActions();
        let actions = (result.items || []).map((a: any) => ({
          scheduledActionId: a.sys?.id,
          entryId: a.entity?.sys?.id,
          scheduledAction: a.action,
          datetime: a.scheduledFor?.datetime,
          status: a.sys?.status
        }));
        return {
          output: { action: 'list', scheduledActions: actions },
          message: `Found **${actions.length}** scheduled actions.`
        };
      }
      case 'cancel': {
        if (!ctx.input.scheduledActionId) {
          throw new Error('scheduledActionId is required for cancelling');
        }
        await client.cancelScheduledAction(ctx.input.scheduledActionId);
        return {
          output: { action: 'cancel', scheduledActionId: ctx.input.scheduledActionId },
          message: `Cancelled scheduled action **${ctx.input.scheduledActionId}**.`
        };
      }
    }
  })
  .build();
