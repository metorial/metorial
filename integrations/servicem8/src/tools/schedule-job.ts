import { SlateTool } from 'slates';
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
        .describe('UUID of the staff allocation, if staff was assigned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let activityUuid = await client.createJobActivity({
      job_uuid: ctx.input.jobUuid,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      ...(ctx.input.staffUuid ? { staff_uuid: ctx.input.staffUuid } : {})
    });

    let allocationUuid: string | undefined;
    if (ctx.input.staffUuid) {
      try {
        allocationUuid = await client.createJobAllocation({
          job_uuid: ctx.input.jobUuid,
          staff_uuid: ctx.input.staffUuid
        });
      } catch {
        // Allocation might already exist or not be supported for this context
      }
    }

    return {
      output: { activityUuid, allocationUuid },
      message: `Scheduled job **${ctx.input.jobUuid}** from ${ctx.input.startDate} to ${ctx.input.endDate}${ctx.input.staffUuid ? ` and assigned staff ${ctx.input.staffUuid}` : ''}.`
    };
  })
  .build();
