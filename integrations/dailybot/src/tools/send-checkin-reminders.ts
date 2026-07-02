import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let sendCheckinReminders = SlateTool.create(spec, {
  name: 'Send Check-in Reminders',
  key: 'send_checkin_reminders',
  description: `Send manual reminders for a check-in to participants who haven't responded yet. Can target specific users by UUID or email, or send to all pending participants.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      checkinUuid: z.string().describe('UUID of the check-in to send reminders for'),
      usersUuids: z.array(z.string()).optional().describe('UUIDs of specific users to remind'),
      usersEmails: z
        .array(z.string())
        .optional()
        .describe('Emails of specific users to remind'),
      date: z.string().optional().describe('Date for the reminder (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether reminders were sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    await client.sendCheckinReminders(ctx.input.checkinUuid, {
      usersUuids: ctx.input.usersUuids,
      usersEmails: ctx.input.usersEmails,
      isReminderTriggeredByMe: true,
      date: ctx.input.date
    });

    return {
      output: { sent: true },
      message: `Reminders sent for check-in \`${ctx.input.checkinUuid}\`.`
    };
  })
  .build();
