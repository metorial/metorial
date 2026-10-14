import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scheduleJob = SlateTool.create(spec, {
  name: 'Schedule Job',
  key: 'schedule_job',
  description: `Create a scheduled booking (job activity) for a job and optionally assign a staff member. This creates a time-based entry on the schedule with start and end times. Use this to schedule work periods and allocate staff.`,
  instructions: [
    'Dates should be in YYYY-MM-DD HH:MM:SS format (24-hour, no AM/PM)',
    'To assign staff, provide both the staffUuid and the jobUuid'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobUuid: z.string().describe('UUID of the job to schedule'),
      staffUuid: z.string().optional().describe('UUID of the staff member to assign'),
      startDate: z.string().describe('Start date/time (YYYY-MM-DD HH:MM:SS)'),
      endDate: z.string().describe('End date/time (YYYY-MM-DD HH:MM:SS)')
    })
  )
  .output(
    z.object({
      activityUuid: z.string().describe('UUID of the created job activity'),
      allocationUuid: z
        .string()
        .optional()
        .describe('UUID of the staff allocation, if staff was assigned'),
      allocationError: z
        .string()
        .optional()
        .describe(
          'Details if the booking was created but the separate staff allocation failed'
        )
    })
  )
  .handleInvocation(async ctx => {
    let dates = [ctx.input.startDate, ctx.input.endDate];
    if (
      dates.some(date => !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) ||
      ctx.input.endDate <= ctx.input.startDate
    ) {
      throw createApiServiceError(
        'Provide startDate and endDate in YYYY-MM-DD HH:MM:SS format, with endDate after startDate.'
      );
    }
    let client = new Client(ctx.auth);

    let activityUuid = await client.createJobActivity({
      job_uuid: ctx.input.jobUuid,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      activity_was_scheduled: '1',
      activity_was_recorded: '0',
      ...(ctx.input.staffUuid ? { staff_uuid: ctx.input.staffUuid } : {})
    });

    let allocationUuid: string | undefined;
    let allocationError: string | undefined;
    if (ctx.input.staffUuid) {
      try {
        allocationUuid = await client.createJobAllocation({
          job_uuid: ctx.input.jobUuid,
          staff_uuid: ctx.input.staffUuid,
          allocation_date: ctx.input.startDate
        });
      } catch (error) {
        allocationError =
          error instanceof Error
            ? error.message
            : 'The staff allocation could not be confirmed.';
      }
    }

    return {
      output: { activityUuid, allocationUuid, allocationError },
      message: `Scheduled job **${ctx.input.jobUuid}** from ${ctx.input.startDate} to ${ctx.input.endDate}${ctx.input.staffUuid ? ` with staff ${ctx.input.staffUuid} on the booking` : ''}.${allocationError ? ' The separate staff allocation failed; the booking already exists. Check it before retrying.' : ''}`
    };
  })
  .build();
