import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleEntrySchema = z.object({
  days: z.array(z.string()).describe('Days of the week (e.g. ["mon", "tue", "wed"])'),
  paused: z
    .boolean()
    .optional()
    .describe('Whether the day is paused when supplied by the current API.'),
  times: z
    .array(z.string())
    .describe('Times of day in 24h format (e.g. ["09:00", "12:30", "17:00"])')
});

export let manageScheduleTool = SlateTool.create(spec, {
  name: 'Manage Posting Schedule',
  key: 'manage_schedule',
  description: `Read the posting schedule for a profile. Schedule changes use the retained legacy REST operation; the current API exposes schedule reading only. Changes may affect automatic publishing.`,
  tags: { readOnly: false },
  instructions: [
    'To view the current schedule, only provide `profileId`.',
    'To update the schedule, provide `profileId` and `schedules` array. Each entry specifies days and times.',
    'Days use short lowercase names: mon, tue, wed, thu, fri, sat, sun.',
    'Times use 24-hour format: "09:00", "13:30", "18:00".'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('Profile ID to view or update the schedule for'),
      schedules: z
        .array(scheduleEntrySchema)
        .optional()
        .describe('New schedules to set. If omitted, the current schedule is returned.')
    })
  )
  .output(
    z.object({
      schedules: z
        .array(scheduleEntrySchema)
        .describe('The current (or updated) posting schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.schedules) {
      await client.setProfileSchedules(ctx.input.profileId, ctx.input.schedules);
      let updated = await client.getProfileSchedules(ctx.input.profileId);
      return {
        output: { schedules: updated },
        message: `Updated posting schedule for profile **${ctx.input.profileId}** with **${ctx.input.schedules.length}** schedule(s).`
      };
    }

    let schedules = await client.getProfileSchedules(ctx.input.profileId);
    return {
      output: { schedules },
      message: `Retrieved **${schedules.length}** posting schedule(s) for profile **${ctx.input.profileId}**.`
    };
  })
  .build();
