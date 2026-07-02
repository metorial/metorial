import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listSchedules = SlateTool.create(spec, {
  name: 'List Schedules',
  key: 'list_schedules',
  description: `Retrieve all schedules configured for the authenticated user. Schedules define time blocks (e.g., "Work Hours") that control when Motion's auto-scheduling can place tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      schedules: z
        .array(
          z.object({
            name: z.string().describe('Name of the schedule'),
            isDefaultTimezone: z
              .boolean()
              .optional()
              .describe('Whether this uses the default timezone'),
            timezone: z.string().optional().describe('Timezone for the schedule'),
            schedule: z
              .any()
              .optional()
              .describe('Weekly schedule with day-by-day start/end times')
          })
        )
        .describe('List of schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let schedules = await client.listSchedules();
    let scheduleList = Array.isArray(schedules) ? schedules : [];

    return {
      output: {
        schedules: scheduleList.map((s: any) => ({
          name: s.name,
          isDefaultTimezone: s.isDefaultTimezone,
          timezone: s.timezone,
          schedule: s.schedule
        }))
      },
      message: `Found **${scheduleList.length}** schedule(s)`
    };
  })
  .build();
