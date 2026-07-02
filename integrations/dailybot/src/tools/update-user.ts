import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user's profile information including name, occupation, timezone, work schedule, time-off dates, and active status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userUuid: z.string().describe('UUID of the user to update'),
      fullName: z.string().optional().describe('New full name'),
      occupation: z.string().optional().describe('New occupation or job title'),
      timezone: z.string().optional().describe('New timezone (e.g., "America/New_York")'),
      workDays: z
        .array(z.number())
        .optional()
        .describe('Working days of the week (0=Sunday, 6=Saturday)'),
      workStartTime: z.string().optional().describe('Work start time (HH:MM format)'),
      timeOffDates: z
        .array(z.string())
        .optional()
        .describe('Dates when user is off (YYYY-MM-DD format)'),
      isActive: z.boolean().optional().describe('Whether the user should be active'),
      isBotEnabled: z.boolean().optional().describe('Whether the bot is enabled for this user')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the user was successfully updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.fullName !== undefined) body.full_name = ctx.input.fullName;
    if (ctx.input.occupation !== undefined) body.occupation = ctx.input.occupation;
    if (ctx.input.timezone !== undefined) body.timezone = ctx.input.timezone;
    if (ctx.input.workDays !== undefined) body.work_days = ctx.input.workDays;
    if (ctx.input.workStartTime !== undefined) body.work_start_time = ctx.input.workStartTime;
    if (ctx.input.timeOffDates !== undefined) body.time_off_dates = ctx.input.timeOffDates;
    if (ctx.input.isActive !== undefined) body.is_active = ctx.input.isActive;
    if (ctx.input.isBotEnabled !== undefined) body.is_bot_enabled = ctx.input.isBotEnabled;

    await client.updateUser(ctx.input.userUuid, body);

    return {
      output: { updated: true },
      message: `Updated user \`${ctx.input.userUuid}\`.`
    };
  })
  .build();
