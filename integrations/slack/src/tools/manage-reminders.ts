import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError, userTokenRequiredError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let reminderSchema = z.object({
  reminderId: z.string().describe('Reminder ID'),
  text: z.string().optional().describe('Reminder text'),
  userId: z.string().optional().describe('User the reminder is for'),
  time: z.number().optional().describe('Unix timestamp when the reminder triggers'),
  recurring: z.boolean().optional().describe('Whether the reminder is recurring'),
  completedAt: z.number().optional().describe('Unix timestamp when the reminder was completed')
});

export let manageReminders = SlateTool.create(spec, {
  name: 'Manage Reminders',
  key: 'manage_reminders',
  description: `Create, complete, delete, or list Slack reminders. Reminders notify a user at a specified time with a custom message.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.reminders)
  .input(
    z.object({
      action: z
        .enum(['create', 'complete', 'delete', 'list'])
        .describe('Reminder action to perform'),
      reminderId: z.string().optional().describe('Reminder ID (for complete/delete actions)'),
      text: z.string().optional().describe('Reminder text (for create action)'),
      time: z
        .string()
        .optional()
        .describe(
          'When to trigger: Unix timestamp, natural language (e.g. "in 15 minutes"), or ISO datetime'
        ),
      userId: z
        .string()
        .optional()
        .describe('User to remind (defaults to the authenticated user)')
    })
  )
  .output(
    z.object({
      reminder: reminderSchema.optional().describe('Created/modified reminder'),
      reminders: z
        .array(reminderSchema)
        .optional()
        .describe('List of reminders (for list action)'),
      deleted: z.boolean().optional().describe('Whether the reminder was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let isUserToken =
      ctx.auth.actorType === 'user' || String(ctx.auth.token ?? '').startsWith('xoxp-');
    if (!isUserToken) {
      throw userTokenRequiredError(
        'Slack reminders require a user token. Use user_oauth or user_token.'
      );
    }

    let client = new SlackClient(ctx.auth.token);
    let { action } = ctx.input;

    let mapReminder = (r: any) => ({
      reminderId: r.id,
      text: r.text,
      userId: r.user,
      time: r.time,
      recurring: r.recurring,
      completedAt: r.complete_ts
    });

    if (action === 'create') {
      if (!ctx.input.text) throw missingRequiredFieldError('text', 'create action');
      if (!ctx.input.time) throw missingRequiredFieldError('time', 'create action');
      let reminder = await client.addReminder({
        text: ctx.input.text,
        time: ctx.input.time,
        user: ctx.input.userId
      });
      return {
        output: { reminder: mapReminder(reminder) },
        message: `Created reminder: "${ctx.input.text}".`
      };
    }

    if (action === 'complete') {
      if (!ctx.input.reminderId) {
        throw missingRequiredFieldError('reminderId', 'complete action');
      }
      await client.completeReminder(ctx.input.reminderId);
      return {
        output: { reminder: { reminderId: ctx.input.reminderId } },
        message: `Completed reminder \`${ctx.input.reminderId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.reminderId) {
        throw missingRequiredFieldError('reminderId', 'delete action');
      }
      await client.deleteReminder(ctx.input.reminderId);
      return {
        output: { deleted: true },
        message: `Deleted reminder \`${ctx.input.reminderId}\`.`
      };
    }

    let reminders = await client.listReminders();
    return {
      output: { reminders: reminders.map(mapReminder) },
      message: `Found ${reminders.length} reminder(s).`
    };
  })
  .build();
