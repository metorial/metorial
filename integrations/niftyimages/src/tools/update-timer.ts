import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTimer = SlateTool.create(spec, {
  name: 'Update Timer Target Date',
  key: 'update_timer_target_date',
  description: `Update the target date of a NiftyImages countdown timer image. Countdown timers are dynamic images that count down to a particular event and update every time a user re-opens an email.
You can set an absolute target date, or use relative adjustments (addHours, addMinutes, addDays, addMonths) to shift the target date dynamically.
Requires a **Timer API Key** (found under the timer image > More Options > Target Date Automation > "Show API Key").`,
  instructions: [
    'The Timer API Key is separate from your account API Key. Find it by choosing a timer image, clicking "More Options", scrolling to "Target Date Automation" and clicking "Show API Key".',
    'Dates should be in ISO 8601 format (e.g., 2024-03-12T12:00Z) unless a custom format is specified.',
    'Use addHours, addMinutes, addDays, or addMonths to dynamically adjust the target date relative to the provided date.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timerApiKey: z
        .string()
        .describe(
          'The API Key for the timer image (found under timer image > More Options > Target Date Automation > "Show API Key").'
        ),
      timerImageUrl: z.string().describe('The URL of the countdown timer image to update.'),
      targetDate: z
        .string()
        .describe(
          'The new target date/time for the countdown timer (ISO 8601 format by default, e.g. 2024-12-25T00:00Z).'
        ),
      dateFormat: z
        .string()
        .optional()
        .describe('Custom date format if targetDate is not in ISO 8601 format.'),
      isUtc: z
        .boolean()
        .optional()
        .describe(
          'If true, NiftyImages will adjust the targetDate to the timezone configured when creating the timer. If false, no adjustment is made.'
        ),
      addHours: z.number().optional().describe('Number of hours to add to the target date.'),
      addMinutes: z
        .number()
        .optional()
        .describe('Number of minutes to add to the target date.'),
      addDays: z.number().optional().describe('Number of days to add to the target date.'),
      addMonths: z.number().optional().describe('Number of months to add to the target date.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the timer was updated successfully.'),
      result: z.any().optional().describe('The API response data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateTimerTargetDate({
      timerApiKey: ctx.input.timerApiKey,
      timerImageUrl: ctx.input.timerImageUrl,
      targetDate: ctx.input.targetDate,
      format: ctx.input.dateFormat,
      isUtc: ctx.input.isUtc,
      addHours: ctx.input.addHours,
      addMinutes: ctx.input.addMinutes,
      addDays: ctx.input.addDays,
      addMonths: ctx.input.addMonths
    });

    return {
      output: { success: true, result },
      message: `Successfully updated timer target date to **${ctx.input.targetDate}**.`
    };
  })
  .build();
