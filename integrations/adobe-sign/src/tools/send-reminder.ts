import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendReminder = SlateTool.create(spec, {
  name: 'Send Reminder',
  key: 'send_reminder',
  description: `Send a reminder to participants who have not yet completed their actions on an agreement. Reminders can be sent once or configured with a recurring frequency.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to send reminders for'),
      comment: z.string().optional().describe('Custom message to include in the reminder'),
      frequency: z
        .enum([
          'ONCE',
          'DAILY_UNTIL_SIGNED',
          'WEEKDAILY_UNTIL_SIGNED',
          'EVERY_OTHER_DAY_UNTIL_SIGNED',
          'EVERY_THIRD_DAY_UNTIL_SIGNED',
          'EVERY_FIFTH_DAY_UNTIL_SIGNED',
          'WEEKLY_UNTIL_SIGNED'
        ])
        .optional()
        .describe('Frequency of the reminder. Defaults to "ONCE".'),
      recipientParticipantIds: z
        .array(z.string())
        .optional()
        .describe(
          'Specific participant IDs to send reminders to. If omitted, sends to all pending participants.'
        ),
      firstReminderDelay: z
        .number()
        .optional()
        .describe('Hours to wait before sending the first reminder')
    })
  )
  .output(
    z.object({
      reminderId: z.string().describe('ID of the created reminder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.createReminder({
      agreementId: ctx.input.agreementId,
      comment: ctx.input.comment,
      frequency: ctx.input.frequency,
      recipientParticipantIds: ctx.input.recipientParticipantIds,
      firstReminderDelay: ctx.input.firstReminderDelay
    });

    return {
      output: { reminderId: result.id },
      message: `Reminder sent for agreement \`${ctx.input.agreementId}\` with frequency **${ctx.input.frequency || 'ONCE'}**.`
    };
  });
