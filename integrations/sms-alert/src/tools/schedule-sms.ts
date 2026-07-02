import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let scheduleSms = SlateTool.create(spec, {
  name: 'Schedule SMS',
  key: 'schedule_sms',
  description: `Schedule an SMS for future delivery, edit the scheduled time of an existing scheduled SMS, or cancel a scheduled SMS.
Use the **action** field to choose between scheduling a new message, editing an existing schedule, or cancelling one. Cancelled scheduled messages have their credits refunded.`,
  instructions: [
    'Schedule datetime must be in YYYY-MM-DD HH:MM:SS format.',
    'To edit or cancel, you need the schedule ID from the original scheduling response.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['schedule', 'edit', 'cancel'])
        .describe(
          'Action to perform: "schedule" a new SMS, "edit" an existing schedule, or "cancel" a scheduled SMS.'
        ),
      senderId: z
        .string()
        .optional()
        .describe(
          'Sender ID (required when action is "schedule"). Falls back to configured default.'
        ),
      mobileNumbers: z
        .string()
        .optional()
        .describe(
          'Recipient mobile number(s), comma-separated (required when action is "schedule").'
        ),
      message: z
        .string()
        .optional()
        .describe('SMS message text (required when action is "schedule").'),
      scheduleTime: z
        .string()
        .optional()
        .describe(
          'Scheduled delivery time in YYYY-MM-DD HH:MM:SS format (required for "schedule" and "edit").'
        ),
      scheduleId: z
        .string()
        .optional()
        .describe(
          'Schedule ID of an existing scheduled SMS (required for "edit" and "cancel").'
        ),
      route: z
        .string()
        .optional()
        .describe(
          'SMS route (e.g., "transactional", "promotional"). Only used when action is "schedule".'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Detailed response from SMS Alert API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.action === 'schedule') {
      let senderId = ctx.input.senderId || ctx.config.senderId;
      if (!senderId) throw new Error('Sender ID is required for scheduling.');
      if (!ctx.input.mobileNumbers)
        throw new Error('Mobile numbers are required for scheduling.');
      if (!ctx.input.message) throw new Error('Message text is required for scheduling.');
      if (!ctx.input.scheduleTime)
        throw new Error('Schedule time is required for scheduling.');

      ctx.info(`Scheduling SMS for ${ctx.input.scheduleTime}`);
      result = await client.scheduleSms({
        sender: senderId,
        mobileNo: ctx.input.mobileNumbers,
        text: ctx.input.message,
        schedule: ctx.input.scheduleTime,
        route: ctx.input.route
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `SMS scheduled for **${ctx.input.scheduleTime}** to **${ctx.input.mobileNumbers}** with status: **${result.status || 'unknown'}**`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.scheduleId) throw new Error('Schedule ID is required for editing.');
      if (!ctx.input.scheduleTime)
        throw new Error('New schedule time is required for editing.');

      ctx.info(`Editing schedule ${ctx.input.scheduleId}`);
      result = await client.editSchedule({
        scheduledId: ctx.input.scheduleId,
        newSchedule: ctx.input.scheduleTime
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Schedule **${ctx.input.scheduleId}** updated to **${ctx.input.scheduleTime}**`
      };
    }

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.scheduleId) throw new Error('Schedule ID is required for cancellation.');

      ctx.info(`Cancelling schedule ${ctx.input.scheduleId}`);
      result = await client.cancelSchedule({
        scheduledId: ctx.input.scheduleId
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Schedule **${ctx.input.scheduleId}** cancelled. Credits will be refunded.`
      };
    }

    throw new Error(`Invalid action: ${ctx.input.action}`);
  })
  .build();
